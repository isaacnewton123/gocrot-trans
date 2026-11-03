import type { Draft, PlaceChoices, RequiredField } from "./draft.js";

type PlaceRow = {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

const cache = new Map<string, string[]>();

export async function groundPlaces(draft: Draft, messages: string[] = []): Promise<Draft> {
  const next: Draft = { ...draft, choices: null };
  const pin = latestPin(messages);
  for (const field of ["origin", "destination"] as const) {
    const value = next[field];
    if (!value || !shouldSearch(value)) continue;
    let options: string[];
    try {
      options = await searchPlaces(value);
    } catch (error) {
      console.error("[peta] pencarian gagal", error instanceof Error ? error.message : error);
      continue;
    }
    if (options.length === 1) {
      next[field] = options[0];
      continue;
    }
    if (options.length === 0) {
      if (pin) {
        next[field] = pin;
        continue;
      }
      if (addressIsEnough(value)) continue;
      next[field] = null;
      next.question = [
        `${value} belum ketemu.`,
        "Tulis nama jalan, kota atau kabupaten, dan kode pos. Atau bagikan lokasi lewat Lampirkan → Lokasi.",
      ].join("\n");
    } else {
      next[field] = null;
      next.choices = { field, options };
      next.question = choiceList(value, field, options);
    }
    break;
  }
  next.missing = missingOf(next);
  if (next.question) next.confidence = "low";
  return next;
}

export function choiceReply(choices: PlaceChoices | null | undefined, text: string): string | null {
  if (!choices) return null;
  const index = Number(text.trim()) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= choices.options.length) return null;
  const label = choices.field === "origin" ? "Jemput" : "Tujuan";
  return `${label}: ${choices.options[index]}`;
}

export function shouldSearch(query: string): boolean {
  const text = query.trim();
  if (text.length < 3 || text.startsWith("[lokasi WhatsApp]")) return false;
  if (addressIsEnough(text)) return false;
  if (/desa|kecamatan|kabupaten|kampung|\bkp\b|gang\b|rt\s*\d/i.test(text)) return false;
  return true;
}

export function addressIsEnough(text: string): boolean {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const hasRoad = parts.some((part) => /\b(jl\.?|jalan)\b/i.test(part));
  const hasPostcode = parts.some((part) => /\b\d{5}\b/.test(part));
  const hasCity = parts.some((part) => !isRoad(part) && !isPostcode(part) && !isProvince(part) && !isCountry(part));
  return hasRoad && hasPostcode && hasCity;
}

export function latestPin(messages: string[]): string | null {
  for (const message of [...messages].reverse()) {
    const address = pinAddress(message);
    if (address) return address;
  }
  return null;
}

function pinAddress(message: string): string | null {
  const text = message.trim();
  if (!text.startsWith("[lokasi WhatsApp]")) return null;
  const body = text
    .slice("[lokasi WhatsApp]".length)
    .trim()
    .replace(/-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\s*$/, "")
    .trim()
    .replace(/,\s*$/, "");
  return addressIsEnough(body) ? body : null;
}

function isRoad(part: string): boolean {
  return /\b(jl\.?|jalan)\b/i.test(part);
}

function isPostcode(part: string): boolean {
  return /^\d{5}$/.test(part.trim());
}

function isCountry(part: string): boolean {
  return /^(id|indonesia)$/i.test(part.trim());
}

function isProvince(part: string): boolean {
  return /^(jawa barat|jawa tengah|jawa timur|banten|bali|dki jakarta|daerah khusus ibukota jakarta)$/i.test(part.trim());
}

export function selectLabels(query: string, rows: PlaceRow[]): string[] {
  const matched = rows.filter((row) => sharesToken(query, `${row.name ?? ""} ${row.display_name ?? ""}`));
  const kept: PlaceRow[] = [];
  for (const row of matched) {
    const key = addressKey(row);
    const same = kept.findIndex((item) => addressKey(item) === key);
    if (same < 0) {
      kept.push(row);
      continue;
    }
    const betterScore = score(query, row) > score(query, kept[same]);
    const sameScoreLongerName =
      score(query, row) === score(query, kept[same]) && (row.name?.length ?? 0) > (kept[same].name?.length ?? 0);
    if (betterScore || sameScoreLongerName) kept[same] = row;
  }
  const labels = kept
    .map((row) => labelOf(row))
    .filter((label, index, all) => label.length > 0 && all.indexOf(label) === index);
  return labels.slice(0, 4);
}

async function searchPlaces(query: string): Promise<string[]> {
  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "id");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "id",
      "User-Agent": "GocrotTrans/1.0 (community taxi receipt)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Peta ${response.status}`);
  const rows = (await response.json()) as PlaceRow[];
  const labels = selectLabels(query, rows);
  cache.set(key, labels);
  return labels;
}

function choiceList(query: string, field: PlaceChoices["field"], options: string[]): string {
  const which = field === "origin" ? "jemput" : "tujuan";
  const lines = [`${query} ketemu di beberapa tempat. Untuk ${which}, balas nomornya:`];
  options.forEach((option, index) => lines.push(`${index + 1}. ${option}`));
  lines.push("", "Kalau tidak ada yang cocok, bagikan lokasi lewat Lampirkan → Lokasi.");
  return lines.join("\n");
}

function labelOf(row: PlaceRow): string {
  const parts = (row.display_name ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^indonesia$/i.test(part));
  const label = parts.join(", ");
  if (!label) return "";
  if (label.length <= 180) return label;
  const cut = label.slice(0, 180);
  const comma = cut.lastIndexOf(",");
  return (comma > 40 ? cut.slice(0, comma) : cut).trim();
}

function addressKey(row: PlaceRow): string {
  const address = row.address ?? {};
  return [address.road, address.house_number, address.village, address.postcode].filter(Boolean).join("|").toLowerCase();
}

function score(query: string, row: PlaceRow): number {
  const name = (row.name ?? "").toLowerCase();
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && name.includes(token)).length;
}

function sharesToken(query: string, haystack: string): boolean {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  const hay = haystack.toLowerCase();
  if (!tokens.length) return false;
  return tokens.some((token) => hay.includes(token));
}

function missingOf(draft: Draft): RequiredField[] {
  const missing: RequiredField[] = [];
  if (!draft.origin) missing.push("origin");
  if (!draft.destination) missing.push("destination");
  if (draft.total == null) missing.push("total");
  return missing;
}
