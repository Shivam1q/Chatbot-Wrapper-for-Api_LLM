"use client";

import { v4 as uuidv4 } from "uuid";
import type { ChatSession, Message, StoredChatSession, StoredMessage } from "@/types";
import { defaultModelForProvider } from "@/lib/providers";

const STORAGE_KEY = "ai-chat-wrapper-sessions";

function fromStored(s: StoredChatSession): ChatSession {
  return {
    ...s,
    createdAt: new Date(s.createdAt),
    messages: s.messages.map(fromStoredMessage),
  };
}

function fromStoredMessage(m: StoredMessage): Message {
  return {
    ...m,
    createdAt: new Date(m.createdAt),
  };
}

function toStored(session: ChatSession): StoredChatSession {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    messages: session.messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

function readRaw(): StoredChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredChatSession[];
  } catch {
    return [];
  }
}

function writeRaw(sessions: StoredChatSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function listSessions(): ChatSession[] {
  return readRaw()
    .map(fromStored)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function searchSessions(query: string): ChatSession[] {
  const q = query.trim().toLowerCase();
  if (!q) return listSessions();
  return listSessions().filter((s) => s.title.toLowerCase().includes(q));
}

export function getSession(id: string): ChatSession | undefined {
  const raw = readRaw().find((s) => s.id === id);
  return raw ? fromStored(raw) : undefined;
}

export function saveSession(session: ChatSession): void {
  const all = readRaw();
  const i = all.findIndex((s) => s.id === session.id);
  const stored = toStored(session);
  if (i >= 0) all[i] = stored;
  else all.unshift(stored);
  writeRaw(all);
}

export function deleteSession(id: string): void {
  writeRaw(readRaw().filter((s) => s.id !== id));
}

export function createNewSession(initial?: Partial<ChatSession>): ChatSession {
  const provider = initial?.provider ?? "anthropic";
  const session: ChatSession = {
    id: uuidv4(),
    title: initial?.title ?? "New chat",
    messages: initial?.messages ?? [],
    provider,
    model: initial?.model ?? defaultModelForProvider(provider),
    contextId: initial?.contextId,
    systemPrompt: initial?.systemPrompt,
    createdAt: new Date(),
  };
  saveSession(session);
  return session;
}
