import { parseModelList } from "./models.js";

export const config = {
  endpoint: env("APPWRITE_ENDPOINT"),
  projectId: env("APPWRITE_PROJECT_ID"),
  apiKey: env("APPWRITE_API_KEY"),
  databaseId: env("APPWRITE_DATABASE_ID") || "main",
  bucketId: env("APPWRITE_BUCKET_ID") || "baileys-auth",
  geminiKey: env("GEMINI_API_KEY"),
  geminiModel: env("GEMINI_MODEL") || "gemini-3.8-flash",
  geminiModels: parseModelList(env("GEMINI_MODELS")),
  groqKey: env("GROQ_API_KEY"),
  groqModel: env("GROQ_MODEL") || "openai/gpt-oss-20b",
  groqModels: parseModelList(env("GROQ_MODELS")),
  publicUrl: env("PUBLIC_VALIDATE_URL").replace(/\/$/, ""),
  port: Number(process.env.PORT || 3000),
};

export function appwriteReady(): boolean {
  return Boolean(config.endpoint && config.projectId && config.apiKey);
}

function env(name: string): string {
  return process.env[name]?.trim() || "";
}
