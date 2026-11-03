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
  return /^(batal|reset|ulang)[!.\s]*$/i.test(text.trim());
}

export function isGreeting(text: string): boolean {
  return /^(halo|hai|hi|hello|help|menu|mulai|ping)[!.\s]*$/i.test(text.trim());
}
