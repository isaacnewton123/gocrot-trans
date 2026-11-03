import { config } from "./config.js";
import { sanitizeDraft, type Draft } from "./draft.js";
import { GEMINI_TEXT_MODELS, GROQ_CHAT_MODELS, modelChain } from "./models.js";

const ATTEMPT_MS = 6_000;
const COOLDOWN_MS = 2 * 60 * 1000;
let geminiCooldownUntil = 0;
const modelCooldown = new Map<string, number>();

const INSTRUCTIONS = `Anda adalah asisten AI GOCROT TRANS yang ramah, santai, hangat, dan membantu pengemudi mencatat kwitansi perjalanan di WhatsApp.
Balas HANYA dengan JSON murni sesuai skema di bawah (tanpa markdown, tanpa teks di luar JSON).

Skema Output JSON:
{
  "origin": string | null,
  "originShort": string | null,
  "destination": string | null,
  "destinationShort": string | null,
  "receivedFrom": string | null,
  "paymentLine1": string | null,
  "paymentLine2": string | null,
  "paymentMethod": "cash" | "transfer",
  "total": integer | null,
  "breakdown": { "tol": integer | null, "bensin": integer | null, "parkir": integer | null, "lain": integer | null },
  "confidence": "high" | "medium" | "low",
  "missing": ["receivedFrom" | "origin" | "destination" | "total"],
  "question": string | null
}

ATURAN UTAMA (WAJIB DIIKUTI 100%):
1. PRINSIP NOL ASUMSI & WAJIB SHARELOC SATU PER SATU:
   - Lokasi penjemputan ("origin") dan lokasi tujuan ("destination") WAJIB berasal dari Shareloc / Link Google Maps yang ditandai dengan "[SHARELOK JEMPUT RESMI]: ..." dan "[SHARELOK TUJUAN RESMI]: ..." di riwayat chat.
   - Jika di riwayat chat BELUM ADA "[SHARELOK JEMPUT RESMI]: ...", maka "origin" WAJIB diisi null (walaupun pengemudi sudah menulis nama tempat jemput lewat teks!).
   - Jika di riwayat chat BELUM ADA "[SHARELOK TUJUAN RESMI]: ...", maka "destination" WAJIB diisi null (walaupun pengemudi sudah menulis nama tempat tujuan lewat teks!).
   - Jika "[SHARELOK JEMPUT RESMI]: <alamat>" SUDAH ADA, salin utuh alamat lengkap beserta jalan dan kode posnya ke "origin". Jika sebelumnya pengemudi sempat menyebut nama tempat/gedung jemput lewat teks yang belum tertulis di awal shareloc tersebut, gabungkan nama tempat itu di depan alamat shareloc-nya.
   - Jika "[SHARELOK TUJUAN RESMI]: <alamat>" SUDAH ADA, salin utuh alamat lengkap beserta jalan dan kode posnya ke "destination". Jika sebelumnya pengemudi sempat menyebut nama tempat/gedung tujuan lewat teks yang belum tertulis di awal shareloc tersebut, gabungkan nama tempat itu di depan alamat shareloc-nya.

2. DATA WAJIB LAINNYA:
   - "receivedFrom": Nama penumpang atau instansi/perusahaan penyewa. Jika belum disebut oleh pengemudi, wajib isi null (jangan mengarang).
   - "total": Total tarif dalam integer Rupiah murni (contoh: 150k / 150rb = 150000, 1,5jt = 1500000). Jika belum disebut atau ambigu, wajib isi null.
   - "originShort" & "destinationShort": versi ringkas "<Nama Tempat>, <Kota>" (maksimal 50 karakter, tanpa kode pos) hanya jika "origin" / "destination" sudah tidak null.
   - "paymentLine1": deskripsi layanan singkat (default: "Layanan Jasa Transportasi Perjalanan").
   - "paymentLine2": "Rute <originShort> — <destinationShort>" jika keduanya sudah tidak null; selain itu null.
   - "paymentMethod": isi "transfer" jika pengemudi menyebut transfer/tf/qris/bank; selain itu "cash".
   - "breakdown": isi tol/bensin/parkir/lain hanya jika disebut eksplisit oleh pengemudi.

3. URUTAN BERTANYA SATU PER SATU & GAYA BAHASA AI DI "question" (SANGAT PENTING):
   - "missing" wajib berisi setiap field dari ["receivedFrom", "origin", "destination", "total"] yang nilainya masih null.
   - Jika keempat field wajib sudah terisi lengkap (semua tidak null), maka "missing" = [] dan "question" = null.
   - Jika masih ada yang null, tulis "question" dengan gaya ngobrol AI yang SANGAT RAMAH, hangat, luwes seperti teman/asisten pribadi (JANGAN kaku seperti bot/formulir!), kalimatnya pendek & enak dibaca (1–2 kalimat saja), dan WAJIB memakai emoji yang relevan (seperti 😊, 👋, 📍, 🚗, ✨, ✅, 📝, 🙌).
   - Urutan meminta data di "question" agar pengemudi tidak bingung:
     a) Jika keempat field ("origin", "destination", "receivedFrom", "total") masih null (misal pengemudi baru menyapa atau minta buat kwitansi baru):
        Sapa dengan ramah & ceria, lalu minta pengemudi mengirimkan **shareloc (atau link Google Maps) titik penjemputannya** terlebih dahulu 📍🚗. JANGAN PERNAH bilang sudah mencatat nama atau tarif kalau "receivedFrom" / "total" masih null!
     b) Jika "origin" (Shareloc Jemput) masih null (tetapi "receivedFrom" atau "total" benar-benar sudah tidak null):
        Minta pengemudi mengirimkan **shareloc (atau link Google Maps) titik penjemputan** terlebih dahulu 📍.
     c) Jika "origin" SUDAH terisi, tapi "destination" (Shareloc Tujuan) masih null:
        Katakan dengan ramah bahwa titik jemputnya sudah masuk ✅📍, lalu minta pengemudi mengirimkan **shareloc (atau link Google Maps) untuk lokasi tujuannya** 🚗.
     d) Jika "origin" dan "destination" SUDAH terisi, tapi "receivedFrom" atau "total" masih null:
        Katakan titik rutenya sudah lengkap, tinggal tanyakan nama penumpang dan/atau total tarifnya dengan ramah 😊.`;

export async function extractTrip(messages: string[]): Promise<Draft> {
  if (!config.geminiKey && !config.groqKey) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  const transcript = messages.map((message, index) => `${index + 1}. ${message}`).join("\n");
  const prompt = `${INSTRUCTIONS}\n\nPesan pengemudi:\n${transcript}`;
  return completeDraft(prompt);
}

export async function generateCancelReply(userText: string): Promise<string> {
  const prompt = `Pengemudi GOCROT TRANS mengirim pesan pembatalan pembuatan kwitansi: "${userText}".
Balas dengan JSON murni: {"reply": "..."}
Isi "reply" dengan 1 kalimat pendek berbahasa Indonesia yang ramah, santai, hangat seperti ngobrol dengan AI (pakai 1-2 emoji seperti 😊🙏👍), yang mengonfirmasi bahwa draf kwitansi tadi sudah dibatalkan dan siap membantu lagi kapan saja tanpa menanyakan data apa pun.`;
  try {
    const raw = await completeRawJson(prompt);
    const parsed = JSON.parse(raw) as { reply?: unknown };
    if (typeof parsed.reply === "string" && parsed.reply.trim()) {
      return parsed.reply.trim();
    }
  } catch {
    // fallback if offline
  }
  return "Siap Kak, pembuatan kwitansinya sudah saya batalkan ya! 😊🙏 Kalau nanti mau buat lagi, tinggal kabari aja ya 🚗✨";
}

async function completeRawJson(prompt: string): Promise<string> {
  const now = Date.now();
  if (config.geminiKey && now >= geminiCooldownUntil) {
    const model = config.geminiModel || GEMINI_TEXT_MODELS[0];
    try {
      return await gemini(prompt, model);
    } catch {
      geminiCooldownUntil = Date.now() + COOLDOWN_MS;
    }
  }
  if (config.groqKey) {
    const model = config.groqModel || GROQ_CHAT_MODELS[0];
    return await groq(prompt, model);
  }
  throw new Error("AI_FAILED");
}

async function completeDraft(prompt: string): Promise<Draft> {
  const errors: string[] = [];
  const now = Date.now();
  if (config.geminiKey && Date.now() >= geminiCooldownUntil) {
    const allGemini = modelChain(
      config.geminiModel,
      config.geminiModels.length ? config.geminiModels : GEMINI_TEXT_MODELS,
    ).filter((m) => (modelCooldown.get(m) ?? 0) < now);
    const geminiCandidates = config.groqKey ? allGemini.slice(0, 1) : allGemini;
    for (const model of geminiCandidates) {
      try {
        const text = await gemini(prompt, model);
        const draft = sanitizeDraft(text);
        if (isBlankDraft(draft)) {
          throw new Error(`Gemini ${model} menghasilkan JSON tanpa isi`);
        }
        console.log(`[ai] Gemini ${model}`);
        return draft;
      } catch (error) {
        const message = errorText(error);
        console.error(`[ai] Gemini ${model} gagal: ${message}`);
        errors.push(message);
        modelCooldown.set(model, Date.now() + COOLDOWN_MS);
        if (config.groqKey) {
          geminiCooldownUntil = Date.now() + COOLDOWN_MS;
          break;
        }
        if (isFatalAuth(message)) break;
      }
    }
  }
  if (config.groqKey) {
    const models = modelChain(
      config.groqModel,
      config.groqModels.length ? config.groqModels : GROQ_CHAT_MODELS,
    ).filter((m) => (modelCooldown.get(m) ?? 0) < now);
    for (const model of models.length ? models : GROQ_CHAT_MODELS) {
      try {
        const text = await groq(prompt, model);
        const draft = sanitizeDraft(text);
        if (isBlankDraft(draft)) {
          throw new Error(`Groq ${model} menghasilkan JSON tanpa isi`);
        }
        console.log(`[ai] Groq ${model}`);
        return draft;
      } catch (error) {
        const message = errorText(error);
        console.error(`[ai] Groq ${model} gagal: ${message}`);
        errors.push(message);
        modelCooldown.set(model, Date.now() + COOLDOWN_MS);
        if (isFatalAuth(message)) break;
      }
    }
  }
  throw new Error(errors.at(-1) || "AI_FAILED");
}

function isBlankDraft(draft: Draft): boolean {
  return (
    !draft.origin &&
    !draft.destination &&
    !draft.receivedFrom &&
    draft.total == null &&
    !draft.question
  );
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
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const nonThought = parts.filter((part) => !part.thought);
  const activeParts = nonThought.length > 0 ? nonThought : parts;
  const text = activeParts.map((part) => part.text ?? "").join("");
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
