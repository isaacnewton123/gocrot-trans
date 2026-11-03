import { config } from "./config.js";
import { sanitizeDraft, type Draft } from "./draft.js";

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
  if (config.geminiKey) {
    try {
      return await gemini(prompt);
    } catch (error) {
      console.error("[ai] Gemini gagal", error);
      if (!config.groqKey) throw error;
    }
  }
  return groq(prompt);
}

async function gemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini mengembalikan jawaban kosong");
  return text;
}

async function groq(prompt: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groqModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Balas hanya dengan JSON sesuai permintaan pengguna." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Groq ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Groq mengembalikan jawaban kosong");
  return text;
}
