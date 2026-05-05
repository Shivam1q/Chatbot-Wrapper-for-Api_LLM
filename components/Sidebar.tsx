"use client";

import * as React from "react";
import {
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeft,
  Search,
  Trash2,
  X,
  MessagesSquare,
} from "lucide-react";
import type { ChatSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  search,
  onSearchChange,
  mobileOpen,
  onMobileOpenChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, search]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onMobileOpenChange(false)}
      />

      <aside
        className={cn(
          "z-50 flex h-dvh shrink-0 flex-col border-r border-border bg-card text-card-foreground",
          "fixed left-0 top-0 transition-[transform,width] duration-200 ease-out md:relative md:z-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[60px]" : "w-[280px] md:w-[280px]"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 pt-2.5",
            collapsed && "md:flex-col md:px-1.5"
          )}
        >
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              title="New chat"
              onClick={onNewChat}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-9 flex-1 justify-start gap-2 rounded-lg"
              onClick={() => {
                onNewChat();
                onMobileOpenChange(false);
              }}
            >
              <MessageSquarePlus className="size-4" />
              New chat
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            title={collapsed ? "Expand" : "Collapse"}
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            title="Close sidebar"
            aria-label="Close sidebar"
            onClick={() => onMobileOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {!collapsed && (
          <div className="px-2 pb-2 pt-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search chats"
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>
        )}

        {!collapsed && <Separator />}

        <nav className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
          {collapsed ? (
            <div className="hidden flex-col items-center gap-1 px-1 pt-1 md:flex">
              <MessagesSquare className="size-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {sessions.length}
              </span>
            </div>
          ) : null}

          {!collapsed &&
            filtered.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "group relative flex items-stretch rounded-lg transition-colors",
                  s.id === activeSessionId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60"
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 flex-col px-2.5 py-2 text-left"
                  onClick={() => {
                    onSelectSession(s.id);
                    onMobileOpenChange(false);
                  }}
                >
                  <span className="truncate text-sm font-medium leading-tight">
                    {s.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                    <span className="capitalize">{s.provider}</span>
                    <span className="opacity-50">·</span>
                    <span>{formatRelative(s.createdAt)}</span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="my-auto mr-1 size-7 shrink-0 self-center rounded-md text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  title="Delete chat"
                  aria-label="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      typeof window !== "undefined" &&
                      window.confirm("Delete this chat permanently?")
                    ) {
                      onDeleteSession(s.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}

          {!collapsed && !filtered.length ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {sessions.length === 0
                ? "No chats yet."
                : "No chats match your search."}
            </p>
          ) : null}
        </nav>

        {!collapsed && (
          <div className="border-t border-border px-3 py-2 text-[10.5px] text-muted-foreground">
            Keys saved locally · never sent to any server but the provider.
          </div>
        )}
      </aside>
    </>
  );
}
