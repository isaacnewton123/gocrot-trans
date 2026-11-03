const YES = new Set([
  "ya",
  "iya",
  "y",
  "yes",
  "ok",
  "oke",
  "benar",
  "betul",
  "setuju",
]);

const NO = new Set([
  "tidak",
  "tdk",
  "gak",
  "nggak",
  "ga",
  "enggak",
  "salah",
  "no",
  "bukan",
]);

export function intentOf(text: string): "yes" | "no" | "other" {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[!?.]+$/g, "")
    .trim();
  if (YES.has(normalized)) return "yes";
  if (NO.has(normalized)) return "no";
  return "other";
}

export function isCancel(text: string): boolean {
  const clean = text.trim();
  if (!clean || /\b(dari|ke|jemput|tujuan|\d+\s*(rb|ribu|k|jt|juta))\b/i.test(clean)) {
    return false;
  }
  return (
    /\b(batal|batalin|batalkan|cancel|reset)\b/i.test(clean) ||
    /\b(g|ga|gak|gk|ngga|nggak|nggk|ngk|engga|enggak|kagak|tidak|tdk|jangan)\s*jadi\b/i.test(clean) ||
    /^(ulang|stop|hapus)\b/i.test(clean)
  );
}

export function isGreeting(text: string): boolean {
  return /^(p|halo|hai|hi|hello|help|menu|mulai|ping|pagi|siang|sore|malam|selamat\s+(pagi|siang|sore|malam)|assalamualaikum|permisi|tes|test)[!.\s]*$/i.test(
    text.trim(),
  );
}
