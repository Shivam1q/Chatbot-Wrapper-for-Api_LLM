"use client";

import type { Provider, ProviderKeys } from "@/types";

const STORAGE_KEY = "ai-chat-wrapper-keys";

function readAll(): ProviderKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProviderKeys;
  } catch {
    return {};
  }
}

function writeAll(keys: ProviderKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getProviderApiKey(provider: Provider): string | undefined {
  const all = readAll();
  return all[provider]?.trim() || undefined;
}

export function setProviderApiKey(provider: Provider, key: string): void {
  const all = readAll();
  all[provider] = key.trim();
  writeAll(all);
}

export function clearProviderApiKey(provider: Provider): void {
  const all = readAll();
  delete all[provider];
  writeAll(all);
}

export function hasProviderApiKey(provider: Provider): boolean {
  return Boolean(getProviderApiKey(provider));
}

export function getAllKeys(): ProviderKeys {
  return readAll();
}
