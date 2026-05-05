"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, FileText, Image as ImageIcon, Sparkles, User } from "lucide-react";
import { useTheme } from "next-themes";
import type { Message } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function CodeBlock({
  language,
  code,
  dark,
}: {
  language: string;
  code: string;
  dark: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="not-prose group/code relative my-2 overflow-hidden rounded-lg border border-border bg-[#1e1e1e] dark:bg-black/40">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[11px] opacity-0 transition-opacity group-hover/code:opacity-100"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <SyntaxHighlighter
        style={dark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "0.85rem 1rem",
          background: "transparent",
          fontSize: "0.82rem",
          lineHeight: "1.5",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              "var(--font-geist-mono, ui-monospace, SFMono-Regular, monospace)",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function AttachmentChip({
  name,
  type,
}: {
  name: string;
  type: string;
}) {
  const isImage = type.startsWith("image/");
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/40 bg-background/40 px-1.5 py-0.5 text-[11px]">
      {isImage ? (
        <ImageIcon className="size-3 shrink-0 opacity-70" />
      ) : (
        <FileText className="size-3 shrink-0 opacity-70" />
      )}
      <span className="truncate" title={name}>
        {name}
      </span>
    </span>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [copied, setCopied] = React.useState(false);

  const copyText = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [message.content]);

  return (
    <div
      className={cn(
        "group flex w-full animate-fade-up gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 select-none items-center justify-center rounded-full border text-xs font-medium",
          isUser
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-border bg-gradient-to-br from-violet-500/20 to-sky-500/20 text-foreground"
        )}
        aria-hidden
      >
        {isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}
      </div>

      <div
        className={cn(
          "flex min-w-0 max-w-[min(100%,720px)] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "min-w-0 rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.04]",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-card text-card-foreground"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div className="prose prose-sm prose-chat max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { children, className } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    const isBlock = Boolean(match);
                    if (isBlock) {
                      return (
                        <CodeBlock
                          language={match![1]}
                          code={codeString}
                          dark={dark}
                        />
                      );
                    }
                    return (
                      <code
                        className={cn(
                          "rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[0.85em]",
                          className
                        )}
                      >
                        {children}
                      </code>
                    );
                  },
                  a({ children, href }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline underline-offset-2 hover:text-primary"
                      >
                        {children}
                      </a>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="not-prose overflow-x-auto rounded-md border border-border my-2">
                        <table className="w-full text-sm">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="border-b border-border bg-muted/40 px-3 py-1.5 text-left font-medium">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="border-b border-border/60 px-3 py-1.5">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {message.content || (isStreaming ? "\u200b" : "")}
              </ReactMarkdown>
              {isStreaming ? (
                <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-[1px] animate-pulse rounded-sm bg-foreground/70 align-middle" />
              ) : null}
            </div>
          )}

          {message.attachments && message.attachments.length > 0 ? (
            <div className="not-prose mt-2 flex flex-wrap gap-1.5">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} name={a.name} type={a.type} />
              ))}
            </div>
          ) : null}
        </div>

        {!isUser && !isStreaming && message.content.length > 0 ? (
          <div className="flex items-center gap-1 px-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={copyText}
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
