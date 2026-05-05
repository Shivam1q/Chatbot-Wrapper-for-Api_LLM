import type { Provider } from "@/types";

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

/**
 * UI model ids shown in selectors.
 * These are kept in sync with each provider's currently-supported chat models.
 * Order: newest / most capable first.
 */
export const MODELS_BY_PROVIDER: Record<Provider, string[]> = {
  anthropic: [
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
  ],
  openai: [
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-4o",
    "gpt-4o-mini",
  ],
  gemini: [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ],
};

/**
 * Map UI model id to provider API model id when the API requires a different
 * (e.g. dated snapshot) string than the UI label. Most current models accept
 * the alias directly so this is mostly empty.
 */
export const API_MODEL_ALIASES: Partial<
  Record<Provider, Record<string, string>>
> = {
  anthropic: {
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  },
};

export function resolveApiModelId(provider: Provider, model: string): string {
  const map = API_MODEL_ALIASES[provider];
  return map?.[model] ?? model;
}

export function defaultModelForProvider(provider: Provider): string {
  return MODELS_BY_PROVIDER[provider][0];
}
