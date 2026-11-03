import {
  derivePaymentLine1,
  derivePaymentLine2,
  deriveShortPlace,
} from "./receipt.js";

export type MoneyField = "tol" | "bensin" | "parkir" | "lain";
export type RequiredField = "receivedFrom" | "origin" | "destination" | "total";
export type PaymentMethod = "cash" | "transfer";

export type Draft = {
  origin: string | null;
  originShort: string | null;
  destination: string | null;
  destinationShort: string | null;
  receivedFrom: string | null;
  paymentLine1: string | null;
  paymentLine2: string | null;
  paymentMethod: PaymentMethod;
  total: number | null;
  breakdown: Record<MoneyField, number | null>;
  confidence: "high" | "medium" | "low";
  missing: RequiredField[];
  question: string | null;
  choices: PlaceChoices | null;
};

export type PlaceChoices = {
  field: "origin" | "destination";
  options: string[];
};

const MONEY_MAX = 2_000_000_000;

export function sanitizeDraft(raw: string): Draft {
  const parsed = parseJson(raw);
  const origin = cleanPlace(parsed.origin);
  const destination = cleanPlace(parsed.destination);
  const originShort = cleanShortPlace(parsed.originShort) ?? (origin ? deriveShortPlace(origin) : null);
  const destinationShort =
    cleanShortPlace(parsed.destinationShort) ?? (destination ? deriveShortPlace(destination) : null);

  const receivedFrom = cleanPassenger(parsed.receivedFrom);
  const paymentLine1 = cleanShortPlace(parsed.paymentLine1) ?? derivePaymentLine1(null);
  const paymentLine2 =
    originShort && destinationShort
      ? derivePaymentLine2(cleanShortPlace(parsed.paymentLine2), originShort, destinationShort)
      : cleanShortPlace(parsed.paymentLine2);
  const paymentMethod: PaymentMethod = parsed.paymentMethod === "transfer" ? "transfer" : "cash";

  const total = cleanMoney(parsed.total, false);
  const source = asRecord(parsed.breakdown);
  const breakdown: Draft["breakdown"] = {
    tol: cleanMoney(source.tol, true),
    bensin: cleanMoney(source.bensin, true),
    parkir: cleanMoney(source.parkir, true),
    lain: cleanMoney(source.lain, true),
  };
  const missing: RequiredField[] = [];
  if (!receivedFrom) missing.push("receivedFrom");
  if (!origin) missing.push("origin");
  if (!destination) missing.push("destination");
  if (total == null) missing.push("total");

  let confidence: Draft["confidence"] = missing.length ? "low" : "medium";
  if (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low") {
    confidence = parsed.confidence;
  }
  if (missing.length && confidence === "high") confidence = "medium";
  const question = cleanQuestion(parsed.question);
  if (question && confidence === "high") confidence = "medium";

  return {
    origin,
    originShort,
    destination,
    destinationShort,
    receivedFrom,
    paymentLine1,
    paymentLine2,
    paymentMethod,
    total,
    breakdown,
    confidence,
    missing,
    question,
    choices: cleanChoices(parsed.choices),
  };
}

function cleanQuestion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.toLowerCase() === "null") return null;
  return text.slice(0, 900);
}

function cleanChoices(value: unknown): Draft["choices"] {
  const record = asRecord(value);
  const field = record.field === "origin" || record.field === "destination" ? record.field : null;
  const options = Array.isArray(record.options)
    ? record.options.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5)
    : [];
  if (!field || options.length < 2) return null;
  return { field, options };
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

function cleanShortPlace(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text === "-" || text.toLowerCase() === "null") return null;
  return text.slice(0, 95);
}

function cleanPassenger(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (
    !text ||
    text === "-" ||
    text.toLowerCase() === "null" ||
    /^penumpang(\s*\/\s*pelanggan.*)?$/i.test(text) ||
    /^pelanggan(\s+gocrot.*)?$/i.test(text)
  ) {
    return null;
  }
  return text.slice(0, 95);
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
