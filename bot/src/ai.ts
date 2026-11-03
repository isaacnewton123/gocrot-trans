import { config } from "./config.js";
import { sanitizeDraft, type Draft } from "./draft.js";
import { GEMINI_TEXT_MODELS, GROQ_CHAT_MODELS, modelChain } from "./models.js";

const ATTEMPT_MS = 12_000;

const INSTRUCTIONS = `Anda mengekstrak data perjalanan taksi dari chat pengemudi berbahasa Indonesia.
Balas HANYA dengan JSON. Tanpa prosa, tanpa markdown.

Bentuk JSON:
{
  "origin": string | null,
  "destination": string | null,
  "total": integer | null,
  "breakdown": {
    "tol": integer | null,
    "bensin": integer | null,
    "parkir": integer | null,
    "lain": integer | null
  },
  "confidence": "high" | "medium" | "low",
  "missing": ["origin" | "destination" | "total"]
}

Aturan:
- Uang disimpan sebagai integer Rupiah, tanpa desimal dan tanpa simbol.
- Arti singkatan: 700rb, 700 ribu = 700000. 700k = 700000. 1,5jt, 1.5jt, 1,5 juta = 1500000. 2jt = 2000000. 50k = 50000. Angka polos 700000 tetap 700000.
- Jika hanya tertulis "700" tanpa satuan dan konteksnya ambigu, total = null, confidence = "low", dan "total" ada di missing.
- Jangan mengarang asal, tujuan, atau nominal. Yang tidak disebut = null.
- Typo, bahasa gaul, dan urutan kata yang berantakan boleh ditafsirkan kalau maksudnya jelas.
- Jangan mengeluarkan nomor seri.
- missing wajib berisi setiap field wajib yang nilainya null.
- confidence high kalau tiga field wajib jelas. medium kalau ada ejaan yang ditebak. low kalau ada yang ambigu.
- breakdown hanya diisi kalau pengemudi menyebutkannya. Jangan menyeimbangkan angka dengan mengarang.
- Gabungkan seluruh pesan di bawah ini menjadi satu draf perjalanan. Pesan yang lebih baru memperbaiki pesan sebelumnya.`;

export async function extractTrip(messages: string[]): Promise<Draft> {
  if (!config.geminiKey && !config.groqKey) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  const transcript = messages.map((message, index) => `${index + 1}. ${message}`).join("\n");
  const prompt = `${INSTRUCTIONS}\n\nPesan pengemudi:\n${transcript}`;
  const raw = await complete(prompt);
  return sanitizeDraft(raw);
}

async function complete(prompt: string): Promise<string> {
  const errors: string[] = [];
  if (config.geminiKey) {
    const models = modelChain(
      config.geminiModel,
      config.geminiModels.length ? config.geminiModels : GEMINI_TEXT_MODELS,
    );
    for (const model of models) {
      try {
        const text = await gemini(prompt, model);
        console.log(`[ai] Gemini ${model}`);
        return text;
      } catch (error) {
        const message = errorText(error);
        console.error(`[ai] Gemini ${model} gagal: ${message}`);
        errors.push(message);
        if (isFatalAuth(message)) break;
      }
    }
  }
  if (config.groqKey) {
    const models = modelChain(
      config.groqModel,
      config.groqModels.length ? config.groqModels : GROQ_CHAT_MODELS,
    );
    for (const model of models) {
      try {
        const text = await groq(prompt, model);
        console.log(`[ai] Groq ${model}`);
        return text;
      } catch (error) {
        const message = errorText(error);
        console.error(`[ai] Groq ${model} gagal: ${message}`);
        errors.push(message);
        if (isFatalAuth(message)) break;
      }
    }
  }
  throw new Error(errors.at(-1) || "AI_FAILED");
}

async function gemini(prompt: string, model: string): Promise<string> {
  try {
    return await geminiOnce(prompt, model, true);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Gemini 400")) {
      return geminiOnce(prompt, model, false);
    }
    throw error;
  }
}

async function geminiOnce(prompt: string, model: string, jsonMode: boolean): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.geminiKey)}`;
  const generationConfig: { temperature: number; responseMimeType?: string } = { temperature: 0 };
  if (jsonMode) generationConfig.responseMimeType = "application/json";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
    signal: AbortSignal.timeout(ATTEMPT_MS),
  });
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error(`Gemini ${model} mengembalikan jawaban kosong`);
  return text;
}

async function groq(prompt: string, model: string): Promise<string> {
  try {
    return await groqOnce(prompt, model, true);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Groq 400")) {
      return groqOnce(prompt, model, false);
    }
    throw error;
  }
}

async function groqOnce(prompt: string, model: string, jsonMode: boolean): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: "Balas hanya dengan JSON sesuai permintaan pengguna." },
      { role: "user", content: prompt },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  if (model.startsWith("openai/gpt-oss") && !model.includes("safeguard")) body.reasoning_effort = "low";
  if (model.startsWith("qwen/")) body.reasoning_effort = "none";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ATTEMPT_MS),
  });
  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error(`Groq ${model} mengembalikan jawaban kosong`);
  return text;
}

function isFatalAuth(message: string): boolean {
  return /API key not valid|API_KEY_INVALID|invalid api key|Incorrect API key|invalid_api_key|\b401\b/i.test(
    message,
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
