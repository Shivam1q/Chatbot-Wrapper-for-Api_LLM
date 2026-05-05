"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Trash,
  Check,
} from "lucide-react";
import type { Provider } from "@/types";
import {
  getAllKeys,
  setProviderApiKey,
  clearProviderApiKey,
} from "@/lib/keyStorage";
import { PROVIDER_LABELS } from "@/lib/providers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PROVIDERS: Provider[] = ["anthropic", "openai", "gemini"];

const PROVIDER_DOCS: Record<Provider, { url: string; label: string }> = {
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com" },
  openai: { url: "https://platform.openai.com/api-keys", label: "platform.openai.com" },
  gemini: { url: "https://aistudio.google.com/app/apikey", label: "aistudio.google.com" },
};

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        ok ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500/80"
      )}
      aria-hidden
    />
  );
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [draft, setDraft] = React.useState({
    anthropic: "",
    openai: "",
    gemini: "",
  });
  const [stored, setStored] = React.useState({
    anthropic: false,
    openai: false,
    gemini: false,
  });
  const [reveal, setReveal] = React.useState<Record<Provider, boolean>>({
    anthropic: false,
    openai: false,
    gemini: false,
  });
  const [savedFlash, setSavedFlash] = React.useState<Provider | null>(null);

  const refreshFromStorage = React.useCallback(() => {
    const k = getAllKeys();
    setDraft({
      anthropic: k.anthropic ?? "",
      openai: k.openai ?? "",
      gemini: k.gemini ?? "",
    });
    setStored({
      anthropic: Boolean(k.anthropic?.trim()),
      openai: Boolean(k.openai?.trim()),
      gemini: Boolean(k.gemini?.trim()),
    });
  }, []);

  React.useEffect(() => {
    if (open) refreshFromStorage();
  }, [open, refreshFromStorage]);

  function saveProvider(p: Provider) {
    const v = draft[p].trim();
    if (v) setProviderApiKey(p, v);
    else clearProviderApiKey(p);
    refreshFromStorage();
    setSavedFlash(p);
    setTimeout(() => setSavedFlash((c) => (c === p ? null : c)), 1200);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            API keys
          </DialogTitle>
          <DialogDescription className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            <span>
              Stored only in your browser. Sent with each request and never
              persisted on this server.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          {PROVIDERS.map((p) => {
            const has = stored[p];
            const docs = PROVIDER_DOCS[p];
            const flashed = savedFlash === p;
            return (
              <div
                key={p}
                className="rounded-lg border border-border bg-card/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={has} />
                    <label
                      htmlFor={`key-${p}`}
                      className="text-sm font-medium"
                    >
                      {PROVIDER_LABELS[p]}
                    </label>
                  </div>
                  <a
                    href={docs.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Get key <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      id={`key-${p}`}
                      type={reveal[p] ? "text" : "password"}
                      autoComplete="off"
                      placeholder={`${PROVIDER_LABELS[p]} API key`}
                      value={draft[p]}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [p]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveProvider(p);
                        }
                      }}
                      className="h-9 pr-8 font-mono text-xs"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={reveal[p] ? "Hide key" : "Show key"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setReveal((r) => ({ ...r, [p]: !r[p] }))
                      }
                    >
                      {reveal[p] ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Clear key"
                    aria-label="Clear key"
                    disabled={!has && !draft[p]}
                    onClick={() => {
                      clearProviderApiKey(p);
                      setDraft((d) => ({ ...d, [p]: "" }));
                      refreshFromStorage();
                    }}
                  >
                    <Trash className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 min-w-[64px] gap-1"
                    onClick={() => saveProvider(p)}
                  >
                    {flashed ? (
                      <>
                        <Check className="size-3.5" />
                        Saved
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
