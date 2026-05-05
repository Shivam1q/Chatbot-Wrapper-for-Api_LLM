import type { Attachment } from "@/types";

export interface StreamChatRequest {
  provider: string;
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    attachments?: Attachment[];
  }>;
  systemPrompt?: string;
  apiKey: string;
}

export interface StreamChatOptions {
  signal?: AbortSignal;
}

export class StreamAbortedError extends Error {
  constructor() {
    super("Stream aborted");
    this.name = "StreamAbortedError";
  }
}

export async function streamChatCompletion(
  body: StreamChatRequest,
  onDelta: (chunk: string) => void,
  options: StreamChatOptions = {}
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();

  const onAbort = () => {
    reader.cancel().catch(() => {});
  };
  options.signal?.addEventListener("abort", onAbort);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) onDelta(text);
    }
    // Flush trailing bytes
    const tail = decoder.decode();
    if (tail) onDelta(tail);
  } catch (e) {
    if (options.signal?.aborted) {
      throw new StreamAbortedError();
    }
    throw e;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
}
