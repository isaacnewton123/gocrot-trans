export type MoneyField = "tol" | "bensin" | "parkir" | "lain";
export type RequiredField = "origin" | "destination" | "total";

export type Draft = {
  origin: string | null;
  destination: string | null;
  total: number | null;
  breakdown: Record<MoneyField, number | null>;
  confidence: "high" | "medium" | "low";
  missing: RequiredField[];
};

const MONEY_MAX = 2_000_000_000;

export function sanitizeDraft(raw: string): Draft {
  const parsed = parseJson(raw);
  const origin = cleanPlace(parsed.origin);
  const destination = cleanPlace(parsed.destination);
  const total = cleanMoney(parsed.total, false);
  const source = asRecord(parsed.breakdown);
  const breakdown: Draft["breakdown"] = {
    tol: cleanMoney(source.tol, true),
    bensin: cleanMoney(source.bensin, true),
    parkir: cleanMoney(source.parkir, true),
    lain: cleanMoney(source.lain, true),
  };
  const missing: RequiredField[] = [];
  if (!origin) missing.push("origin");
  if (!destination) missing.push("destination");
  if (total == null) missing.push("total");

  let confidence: Draft["confidence"] = missing.length ? "low" : "medium";
  if (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low") {
    confidence = parsed.confidence;
  }
  if (missing.length && confidence === "high") confidence = "medium";

  return { origin, destination, total, breakdown, confidence, missing };
}

export function parseJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return asRecord(JSON.parse(trimmed));
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return asRecord(JSON.parse(trimmed.slice(start, end + 1)));
    }
    throw new Error("Jawaban AI bukan JSON");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function cleanPlace(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text === "-" || text.toLowerCase() === "null") return null;
  return text.slice(0, 180);
}

function cleanMoney(value: unknown, allowZero: boolean): number | null {
  let numeric: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) numeric = value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) numeric = Number(value.trim());
  if (numeric == null || !Number.isInteger(numeric)) return null;
  if (numeric < 0 || numeric > MONEY_MAX) return null;
  if (!allowZero && numeric === 0) return null;
  return numeric;
}
