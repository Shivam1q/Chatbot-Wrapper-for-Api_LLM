import type { Provider } from "@/types";

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

/** UI model ids shown in selectors */
export const MODELS_BY_PROVIDER: Record<Provider, string[]> = {
  anthropic: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-3-5",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  gemini: [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ],
};

/**
 * Map UI model id to provider API model id when needed.
 * Adjust aliases if a provider rejects a model string.
 */
export const API_MODEL_ALIASES: Partial<
  Record<Provider, Record<string, string>>
> = {
  anthropic: {
    // UI labels stay stable; map to current Anthropic API model IDs (see platform docs).
    "claude-opus-4-5": "claude-opus-4-7",
    "claude-sonnet-4-5": "claude-sonnet-4-6",
    "claude-haiku-3-5": "claude-3-5-haiku-20241022",
  },
};

export function resolveApiModelId(provider: Provider, model: string): string {
  const map = API_MODEL_ALIASES[provider];
  return map?.[model] ?? model;
}

export function defaultModelForProvider(provider: Provider): string {
  return MODELS_BY_PROVIDER[provider][0];
}
