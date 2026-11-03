/** Text models that can return JSON. Audio, embedding, and transcription IDs are omitted. */
export const GEMINI_TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
  "gemini-robotics-er-2-preview",
] as const;

/** Chat models. Speech, prompt-guard, and Orpheus stay off this list. */
export const GROQ_CHAT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-safeguard-20b",
  "qwen/qwen3.8-27b",
] as const;

export function modelChain(preferred: string, defaults: readonly string[]): string[] {
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const model of [preferred, ...defaults]) {
    const id = model.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    chain.push(id);
  }
  return chain;
}

export function parseModelList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
