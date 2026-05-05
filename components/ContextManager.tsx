"use client";

import * as React from "react";
import {
  LayoutGrid,
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Context } from "@/types";
import {
  listContexts,
  createContext,
  updateContext,
  deleteContext,
} from "@/lib/contextStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ContextSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (contextId: string | null) => void;
  activeContextId?: string;
}

/** Cmd/Ctrl+K palette — pick a context or clear. */
export function ContextSwitcher({
  open,
  onOpenChange,
  onApply,
  activeContextId,
}: ContextSwitcherProps) {
  const [contexts, setContexts] = React.useState<Context[]>([]);
  const [q, setQ] = React.useState("");
  const [selectedIdx, setSelectedIdx] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setContexts(listContexts());
      setQ("");
      setSelectedIdx(0);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contexts;
    return contexts.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.systemPrompt.toLowerCase().includes(s)
    );
  }, [contexts, q]);

  const items = React.useMemo(
    () => [{ id: null as string | null }, ...filtered.map((c) => ({ id: c.id }))],
    [filtered]
  );

  function commit(id: string | null) {
    onApply(id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Switch context</DialogTitle>
          <DialogDescription>Apply a saved system prompt</DialogDescription>
        </DialogHeader>
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            placeholder="Search contexts…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const it = items[selectedIdx];
                if (it) commit(it.id);
              }
            }}
            className="h-10 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="scrollbar-thin max-h-[55dvh] overflow-y-auto p-1">
          <button
            type="button"
            className={
              "flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors " +
              (selectedIdx === 0
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted/60")
            }
            onMouseEnter={() => setSelectedIdx(0)}
            onClick={() => commit(null)}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">No context</div>
              <div className="truncate text-xs text-muted-foreground">
                Clear saved system prompt for this chat
              </div>
            </div>
          </button>
          {filtered.length > 0 ? <Separator className="my-1" /> : null}
          {filtered.map((c, i) => {
            const idx = i + 1;
            const selected = selectedIdx === idx;
            return (
              <button
                key={c.id}
                type="button"
                className={
                  "flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors " +
                  (selected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60")
                }
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => commit(c.id)}
              >
                <BookmarkDot active={c.id === activeContextId} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{c.name}</span>
                    {c.id === activeContextId ? (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        active
                      </Badge>
                    ) : null}
                  </div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {c.systemPrompt || "(empty)"}
                  </div>
                </div>
              </button>
            );
          })}
          {!filtered.length ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {contexts.length === 0
                ? "No saved contexts yet."
                : "No contexts match."}
            </p>
          ) : null}
        </div>
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-[10.5px] text-muted-foreground">
          ↑/↓ to navigate · Enter to apply
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookmarkDot({ active }: { active: boolean }) {
  return (
    <span
      className={
        "mt-1.5 inline-block size-2 shrink-0 rounded-full " +
        (active ? "bg-emerald-500" : "bg-muted-foreground/40")
      }
      aria-hidden
    />
  );
}

interface ContextManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyToChat: (context: Context) => void;
}

export function ContextManager({
  open,
  onOpenChange,
  onApplyToChat,
}: ContextManagerProps) {
  const [items, setItems] = React.useState<Context[]>([]);
  const [editing, setEditing] = React.useState<Context | "new" | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formPrompt, setFormPrompt] = React.useState("");
  const [savedId, setSavedId] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setItems(listContexts());
  }, []);

  React.useEffect(() => {
    if (open) {
      refresh();
      setEditing(null);
    }
  }, [open, refresh]);

  function startNew() {
    setEditing("new");
    setFormName("");
    setFormPrompt("");
  }

  function startEdit(c: Context) {
    setEditing(c);
    setFormName(c.name);
    setFormPrompt(c.systemPrompt);
  }

  function saveForm() {
    if (editing === "new") {
      if (!formName.trim() && !formPrompt.trim()) {
        setEditing(null);
        return;
      }
      const c = createContext(formName, formPrompt);
      setSavedId(c.id);
    } else if (editing) {
      const updated = updateContext(editing.id, {
        name: formName,
        systemPrompt: formPrompt,
      });
      if (updated) setSavedId(updated.id);
    }
    setEditing(null);
    refresh();
    setTimeout(() => setSavedId(null), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Back to list"
                onClick={() => setEditing(null)}
              >
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <LayoutGrid className="size-4" />
            )}
            {editing
              ? editing === "new"
                ? "New context"
                : "Edit context"
              : "Contexts"}
          </DialogTitle>
          <DialogDescription>
            Saved system prompts you can apply to any chat.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="flex flex-1 flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Name
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Code reviewer"
                autoFocus
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                System prompt
              </label>
              <Textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                className="scrollbar-thin min-h-[200px] flex-1 resize-none font-mono text-[13px] leading-relaxed"
                placeholder="You are a meticulous senior engineer who reviews code…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveForm}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end pb-2">
              <Button
                type="button"
                size="sm"
                className="gap-1"
                onClick={startNew}
              >
                <Plus className="size-4" />
                New context
              </Button>
            </div>
            <div className="scrollbar-thin max-h-[55dvh] overflow-y-auto pr-1">
              <ul className="flex flex-col gap-2">
                {items.map((c) => (
                  <li
                    key={c.id}
                    className={
                      "rounded-lg border p-3 transition-colors " +
                      (savedId === c.id
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-border bg-card/40")
                    }
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {c.name}
                          {savedId === c.id ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : null}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {c.systemPrompt || "(empty)"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Edit"
                          aria-label="Edit context"
                          onClick={() => startEdit(c)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Delete"
                          aria-label="Delete context"
                          onClick={() => {
                            if (
                              typeof window !== "undefined" &&
                              window.confirm("Delete this context?")
                            ) {
                              deleteContext(c.id);
                              refresh();
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onApplyToChat(c);
                        onOpenChange(false);
                      }}
                    >
                      Apply to current chat
                    </Button>
                  </li>
                ))}
                {!items.length ? (
                  <li className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    No contexts yet. Create one to reuse system prompts.
                  </li>
                ) : null}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
