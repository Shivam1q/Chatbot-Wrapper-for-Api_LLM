"use client";

import * as React from "react";
import { Cpu, KeyRound, Plus } from "lucide-react";
import type { Provider } from "@/types";
import {
  MODELS_BY_PROVIDER,
  PROVIDER_LABELS,
  defaultModelForProvider,
} from "@/lib/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  provider: Provider;
  model: string;
  onProviderChange: (p: Provider) => void;
  onModelChange: (m: string) => void;
  hasKey: boolean;
  onOpenKeys?: () => void;
}

const PROVIDERS: Provider[] = ["anthropic", "openai", "gemini"];

export function ModelSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  hasKey,
  onOpenKeys,
}: ModelSelectorProps) {
  const models = MODELS_BY_PROVIDER[provider];
  const safeModel = models.includes(model)
    ? model
    : defaultModelForProvider(provider);

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors",
          hasKey
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.55)]"
            : "bg-red-500/80"
        )}
        title={hasKey ? "API key saved" : "API key missing"}
        aria-label={hasKey ? "API key saved" : "API key missing"}
      />

      <Select
        value={provider}
        onValueChange={(v) => {
          if (!v || v === provider) return;
          onProviderChange(v as Provider);
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-[112px] rounded-lg"
          aria-label="Provider"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((p) => (
            <SelectItem key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={safeModel}
        onValueChange={(v) => {
          if (!v || v === safeModel) return;
          onModelChange(v);
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-[160px] max-w-[240px] rounded-lg"
          aria-label="Model"
        >
          <Cpu className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m} value={m}>
              <span className="font-mono text-xs">{m}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!hasKey && onOpenKeys ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-lg border-amber-500/40 bg-amber-500/5 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
          onClick={onOpenKeys}
          title={`Add ${PROVIDER_LABELS[provider]} API key`}
        >
          <KeyRound className="size-3.5" />
          <span className="hidden sm:inline">Add key</span>
          <Plus className="size-3 sm:hidden" />
        </Button>
      ) : null}
    </div>
  );
}
