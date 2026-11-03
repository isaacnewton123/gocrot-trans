import type { Draft, PlaceChoices, RequiredField } from "./draft.js";
import {
  derivePaymentLine1,
  derivePaymentLine2,
  deriveShortPlace,
} from "./receipt.js";

type PlaceRow = {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

const cache = new Map<string, string[]>();

export async function groundPlaces(
  draft: Draft,
  messages: string[] = [],
  optionsInput: {
    skipFields?: ReadonlySet<"origin" | "destination">;
    previousDraft?: Draft | null;
  } = {},
): Promise<Draft> {
  const skipFields = new Set<"origin" | "destination">(optionsInput.skipFields);
  const prev = optionsInput.previousDraft;
  const next: Draft = { ...draft, choices: null };

  const originTag = latestTaggedShareloc(messages, "JEMPUT");
  const destTag = latestTaggedShareloc(messages, "TUJUAN");
  if (originTag) {
    next.origin = next.origin ? mergePlaceWithPin(next.origin, originTag) : originTag;
    next.originShort = deriveShortPlace(next.origin);
    skipFields.add("origin");
  }
  if (destTag) {
    next.destination = next.destination ? mergePlaceWithPin(next.destination, destTag) : destTag;
    next.destinationShort = deriveShortPlace(next.destination);
    skipFields.add("destination");
  }

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : "";
  const lastMsgIsPin = lastMsg ? isPinMessage(lastMsg) : false;
  const pin = await resolveLatestPin(messages);

  if (lastMsgIsPin && pin && !originTag && !destTag) {
    const urlTitle = extractMapsTitle(lastMsg);
    const enrichedPin = urlTitle ? mergePlaceWithPin(urlTitle, pin) : pin;
    const matchOrigin = Boolean(next.origin && sharesToken(next.origin, enrichedPin));
    const matchDest = Boolean(next.destination && sharesToken(next.destination, enrichedPin));
    let pinTarget: "origin" | "destination" | null = null;
    if (matchDest && !matchOrigin) {
      pinTarget = "destination";
    } else if (matchOrigin && !matchDest) {
      pinTarget = "origin";
    } else {
      pinTarget =
        prev?.choices?.field ??
        (prev?.origin && !prev?.destination
          ? "destination"
          : !prev?.origin && prev?.destination
            ? "origin"
            : !next.destination && next.origin
              ? "destination"
              : !next.origin && next.destination
                ? "origin"
                : "origin");
    }
    if (pinTarget) {
      const existingVal = next[pinTarget] ?? urlTitle ?? "";
      const finalPin = existingVal ? mergePlaceWithPin(existingVal, enrichedPin) : enrichedPin;
      next[pinTarget] = finalPin;
      if (pinTarget === "origin") next.originShort = deriveShortPlace(finalPin);
      else next.destinationShort = deriveShortPlace(finalPin);
      skipFields.add(pinTarget);
      const otherField = pinTarget === "origin" ? "destination" : "origin";
      if (prev?.[otherField]) {
        next[otherField] = prev[otherField];
        if (otherField === "origin") next.originShort = deriveShortPlace(prev[otherField]);
        else next.destinationShort = deriveShortPlace(prev[otherField]);
        skipFields.add(otherField);
      }
    }
  }

  for (const field of ["origin", "destination"] as const) {
    if (skipFields.has(field)) continue;
    const value = next[field];
    if (!value) continue;
    if (addressIsEnough(value)) continue;
    next[field] = null;
    if (field === "origin") next.originShort = null;
    else next.destinationShort = null;
  }

  if (next.origin && !next.originShort) {
    next.originShort = deriveShortPlace(next.origin);
  }
  if (next.destination && !next.destinationShort) {
    next.destinationShort = deriveShortPlace(next.destination);
  }
  next.paymentLine1 = derivePaymentLine1(next.paymentLine1);
  if (next.originShort && next.destinationShort) {
    next.paymentLine2 = derivePaymentLine2(next.paymentLine2, next.originShort, next.destinationShort);
  } else {
    next.paymentLine2 = null;
  }
  next.missing = missingOf(next);
  if (!next.missing.length && !next.choices) {
    next.question = null;
  }
  if (next.question) next.confidence = "low";
  return next;
}

export function hasTaggedShareloc(messages: string[], kind: "JEMPUT" | "TUJUAN"): boolean {
  return latestTaggedShareloc(messages, kind) !== null;
}

function latestTaggedShareloc(messages: string[], kind: "JEMPUT" | "TUJUAN"): string | null {
  const prefix = `[SHARELOK ${kind} RESMI]:`;
  for (const msg of [...messages].reverse()) {
    if (msg.startsWith(prefix)) {
      const body = msg.slice(prefix.length).trim();
      if (body) return body;
    }
  }
  return null;
}

export async function resolveSharelocMessage(message: string): Promise<string | null> {
  const urlTitle = extractMapsTitle(message);
  const direct = await resolveLatestPin([message]);
  if (direct) {
    return urlTitle ? mergePlaceWithPin(urlTitle, direct) : direct;
  }
  return urlTitle;
}

export function choiceSelection(
  choices: PlaceChoices | null | undefined,
  text: string,
): { field: "origin" | "destination"; value: string; replyText: string } | null {
  if (!choices) return null;
  const index = Number(text.trim()) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= choices.options.length) return null;
  const value = choices.options[index];
  const label = choices.field === "origin" ? "Jemput" : "Tujuan";
  return { field: choices.field, value, replyText: `${label}: ${value}` };
}

export function choiceReply(choices: PlaceChoices | null | undefined, text: string): string | null {
  return choiceSelection(choices, text)?.replyText ?? null;
}

export function isPinMessage(message: string): boolean {
  const text = message.trim();
  return (
    text.startsWith("[lokasi WhatsApp]") ||
    /https?:\/\/(www\.)?(maps\.google\.com|google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(text)
  );
}

function extractMapsTitle(message: string): string | null {
  const match = message.match(/\/maps\/(?:search|place)\/([^/@?\s]+)/i);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
    return decoded.length >= 3 ? decoded : null;
  } catch {
    return null;
  }
}

export function shouldSearch(query: string): boolean {
  const text = query.trim();
  if (text.length < 3 || text.startsWith("[lokasi WhatsApp]")) return false;
  if (addressIsEnough(text)) return false;
  if (
    /desa|kelurahan|\bkel\.?\b|kampung|\bkp\.?\b|gang\b|\bgg\.?\b|rt\s*\.?\s*\d|rw\s*\.?\s*\d/i.test(
      text,
    )
  ) {
    return false;
  }
  return true;
}

export function addressIsEnough(text: string): boolean {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const hasPostcode = /\b\d{5}\b/.test(text);
  const nonMetaParts = parts.filter((part) => !isPostcode(part) && !isProvince(part) && !isCountry(part));
  if (hasPostcode && nonMetaParts.length >= 2) return true;
  return false;
}

function hasAreaOrCity(text: string): boolean {
  if (addressIsEnough(text)) return true;
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return true;
  return /\b(soekarno[\s-]*hatta|halim\s+perdanakusuma|cikopo|cikampek|kosambi|klari|telukjambe|bungursari|cibungur|karawang|bekasi|bandung|jakarta|tangerang|bogor|depok|purwakarta|subang|cikarang|cibitung|deltamas|cirebon|tasikmalaya|garut|sumedang|cianjur|sukabumi|serang|cilegon|merak|lembang|padalarang|cimahi|indramayu|majalengka|kuningan|brebes|tegal|pekalongan|semarang|solo|surakarta|yogyakarta|jogja|surabaya|malang|bali|denpasar)\b/i.test(
    text,
  );
}

function mergePlaceWithPin(placeValue: string, pinAddr: string): string {
  const firstPart = placeValue.split(",")[0]?.trim() ?? "";
  if (!firstPart || pinAddr.toLowerCase().includes(firstPart.toLowerCase())) {
    return pinAddr;
  }
  return `${firstPart}, ${pinAddr}`;
}

export async function resolveLatestPin(messages: string[]): Promise<string | null> {
  for (const message of [...messages].reverse()) {
    const address = pinAddress(message);
    if (address && addressIsEnough(address)) return address;
    const coords = extractCoords(message);
    if (coords) {
      try {
        const reversed = await reverseGeocode(coords.lat, coords.lon);
        if (reversed) {
          return address ? mergePlaceWithPin(address, reversed) : reversed;
        }
      } catch (error) {
        console.error("[peta] reverse geocode gagal", error instanceof Error ? error.message : error);
      }
    }
    if (address) return address;
  }
  return null;
}

function extractCoords(message: string): { lat: number; lon: number } | null {
  const match = message.match(/(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{2,3}\.\d{4,})/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "id",
      "User-Agent": "GocrotTrans/1.0 (community taxi receipt)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const row = (await response.json()) as PlaceRow;
  const label = labelOf(row);
  return label || null;
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
  if (text.startsWith("[lokasi WhatsApp]")) {
    const body = text
      .slice("[lokasi WhatsApp]".length)
      .trim()
      .replace(/-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\s*$/, "")
      .trim()
      .replace(/,\s*$/, "");
    return addressIsEnough(body) || body.length >= 8 ? body : null;
  }
  if (/https?:\/\/(www\.)?(maps\.google\.com|google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(text)) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^https?:\/\//i.test(line));
    const joined = lines.join(", ").replace(/,\s*(ID|Indonesia)$/i, "").trim();
    if (joined.length >= 5) return joined;
  }
  return null;
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

  const variants = queryVariants(query);
  for (const variant of variants) {
    const rows = await fetchNominatim(variant);
    const labels = selectLabels(query, rows);
    if (labels.length > 0) {
      cache.set(key, labels);
      return labels;
    }
  }

  cache.set(key, []);
  return [];
}

async function fetchNominatim(query: string): Promise<PlaceRow[]> {
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
  return (await response.json()) as PlaceRow[];
}

export function queryVariants(query: string): string[] {
  const variants: string[] = [];
  const push = (candidate: string) => {
    const clean = candidate
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/^,\s*|,\s*$/g, "")
      .trim();
    if (clean.length >= 3 && !variants.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      variants.push(clean);
    }
  };

  push(query);

  const noAdmin = query
    .replace(
      /\b(kabupaten|kab\.?|kota|kecamatan|kec\.?|provinsi|jawa barat|jawa tengah|jawa timur|banten|dki jakarta|indonesia)\b/gi,
      " ",
    )
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",");
  push(noAdmin);

  const stripFacility = (text: string) =>
    text
      .replace(
        /\b(rs|rsud|rsia|rsu|rumah\s+sakit|hospital|medical|center|centre|klinik|clinic|smc|pool|bus|agen|hotel|villa|resort)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();

  const parenMatch = query.match(/\(([^)]+)\)/);
  const parts = noAdmin
    .replace(/\([^)]*\)/g, " ")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parenMatch && parts.length >= 2) {
    const innerCore = stripFacility(parenMatch[1]);
    const tail = parts.slice(1).join(", ");
    if (innerCore) {
      push(`${innerCore} ${parts[1]}`);
      push(`${innerCore}, ${tail}`);
    }
  }

  if (parts.length >= 2) {
    const headCore = stripFacility(parts[0]);
    const tail = parts.slice(1).join(", ");
    if (headCore) {
      push(`${headCore}, ${tail}`);
      push(`${headCore} ${parts[parts.length - 1]}`);
      push(`${headCore} ${parts[1]}`);
    }
  }

  return variants.slice(0, 6);
}

function choiceList(query: string, field: PlaceChoices["field"], options: string[]): string {
  const which = field === "origin" ? "jemput" : "tujuan";
  const lines = [`Ada beberapa *${query}* nih. Untuk lokasi ${which}, yang nomor berapa ya?`, ""];
  options.forEach((option, index) => lines.push(`*${index + 1}.* ${option}`));
  lines.push("", "_Balas angkanya aja, atau kirim shareloc kalau bukan salah satu di atas._");
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

const GENERIC_PLACE_TOKENS = new Set([
  "rs",
  "rsud",
  "rsia",
  "rsu",
  "rumah",
  "sakit",
  "hospital",
  "medical",
  "center",
  "centre",
  "klinik",
  "clinic",
  "smc",
  "hotel",
  "villa",
  "resort",
  "pool",
  "bus",
  "agen",
  "pt",
  "cv",
  "jalan",
  "raya",
  "kabupaten",
  "kota",
  "kecamatan",
]);

function sharesToken(query: string, haystack: string): boolean {
  const parts = query.split(",").map((part) => part.trim()).filter(Boolean);
  const head = parts[0] ?? query;
  const areaTokens = new Set(
    parts
      .slice(1)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
  const headTokens = head
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !GENERIC_PLACE_TOKENS.has(token));
  const specificTokens = headTokens.filter((token) => !areaTokens.has(token));
  const tokens =
    specificTokens.length > 0
      ? specificTokens
      : headTokens.length > 0
        ? headTokens
        : query
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length >= 3);
  const hay = haystack.toLowerCase();
  if (!tokens.length) return false;
  return tokens.some((token) => hay.includes(token));
}

function missingOf(draft: Draft): RequiredField[] {
  const missing: RequiredField[] = [];
  if (!draft.receivedFrom) missing.push("receivedFrom");
  if (!draft.origin) missing.push("origin");
  if (!draft.destination) missing.push("destination");
  if (draft.total == null) missing.push("total");
  return missing;
}
