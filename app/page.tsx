"use client";

import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Menu,
  Moon,
  Sun,
  BookOpen,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { Attachment, ChatSession, Message, Provider } from "@/types";
import {
  listSessions,
  saveSession,
  deleteSession,
  createNewSession,
} from "@/lib/chatStorage";
import { getContext } from "@/lib/contextStorage";
import {
  hasProviderApiKey,
  getProviderApiKey,
} from "@/lib/keyStorage";
import {
  streamChatCompletion,
  StreamAbortedError,
} from "@/lib/streamChat";
import { defaultModelForProvider } from "@/lib/providers";
import { ModelSelector } from "@/components/ModelSelector";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { InputBar } from "@/components/InputBar";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { ContextManager, ContextSwitcher } from "@/components/ContextManager";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function toApiMessages(msgs: Message[]) {
  return msgs.map((m) => ({
    role: m.role,
    content: m.content,
    attachments: m.attachments,
  }));
}

function deriveTitle(text: string, fallback: string) {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 60 ? trimmed.slice(0, 60).trim() + "…" : trimmed;
}

export default function HomePage() {
  const { setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [mobileSidebar, setMobileSidebar] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [apiKeyOpen, setApiKeyOpen] = React.useState(false);
  const [contextManagerOpen, setContextManagerOpen] = React.useState(false);
  const [contextPaletteOpen, setContextPaletteOpen] = React.useState(false);
  const [awaiting, setAwaiting] = React.useState(false);
  const [streamingMessageId, setStreamingMessageId] = React.useState<
    string | null
  >(null);
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);

  const sessionsRef = React.useRef(sessions);
  sessionsRef.current = sessions;
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const all = listSessions();
    if (all.length > 0) {
      setSessions(all);
      setActiveId(all[0].id);
    } else {
      const s = createNewSession();
      setSessions(listSessions());
      setActiveId(s.id);
    }
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const activeHasKey = activeSession
    ? hasProviderApiKey(activeSession.provider)
    : false;

  const replaceSession = React.useCallback(
    (id: string, fn: (s: ChatSession) => ChatSession, persist = true) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? fn(s) : s));
        if (persist) {
          const u = next.find((s) => s.id === id);
          if (u) saveSession(u);
        }
        return next;
      });
    },
    []
  );

  const contextLabel = React.useMemo(() => {
    if (!activeSession) return "No context";
    if (activeSession.contextId) {
      const c = getContext(activeSession.contextId);
      return c?.name ?? "Context";
    }
    if (activeSession.systemPrompt?.trim()) return "Custom prompt";
    return "No context";
  }, [activeSession]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setContextPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSelectSession(id: string) {
    setActiveId(id);
  }

  function handleNewChat() {
    // Bug fix: focus existing empty chat instead of stacking duplicates
    const cur = sessionsRef.current;
    const existingEmpty = cur.find((s) => s.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
      return;
    }
    const prev = cur.find((s) => s.id === activeId);
    const n = createNewSession({
      provider: prev?.provider,
      model: prev?.model,
    });
    setSessions(listSessions());
    setActiveId(n.id);
  }

  function handleDeleteSession(id: string) {
    deleteSession(id);
    const rest = listSessions();
    setSessions(rest);
    setActiveId((cur) => {
      if (cur !== id) return cur;
      if (rest[0]) return rest[0].id;
      const s = createNewSession();
      setSessions(listSessions());
      return s.id;
    });
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function removeMessageById(sessionId: string, msgId: string) {
    replaceSession(
      sessionId,
      (s) => ({ ...s, messages: s.messages.filter((m) => m.id !== msgId) }),
      true
    );
  }

  async function runCompletion(
    sessionId: string,
    historyForApi: Message[],
    asstId: string
  ) {
    const snap = sessionsRef.current.find((s) => s.id === sessionId);
    if (!snap) {
      removeMessageById(sessionId, asstId);
      return;
    }
    const apiKey = getProviderApiKey(snap.provider);
    if (!apiKey) {
      // Bug fix: clean the empty placeholder if we can't proceed
      removeMessageById(sessionId, asstId);
      setApiKeyOpen(true);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setAwaiting(true);
    setStreamingMessageId(asstId);

    try {
      await streamChatCompletion(
        {
          provider: snap.provider,
          model: snap.model,
          messages: toApiMessages(historyForApi),
          systemPrompt: snap.systemPrompt?.trim() || undefined,
          apiKey,
        },
        (chunk) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== sessionId) return s;
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === asstId
                    ? { ...m, content: m.content + chunk }
                    : m
                ),
              };
            })
          );
        },
        { signal: controller.signal }
      );
    } catch (e) {
      const aborted = e instanceof StreamAbortedError;
      const msg = aborted
        ? "Stopped"
        : e instanceof Error
          ? e.message
          : "Request failed";
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            messages: s.messages.map((m) => {
              if (m.id !== asstId) return m;
              if (aborted && m.content.length > 0) {
                return {
                  ...m,
                  content: m.content + "\n\n_(stopped)_",
                };
              }
              return {
                ...m,
                content:
                  m.content +
                  (m.content ? "\n\n" : "") +
                  (aborted ? "_(stopped before any response)_" : `**Error:** ${msg}`),
              };
            }),
          };
        })
      );
    } finally {
      abortRef.current = null;
      setAwaiting(false);
      setStreamingMessageId(null);
      setSessions((prev) => {
        const u = prev.find((s) => s.id === sessionId);
        if (u) saveSession(u);
        return prev;
      });
    }
  }

  async function handleSend(text: string, attachments: Attachment[]) {
    const cur = sessionsRef.current.find((s) => s.id === activeId);
    if (!cur) return;
    if (!hasProviderApiKey(cur.provider)) {
      setApiKeyOpen(true);
      return;
    }

    const sid = cur.id;
    const userContent = text || (attachments.length ? "(attachments)" : "");
    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: userContent,
      attachments: attachments.length ? attachments : undefined,
      createdAt: new Date(),
    };

    // Bug fix: only update title if it's still default
    const isDefaultTitle = cur.title === "New chat" || cur.messages.length === 0;
    const titleSeed =
      text || (attachments.length ? attachments[0].name : "");
    const title = isDefaultTitle
      ? deriveTitle(titleSeed, cur.title)
      : cur.title;

    const afterUser = [...cur.messages, userMsg];
    const asstId = uuidv4();
    const withAsst: Message[] = [
      ...afterUser,
      {
        id: asstId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      },
    ];
    replaceSession(sid, (s) => ({ ...s, messages: withAsst, title }), true);

    await runCompletion(sid, afterUser, asstId);
  }

  async function handleRegenerate() {
    const cur = sessionsRef.current.find((s) => s.id === activeId);
    if (!cur) return;
    const msgs = [...cur.messages];
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant") return;
    msgs.pop();

    const lastUserIdx = [...msgs]
      .map((m, i) => (m.role === "user" ? i : -1))
      .filter((i) => i >= 0)
      .pop();
    if (lastUserIdx === undefined) return;
    const historyForApi = msgs.slice(0, lastUserIdx + 1);

    const asstId = uuidv4();
    const withAsst: Message[] = [
      ...msgs,
      {
        id: asstId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      },
    ];
    replaceSession(cur.id, (s) => ({ ...s, messages: withAsst }), true);

    await runCompletion(cur.id, historyForApi, asstId);
  }

  const last = activeSession?.messages[activeSession.messages.length - 1];
  const canRegenerate = Boolean(
    activeSession &&
      last?.role === "assistant" &&
      !awaiting &&
      activeHasKey
  );

  // Bug fix: only diverge from active context when prompt actually differs
  function onSystemPromptChange(value: string) {
    if (!activeSession) return;
    const ctx = activeSession.contextId
      ? getContext(activeSession.contextId)
      : undefined;
    const sameAsContext = ctx ? value === ctx.systemPrompt : false;
    replaceSession(activeSession.id, (s) => ({
      ...s,
      systemPrompt: value,
      contextId: sameAsContext ? s.contextId : undefined,
    }));
  }

  if (!mounted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const hasSystemPrompt = Boolean(activeSession?.systemPrompt?.trim());

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        search={search}
        onSearchChange={setSearch}
        mobileOpen={mobileSidebar}
        onMobileOpenChange={setMobileSidebar}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-2 sm:px-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSidebar(true)}
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </Button>

            {activeSession ? (
              <ModelSelector
                provider={activeSession.provider}
                model={activeSession.model}
                hasKey={activeHasKey}
                onOpenKeys={() => setApiKeyOpen(true)}
                onProviderChange={(p: Provider) => {
                  replaceSession(activeSession.id, (s) => ({
                    ...s,
                    provider: p,
                    model: defaultModelForProvider(p),
                  }));
                }}
                onModelChange={(m) => {
                  replaceSession(activeSession.id, (s) => ({ ...s, model: m }));
                }}
              />
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 max-w-[180px] gap-1.5 truncate rounded-lg md:max-w-[220px]"
              title={`Context: ${contextLabel} (⌘K)`}
              onClick={() => setContextPaletteOpen(true)}
            >
              <BookOpen className="size-3.5 shrink-0" />
              <span className="truncate text-xs">{contextLabel}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1 rounded-lg text-xs",
                hasSystemPrompt && "text-foreground"
              )}
              onClick={() => setShowSystemPrompt((v) => !v)}
              title="Inline system prompt"
            >
              <Sparkles className="size-3.5" />
              <span className="hidden sm:inline">System</span>
              {showSystemPrompt ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </Button>

            <div className="flex flex-1 items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setContextManagerOpen(true)}
              >
                Contexts
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="API keys"
                aria-label="API keys"
                onClick={() => setApiKeyOpen(true)}
              >
                <Settings className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={
                  resolvedTheme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-label="Toggle theme"
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {activeSession && showSystemPrompt ? (
            <div className="border-t border-border/60 px-3 py-2">
              <Textarea
                value={activeSession.systemPrompt ?? ""}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                placeholder="Optional system instructions for this chat…"
                rows={2}
                className="min-h-[44px] resize-none text-sm"
              />
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                {hasSystemPrompt
                  ? "Active for the next message and beyond."
                  : "Leave empty for default behavior."}
              </p>
            </div>
          ) : null}
        </header>

        {activeSession ? (
          <>
            <ChatWindow
              messages={activeSession.messages}
              isAwaitingResponse={awaiting}
              streamingMessageId={streamingMessageId}
              onRegenerate={handleRegenerate}
              onStop={handleStop}
              canRegenerate={canRegenerate}
              emptyHint={
                !activeHasKey
                  ? `Add an API key for ${activeSession.provider} to begin.`
                  : undefined
              }
            />
            <InputBar
              onSend={handleSend}
              disabled={awaiting}
              busyLabel="Streaming"
              placeholder={
                activeHasKey
                  ? `Message ${activeSession.model}…`
                  : "Add an API key in Settings to begin"
              }
            />
          </>
        ) : null}

        <ApiKeyModal open={apiKeyOpen} onOpenChange={setApiKeyOpen} />
        <ContextManager
          open={contextManagerOpen}
          onOpenChange={setContextManagerOpen}
          onApplyToChat={(ctx) => {
            if (activeSession) {
              replaceSession(activeSession.id, (s) => ({
                ...s,
                contextId: ctx.id,
                systemPrompt: ctx.systemPrompt,
              }));
              setShowSystemPrompt(true);
            }
          }}
        />
        <ContextSwitcher
          open={contextPaletteOpen}
          onOpenChange={setContextPaletteOpen}
          activeContextId={activeSession?.contextId}
          onApply={(contextId) => {
            if (!activeSession) return;
            if (!contextId) {
              replaceSession(activeSession.id, (s) => ({
                ...s,
                contextId: undefined,
                systemPrompt: "",
              }));
              return;
            }
            const c = getContext(contextId);
            if (c) {
              replaceSession(activeSession.id, (s) => ({
                ...s,
                contextId: c.id,
                systemPrompt: c.systemPrompt,
              }));
              setShowSystemPrompt(true);
            }
          }}
        />
      </div>
    </div>
  );
}
