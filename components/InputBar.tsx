"use client";

import * as React from "react";
import {
  Paperclip,
  SendHorizontal,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Attachment } from "@/types";
import { Button } from "@/components/ui/button";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import {
  processFiles,
  FileProcessError,
  MAX_ATTACHMENTS,
} from "@/lib/fileProcessor";
import { cn } from "@/lib/utils";

interface InputBarProps {
  onSend: (text: string, attachments: Attachment[]) => void | Promise<void>;
  disabled?: boolean;
  busyLabel?: string;
  placeholder?: string;
}

export function InputBar({
  onSend,
  disabled,
  busyLabel,
  placeholder = "Message…",
}: InputBarProps) {
  const [value, setValue] = React.useState("");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Manual auto-resize (Tailwind v3 lacks `field-sizing`)
  const resize = React.useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const max = 200;
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setProcessing(true);
    try {
      const next = await processFiles(files, attachments.length);
      setAttachments((a) => [...a, ...next].slice(0, MAX_ATTACHMENTS));
    } catch (e) {
      setError(
        e instanceof FileProcessError ? e.message : "Could not attach files."
      );
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    setValue("");
    setError(null);
    const toSend = [...attachments];
    setAttachments([]);
    await onSend(text, toSend);
  }

  const busy = Boolean(disabled);
  const canSend = !busy && (value.trim().length > 0 || attachments.length > 0);

  return (
    <div className="border-t border-border bg-background/80 px-3 pb-3 pt-2 backdrop-blur-md">
      <div className="mx-auto max-w-3xl">
        {error ? (
          <div className="mb-2 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <AttachmentPreview
          attachments={attachments}
          onRemove={(id) =>
            setAttachments((a) => a.filter((x) => x.id !== id))
          }
        />

        <div
          className={cn(
            "flex items-end gap-1.5 rounded-2xl border border-border bg-card p-2 shadow-sm transition-all",
            "focus-within:border-ring/60 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/20"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.txt,.md,.csv,.json,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 self-end rounded-xl"
            disabled={busy || processing || attachments.length >= MAX_ATTACHMENTS}
            title={
              attachments.length >= MAX_ATTACHMENTS
                ? `Maximum ${MAX_ATTACHMENTS} attachments`
                : "Attach files (max 5, 10MB each)"
            }
            onClick={() => fileRef.current?.click()}
          >
            {processing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
          </Button>

          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={busy}
            rows={1}
            spellCheck
            className={cn(
              "min-h-[24px] w-full resize-none bg-transparent px-1 py-2 text-[14.5px] leading-6 outline-none placeholder:text-muted-foreground",
              "scrollbar-thin disabled:opacity-60"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
          />

          <Button
            type="button"
            size="icon"
            className={cn(
              "shrink-0 self-end rounded-xl transition-transform",
              canSend && "scale-100",
              !canSend && "scale-95"
            )}
            disabled={!canSend}
            title={busy ? busyLabel || "Sending" : "Send (Enter)"}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>

        <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground/80">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          send ·{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            Shift+Enter
          </kbd>{" "}
          newline ·{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>{" "}
          context
        </p>
      </div>
    </div>
  );
}
