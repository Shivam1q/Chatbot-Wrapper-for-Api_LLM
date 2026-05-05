"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { Loader2, RefreshCw, Square, ArrowDown } from "lucide-react";
import type { Message } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MessageBubble = dynamic(
  () =>
    import("@/components/MessageBubble").then((m) => ({
      default: m.MessageBubble,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-16 items-center gap-2 rounded-2xl bg-muted px-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Rendering…
      </div>
    ),
  }
);

interface ChatWindowProps {
  messages: Message[];
  isAwaitingResponse: boolean;
  streamingMessageId: string | null;
  onRegenerate: () => void;
  onStop: () => void;
  canRegenerate: boolean;
  emptyHint?: React.ReactNode;
}

export function ChatWindow({
  messages,
  isAwaitingResponse,
  streamingMessageId,
  onRegenerate,
  onStop,
  canRegenerate,
  emptyHint,
}: ChatWindowProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const stickyBottomRef = React.useRef(true);

  const lastLen =
    messages.length > 0
      ? (messages[messages.length - 1]?.content?.length ?? 0)
      : 0;

  function checkAtBottom() {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    stickyBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkAtBottom();
    el.addEventListener("scroll", checkAtBottom, { passive: true });
    return () => el.removeEventListener("scroll", checkAtBottom);
  }, []);

  // Only auto-scroll if user was already near the bottom
  React.useEffect(() => {
    if (!stickyBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastLen, isAwaitingResponse]);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        ref={scrollRef}
        className="scrollbar-thin h-full w-full overflow-y-auto"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
          {messages.length === 0 && !isAwaitingResponse ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="size-12 rounded-2xl border border-border bg-gradient-to-br from-violet-500/10 to-sky-500/10" />
              <div>
                <p className="text-base font-medium">How can I help today?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {emptyHint ??
                    "Pick a model above, add an API key, then send a message."}
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isStreaming={
                m.role === "assistant" && m.id === streamingMessageId
              }
            />
          ))}

          {isAwaitingResponse && !streamingMessageId ? (
            <div className="flex items-center gap-2 pl-11 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Thinking…
            </div>
          ) : null}

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {!isAtBottom ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="pointer-events-auto h-8 gap-1 rounded-full border border-border/60 px-3 shadow-sm"
            onClick={scrollToBottom}
          >
            <ArrowDown className="size-3.5" />
            Latest
          </Button>
        </div>
      ) : null}

      {(isAwaitingResponse || canRegenerate) && messages.length > 0 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 flex justify-center",
            !isAtBottom ? "bottom-14" : "bottom-3"
          )}
        >
          {isAwaitingResponse ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pointer-events-auto h-8 gap-1 rounded-full border-border bg-background/95 px-3 shadow-sm backdrop-blur"
              onClick={onStop}
            >
              <Square className="size-3 fill-current" />
              Stop generating
            </Button>
          ) : canRegenerate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pointer-events-auto h-8 gap-1 rounded-full border-border bg-background/95 px-3 shadow-sm backdrop-blur"
              onClick={onRegenerate}
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
