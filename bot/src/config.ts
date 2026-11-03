import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseModelList } from "./models.js";

loadEnv(resolve(dirname(fileURLToPath(import.meta.url)), "../.env"));

export const config = {
  mongoUri: env("MONGODB_URI"),
  geminiKey: env("GEMINI_API_KEY"),
  geminiModel: env("GEMINI_MODEL") || "gemini-3.8-flash",
  geminiModels: parseModelList(env("GEMINI_MODELS")),
  groqKey: env("GROQ_API_KEY"),
  groqModel: env("GROQ_MODEL") || "openai/gpt-oss-20b",
  groqModels: parseModelList(env("GROQ_MODELS")),
  publicUrl: (env("PUBLIC_VALIDATE_URL") || "https://gocrot-trans.vercel.app/validasi").replace(/\/$/, ""),
  port: Number(process.env.PORT || 3000),
};

export function mongoReady(): boolean {
  return Boolean(config.mongoUri);
}

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function loadEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
