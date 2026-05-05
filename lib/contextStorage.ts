"use client";

import { v4 as uuidv4 } from "uuid";
import type { Context } from "@/types";

const STORAGE_KEY = "ai-chat-wrapper-contexts";

function readRaw(): Context[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      Omit<Context, "createdAt"> & { createdAt: string }
    >;
    return parsed.map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
    }));
  } catch {
    return [];
  }
}

function writeRaw(contexts: Context[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      contexts.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))
    )
  );
}

export function listContexts(): Context[] {
  return readRaw().sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export function getContext(id: string): Context | undefined {
  return readRaw().find((c) => c.id === id);
}

export function createContext(name: string, systemPrompt: string): Context {
  const ctx: Context = {
    id: uuidv4(),
    name: name.trim() || "Untitled",
    systemPrompt,
    createdAt: new Date(),
  };
  const all = readRaw();
  all.unshift(ctx);
  writeRaw(all);
  return ctx;
}

export function updateContext(
  id: string,
  patch: Partial<Pick<Context, "name" | "systemPrompt">>
): Context | undefined {
  const all = readRaw();
  const i = all.findIndex((c) => c.id === id);
  if (i < 0) return undefined;
  all[i] = {
    ...all[i],
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() || "Untitled" : all[i].name,
    systemPrompt:
      patch.systemPrompt !== undefined ? patch.systemPrompt : all[i].systemPrompt,
  };
  writeRaw(all);
  return all[i];
}

export function deleteContext(id: string): void {
  writeRaw(readRaw().filter((c) => c.id !== id));
}
