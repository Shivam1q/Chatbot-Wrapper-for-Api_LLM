import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider } from "@/types";
import type { Attachment } from "@/types";
import { resolveApiModelId } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Role = "user" | "assistant" | "system";

interface ChatMessagePayload {
  role: Role;
  content: string;
  attachments?: Attachment[];
}

interface ChatBody {
  provider: Provider;
  model: string;
  messages: ChatMessagePayload[];
  systemPrompt?: string;
  apiKey?: string;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; message?: string };
  return (
    err.name === "AbortError" ||
    err.name === "APIUserAbortError" ||
    /aborted/i.test(err.message ?? "")
  );
}

function appendTextAttachments(
  baseText: string,
  attachments?: Attachment[]
): string {
  if (!attachments?.length) return baseText;
  let text = baseText;
  for (const a of attachments) {
    if (a.type.startsWith("image/")) continue;
    text += `\n\n--- Attachment: ${a.name} ---\n${a.content}`;
  }
  return text;
}

function imageAttachments(attachments?: Attachment[]) {
  return (
    attachments?.filter((a) =>
      ["image/png", "image/jpeg", "image/webp"].includes(a.type)
    ) ?? []
  );
}

type AnthropicContentBlock =
  | Anthropic.TextBlockParam
  | Anthropic.ImageBlockParam;

function toAnthropicUserContent(
  content: string,
  attachments?: Attachment[]
): AnthropicContentBlock[] {
  const text = appendTextAttachments(content, attachments);
  const blocks: AnthropicContentBlock[] = [{ type: "text", text }];
  for (const img of imageAttachments(attachments)) {
    const media =
      img.type === "image/png"
        ? ("image/png" as const)
        : img.type === "image/webp"
          ? ("image/webp" as const)
          : ("image/jpeg" as const);
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: media, data: img.content },
    });
  }
  return blocks;
}

function toOpenAIUserContent(
  content: string,
  attachments?: Attachment[]
): OpenAI.Chat.ChatCompletionUserMessageParam["content"] {
  const text = appendTextAttachments(content, attachments);
  const imgs = imageAttachments(attachments);
  if (imgs.length === 0) return text;
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text },
  ];
  for (const img of imgs) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${img.type};base64,${img.content}`,
      },
    });
  }
  return parts;
}

function toGeminiParts(content: string, attachments?: Attachment[]) {
  const text = appendTextAttachments(content, attachments);
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text }];
  for (const img of imageAttachments(attachments)) {
    parts.push({
      inlineData: { mimeType: img.type, data: img.content },
    });
  }
  return parts;
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { provider, model, messages, systemPrompt } = body;
  const apiKey = body.apiKey?.trim();

  if (!provider || !["anthropic", "openai", "gemini"].includes(provider)) {
    return jsonError("Invalid or missing provider", 400);
  }
  if (!model) return jsonError("Missing model", 400);
  if (!apiKey) return jsonError("Missing API key", 401);
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError("messages must be a non-empty array", 400);
  }

  const apiModel = resolveApiModelId(provider, model);
  const enc = new TextEncoder();
  const upstream = new AbortController();
  // Cancel upstream when the browser disconnects.
  if (req.signal) {
    if (req.signal.aborted) upstream.abort();
    else req.signal.addEventListener("abort", () => upstream.abort(), {
      once: true,
    });
  }

  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey, maxRetries: 0 });
      const anthropicMessages: Anthropic.MessageParam[] = [];

      for (const m of messages) {
        if (m.role === "system") continue;
        if (m.role === "user") {
          anthropicMessages.push({
            role: "user",
            content: toAnthropicUserContent(m.content, m.attachments),
          });
        } else {
          anthropicMessages.push({
            role: "assistant",
            content: [{ type: "text", text: m.content }],
          });
        }
      }

      const stream = client.messages.stream(
        {
          model: apiModel,
          max_tokens: 8192,
          system: systemPrompt || undefined,
          messages: anthropicMessages,
        },
        { signal: upstream.signal }
      );

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(enc.encode(event.delta.text));
              }
            }
          } catch (e) {
            if (!isAbortError(e)) {
              const msg =
                e instanceof Error ? e.message : "Anthropic stream error";
              controller.enqueue(enc.encode(`\n\n[Error] ${msg}`));
            }
          } finally {
            controller.close();
          }
        },
        cancel() {
          upstream.abort();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    if (provider === "openai") {
      const client = new OpenAI({ apiKey, maxRetries: 0 });
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (systemPrompt) {
        openaiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        if (m.role === "system") {
          openaiMessages.push({ role: "system", content: m.content });
          continue;
        }
        if (m.role === "user") {
          openaiMessages.push({
            role: "user",
            content: toOpenAIUserContent(m.content, m.attachments),
          });
        } else {
          openaiMessages.push({ role: "assistant", content: m.content });
        }
      }

      const stream = await client.chat.completions.create(
        {
          model: apiModel,
          messages: openaiMessages,
          stream: true,
        },
        { signal: upstream.signal }
      );

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const piece = chunk.choices[0]?.delta?.content;
              if (piece) controller.enqueue(enc.encode(piece));
            }
          } catch (e) {
            if (!isAbortError(e)) {
              const msg =
                e instanceof Error ? e.message : "OpenAI stream error";
              controller.enqueue(enc.encode(`\n\n[Error] ${msg}`));
            }
          } finally {
            controller.close();
          }
        },
        cancel() {
          upstream.abort();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemParts: string[] = [];
    if (systemPrompt?.trim()) systemParts.push(systemPrompt.trim());
    for (const m of messages) {
      if (m.role === "system") systemParts.push(m.content);
    }
    const mergedSystem = systemParts.join("\n\n") || undefined;

    const modelWithSys = genAI.getGenerativeModel({
      model: apiModel,
      systemInstruction: mergedSystem,
    });

    type GeminiPart =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };

    const contents: Array<{
      role: "user" | "model";
      parts: GeminiPart[];
    }> = [];

    for (const m of messages) {
      if (m.role === "system") continue;
      if (m.role === "user") {
        contents.push({
          role: "user",
          parts: toGeminiParts(m.content, m.attachments) as GeminiPart[],
        });
      } else {
        contents.push({
          role: "model",
          parts: [{ text: m.content }],
        });
      }
    }

    if (contents.length === 0) {
      return jsonError("No messages for Gemini", 400);
    }

    const result = await modelWithSys.generateContentStream(
      { contents },
      { signal: upstream.signal }
    );

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const t = chunk.text();
            if (t) controller.enqueue(enc.encode(t));
          }
        } catch (e) {
          if (!isAbortError(e)) {
            const msg =
              e instanceof Error ? e.message : "Gemini stream error";
            controller.enqueue(enc.encode(`\n\n[Error] ${msg}`));
          }
        } finally {
          controller.close();
        }
      },
      cancel() {
        upstream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (isAbortError(e)) {
      return new Response("", { status: 499 });
    }
    const msg =
      e instanceof Error ? e.message : "Failed to start chat completion";
    return jsonError(msg, 500);
  }
}
