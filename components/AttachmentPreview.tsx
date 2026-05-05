"use client";

import { X, FileText, Image as ImageIcon, FileType2 } from "lucide-react";
import type { Attachment } from "@/types";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/fileProcessor";

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

function iconFor(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf") return FileType2;
  return FileText;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {attachments.map((a) => {
        const Icon = iconFor(a.type);
        return (
          <span
            key={a.id}
            className="group inline-flex max-w-[260px] items-center gap-1.5 rounded-lg border border-border bg-muted/40 py-1 pl-2 pr-1 text-xs"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate" title={a.name}>
              {a.name}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatFileSize(a.size)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-5 shrink-0 rounded-full"
              aria-label={`Remove ${a.name}`}
              onClick={() => onRemove(a.id)}
            >
              <X className="size-3" />
            </Button>
          </span>
        );
      })}
    </div>
  );
}
