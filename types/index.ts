export type Provider = "anthropic" | "openai" | "gemini";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Plain text, or base64 (no data: prefix) for images */
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  provider: Provider;
  model: string;
  contextId?: string;
  systemPrompt?: string;
  createdAt: Date;
}

export interface Context {
  id: string;
  name: string;
  systemPrompt: string;
  createdAt: Date;
}

export interface ProviderKeys {
  anthropic?: string;
  openai?: string;
  gemini?: string;
}

/** Serializable session for localStorage */
export interface StoredChatSession {
  id: string;
  title: string;
  messages: StoredMessage[];
  provider: Provider;
  model: string;
  contextId?: string;
  systemPrompt?: string;
  createdAt: string;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[];
  createdAt: string;
}
