"use client";

import * as React from "react";
import { Cpu, KeyRound, Plus, ChevronDown, Check } from "lucide-react";
import type { Provider } from "@/types";
import {
  MODELS_BY_PROVIDER,
  PROVIDER_LABELS,
  defaultModelForProvider,
} from "@/lib/providers";
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

interface DropdownProps<T extends string> {
  value: T;
  options: ReadonlyArray<{ value: T; label: React.ReactNode }>;
  onSelect: (value: T) => void;
  triggerClassName?: string;
  triggerLabel?: React.ReactNode;
  triggerIcon?: React.ReactNode;
  ariaLabel: string;
  align?: "start" | "end";
}

function Dropdown<T extends string>({
  value,
  options,
  onSelect,
  triggerClassName,
  triggerLabel,
  triggerIcon,
  ariaLabel,
  align = "start",
}: DropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50",
          triggerClassName
        )}
      >
        {triggerIcon}
        <span className="flex min-w-0 flex-1 items-center text-left">
          {triggerLabel ?? current?.label ?? value}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            "absolute z-50 mt-1 min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5",
            align === "end" ? "right-0" : "left-0"
          )}
          style={{
            ["--anchor-width" as string]: rootRef.current
              ? `${rootRef.current.offsetWidth}px`
              : undefined,
          }}
        >
          <ul className="flex max-h-[280px] flex-col overflow-y-auto scrollbar-thin">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 pr-7 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                      selected && "bg-accent/60 text-accent-foreground"
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {opt.label}
                    </span>
                    {selected ? (
                      <Check className="absolute right-2 size-3.5 text-foreground/80" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

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

  const providerOptions = React.useMemo(
    () =>
      PROVIDERS.map((p) => ({
        value: p,
        label: PROVIDER_LABELS[p],
      })),
    []
  );

  const modelOptions = React.useMemo(
    () =>
      models.map((m) => ({
        value: m,
        label: <span className="font-mono text-xs">{m}</span>,
      })),
    [models]
  );

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

      <Dropdown
        value={provider}
        options={providerOptions}
        onSelect={(p) => {
          if (p === provider) return;
          onProviderChange(p);
        }}
        triggerClassName="min-w-[112px]"
        ariaLabel="Provider"
      />

      <Dropdown
        value={safeModel}
        options={modelOptions}
        onSelect={(m) => {
          if (m === safeModel) return;
          onModelChange(m);
        }}
        triggerClassName="min-w-[160px] max-w-[240px]"
        triggerIcon={<Cpu className="size-3.5 text-muted-foreground" />}
        triggerLabel={<span className="truncate font-mono text-xs">{safeModel}</span>}
        ariaLabel="Model"
      />

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
