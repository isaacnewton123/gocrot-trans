import { randomInt } from "node:crypto";
import type { Collection } from "mongodb";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type SeriesDoc = {
  _id: string;
  code: string;
  prefix: string;
  suffix: number;
  sequence: number;
  status: "available" | "used" | "blocked";
  tripId: string;
  blockedReason: string;
  usedAt: string;
};

export async function createSeriesBook(
  series: Collection<SeriesDoc>,
  count: number,
): Promise<{ prefix: string; created: number; from: string; to: string; nextSuffix: number; nextSequence: number }> {
  if (!Number.isInteger(count) || count < 1 || count > 9999) {
    throw new Error("Jumlah harus 1 sampai 9999.");
  }
  const prefix = await freshPrefix(series);
  const sequenceStart = (await maxSequence(series)) + 1;
  const docs: SeriesDoc[] = [];
  for (let index = 0; index < count; index += 1) {
    const suffix = index + 1;
    const code = `${prefix}-${String(suffix).padStart(4, "0")}`;
    docs.push({
      _id: code,
      code,
      prefix,
      suffix,
      sequence: sequenceStart + index,
      status: "available",
      tripId: "",
      blockedReason: "",
      usedAt: "",
    });
  }
  for (let offset = 0; offset < docs.length; offset += 500) {
    await series.insertMany(docs.slice(offset, offset + 500), { ordered: true });
  }
  return {
    prefix,
    created: docs.length,
    from: docs[0].code,
    to: docs[docs.length - 1].code,
    nextSuffix: count + 1,
    nextSequence: sequenceStart + count,
  };
}

async function freshPrefix(series: Collection<SeriesDoc>): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const prefix = randomPrefix();
    const existing = await series.findOne({ prefix }, { projection: { _id: 1 } });
    if (!existing) return prefix;
  }
  throw new Error("Gagal mencari awalan yang masih kosong.");
}

async function maxSequence(series: Collection<SeriesDoc>): Promise<number> {
  const top = await series.find({}, { projection: { sequence: 1 } }).sort({ sequence: -1 }).limit(1).next();
  return top?.sequence || 0;
}

function randomPrefix(): string {
  let prefix = "";
  for (let index = 0; index < 4; index += 1) prefix += ALPHABET[randomInt(ALPHABET.length)];
  return prefix;
}
