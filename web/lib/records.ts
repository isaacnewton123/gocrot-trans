"use server";

import { auth } from "@clerk/nextjs/server";
import { MongoServerError, type Filter } from "mongodb";
import {
  derivePaymentLine1,
  derivePaymentLine2,
  deriveReceivedFrom,
  deriveShortPlace,
  jakartaEnd,
  jakartaStart,
  normalizeSeries,
  terbilangRupiah,
} from "./format";
import { database, failMessage } from "./mongo";
import { normalizePhone } from "./phone";
import { createSeriesBook, type SeriesDoc } from "./series-book";
import type {
  ChatLog,
  Driver,
  GenerateResult,
  PaymentMethod,
  PublicTrip,
  Series,
  Trip,
  TripFilters,
  Validation,
} from "./types";

type DriverDoc = { _id: string; phone: string; name: string; active: boolean; note: string };
type TripDoc = {
  _id: string;
  seriesCode: string;
  driverPhone: string;
  driverName: string;
  origin: string;
  originShort?: string;
  destination: string;
  destinationShort?: string;
  receivedFrom?: string;
  paymentLine1?: string;
  paymentLine2?: string;
  paymentMethod?: PaymentMethod;
  total: number;
  terbilang?: string;
  tol: number | null;
  bensin: number | null;
  parkir: number | null;
  lain: number | null;
  confirmedAt: string;
  sourceText: string;
};
type LogDoc = { _id: string; phone: string; direction: "in" | "out"; body: string; createdAt: string };

async function requireAdmin(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return "Login admin diperlukan.";
  return null;
}

function duplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function listDrivers(): Promise<{ ok: true; rows: Driver[] } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    const db = await database();
    const docs = await db.collection<DriverDoc>("drivers").find({}).limit(100).toArray();
    return {
      ok: true,
      rows: docs
        .map(toDriver)
        .sort((a, b) => a.name.localeCompare(b.name, "id")),
    };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function addDriver(input: {
  name: string;
  phone: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  if (!phone || !name) return { ok: false, error: "Nama dan nomor WhatsApp belum benar." };
  try {
    const db = await database();
    await db.collection<DriverDoc>("drivers").insertOne({ _id: phone, phone, name, active: true, note: "" });
    return { ok: true };
  } catch (error) {
    if (duplicate(error)) return { ok: false, error: "Nomor ini sudah terdaftar." };
    return { ok: false, error: failMessage(error) };
  }
}

export async function updateDriver(input: {
  id: string;
  name: string;
  active: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nama belum diisi." };
  try {
    const db = await database();
    const result = await db.collection<DriverDoc>("drivers").updateOne({ _id: input.id }, { $set: { name, active: input.active } });
    if (!result.matchedCount) return { ok: false, error: "Pengemudi tidak ditemukan." };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function listSeries(input: {
  status: string;
  after: string | null;
}): Promise<{ ok: true; rows: Series[]; cursor: string | null } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    const db = await database();
    const series = db.collection<SeriesDoc>("series");
    const all = input.status === "all";
    const filter: Filter<SeriesDoc> = all ? {} : { status: input.status as SeriesDoc["status"] };
    if (input.after) {
      const cursorDoc = await series.findOne({ _id: input.after });
      if (cursorDoc) filter.sequence = all ? { $lt: cursorDoc.sequence } : { $gt: cursorDoc.sequence };
    }
    const docs = await series
      .find(filter)
      .sort({ sequence: all ? -1 : 1 })
      .limit(30)
      .toArray();
    return {
      ok: true,
      rows: docs.map(toSeries),
      cursor: docs.length === 30 ? docs[docs.length - 1]._id : null,
    };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function generateSeries(count: number): Promise<GenerateResult | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    const db = await database();
    const created = await createSeriesBook(db.collection<SeriesDoc>("series"), Math.floor(count));
    return { ok: true, ...created };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function setSeriesBlocked(input: {
  id: string;
  blocked: boolean;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    const db = await database();
    const series = db.collection<SeriesDoc>("series");
    const current = await series.findOne({ _id: input.id });
    if (!current) return { ok: false, error: "Nomor seri tidak ditemukan." };
    if (current.status === "used") return { ok: false, error: "Nomor yang sudah terpakai tidak bisa diubah." };
    const next = input.blocked
      ? { status: "blocked" as const, blockedReason: input.reason.trim() || "Diblokir admin" }
      : { status: "available" as const, blockedReason: "" };
    await series.updateOne({ _id: input.id, status: { $ne: "used" } }, { $set: next });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function listTrips(input: {
  filters: TripFilters;
  after: string | null;
}): Promise<{ ok: true; rows: Trip[]; cursor: string | null } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    const db = await database();
    const trips = db.collection<TripDoc>("trips");
    let filter = tripFilter(input.filters);
    if (input.after) {
      const cursorDoc = await trips.findOne({ _id: input.after });
      if (cursorDoc) {
        filter = {
          $and: [
            filter,
            {
              $or: [
                { confirmedAt: { $lt: cursorDoc.confirmedAt } },
                { confirmedAt: cursorDoc.confirmedAt, _id: { $lt: cursorDoc._id } },
              ],
            },
          ],
        };
      }
    }
    const docs = await trips.find(filter).sort({ confirmedAt: -1, _id: -1 }).limit(25).toArray();
    return { ok: true, rows: docs.map(toTrip), cursor: docs.length === 25 ? docs[docs.length - 1]._id : null };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function exportTrips(
  filters: TripFilters,
): Promise<{ ok: true; rows: Trip[] } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  try {
    const db = await database();
    const docs = await db
      .collection<TripDoc>("trips")
      .find(tripFilter(filters))
      .sort({ confirmedAt: -1, _id: -1 })
      .limit(1000)
      .toArray();
    return { ok: true, rows: docs.map(toTrip) };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function listLogs(
  phone: string,
): Promise<{ ok: true; rows: ChatLog[] } | { ok: false; error: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const trimmed = phone.trim();
  const normalized = trimmed ? normalizePhone(trimmed) : null;
  if (trimmed && !normalized) return { ok: false, error: "Nomor tidak valid." };
  try {
    const db = await database();
    const filter: Filter<LogDoc> = normalized ? { phone: normalized } : {};
    const docs = await db.collection<LogDoc>("chat_logs").find(filter).sort({ createdAt: -1 }).limit(50).toArray();
    return { ok: true, rows: docs.map(toLog) };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

export async function validateReceipt(codeInput: string): Promise<Validation | { ok: false; error: string }> {
  const code = normalizeSeries(codeInput);
  if (!/^[A-Z0-9]{4}-\d{4}$/.test(code)) return { ok: true, result: "not_found", series: code };
  try {
    const db = await database();
    const series = await db.collection<SeriesDoc>("series").findOne({ _id: code });
    if (!series) return { ok: true, result: "not_found", series: code };
    if (series.status === "blocked") {
      return { ok: true, result: "blocked", series: code, reason: series.blockedReason || null };
    }
    if (series.status === "available") return { ok: true, result: "unused", series: code };
    if (series.status === "used" && series.tripId) {
      const trip = await db.collection<TripDoc>("trips").findOne({ _id: series.tripId });
      if (trip) {
        return {
          ok: true,
          result: "valid",
          series: code,
          trip: toPublicTrip(trip),
        };
      }
    }
    return { ok: true, result: "already_used", series: code, usedAt: series.usedAt || null };
  } catch (error) {
    return { ok: false, error: failMessage(error) };
  }
}

function tripFilter(filters: TripFilters): Filter<TripDoc> {
  const filter: Filter<TripDoc> = {};
  const and: Filter<TripDoc>[] = [];
  if (filters.driver) and.push({ driverPhone: filters.driver });
  if (filters.from || filters.to) {
    const confirmedAt: { $gte?: string; $lte?: string } = {};
    if (filters.from) confirmedAt.$gte = jakartaStart(filters.from);
    if (filters.to) confirmedAt.$lte = jakartaEnd(filters.to);
    and.push({ confirmedAt });
  }
  const term = filters.q.trim();
  const code = normalizeSeries(term);
  if (/^[A-Z0-9]{4}-\d{4}$/.test(code)) and.push({ seriesCode: code });
  else if (term.length >= 3) {
    const pattern = escapeRegex(term);
    and.push({
      $or: [
        { seriesCode: { $regex: pattern, $options: "i" } },
        { driverName: { $regex: pattern, $options: "i" } },
        { receivedFrom: { $regex: pattern, $options: "i" } },
        { originShort: { $regex: pattern, $options: "i" } },
        { origin: { $regex: pattern, $options: "i" } },
        { destinationShort: { $regex: pattern, $options: "i" } },
        { destination: { $regex: pattern, $options: "i" } },
      ],
    });
  }
  if (and.length === 1) return and[0];
  if (and.length > 1) filter.$and = and;
  return filter;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDriver(doc: DriverDoc): Driver {
  return { id: doc._id, phone: doc.phone, name: doc.name, active: doc.active, note: doc.note };
}

function toSeries(doc: SeriesDoc): Series {
  return {
    id: doc._id,
    code: doc.code,
    prefix: doc.prefix,
    suffix: doc.suffix,
    sequence: doc.sequence,
    status: doc.status,
    tripId: doc.tripId,
    blockedReason: doc.blockedReason,
    usedAt: doc.usedAt,
  };
}

function toTrip(doc: TripDoc): Trip {
  const origin = doc.origin || "";
  const destination = doc.destination || "";
  const originShort = doc.originShort || deriveShortPlace(origin);
  const destinationShort = doc.destinationShort || deriveShortPlace(destination);
  const receivedFrom = deriveReceivedFrom(doc.receivedFrom, originShort);
  const paymentLine1 = derivePaymentLine1(doc.paymentLine1);
  const paymentLine2 = derivePaymentLine2(doc.paymentLine2, originShort, destinationShort);
  const paymentMethod: PaymentMethod = doc.paymentMethod === "transfer" ? "transfer" : "cash";
  const total = Number(doc.total) || 0;
  const terbilang = doc.terbilang || terbilangRupiah(total);

  return {
    id: doc._id,
    seriesCode: doc.seriesCode,
    driverPhone: doc.driverPhone,
    driverName: doc.driverName,
    origin,
    originShort,
    destination,
    destinationShort,
    receivedFrom,
    paymentLine1,
    paymentLine2,
    paymentMethod,
    total,
    terbilang,
    tol: doc.tol,
    bensin: doc.bensin,
    parkir: doc.parkir,
    lain: doc.lain,
    confirmedAt: doc.confirmedAt,
    sourceText: doc.sourceText,
  };
}

function toPublicTrip(doc: TripDoc): PublicTrip {
  const normalized = toTrip(doc);
  return {
    origin: normalized.origin,
    originShort: normalized.originShort,
    destination: normalized.destination,
    destinationShort: normalized.destinationShort,
    receivedFrom: normalized.receivedFrom,
    paymentLine1: normalized.paymentLine1,
    paymentLine2: normalized.paymentLine2,
    paymentMethod: normalized.paymentMethod,
    total: normalized.total,
    terbilang: normalized.terbilang,
    driverName: normalized.driverName,
    confirmedAt: normalized.confirmedAt,
    seriesCode: normalized.seriesCode,
    breakdown: {
      tol: normalized.tol ?? null,
      bensin: normalized.bensin ?? null,
      parkir: normalized.parkir ?? null,
      lain: normalized.lain ?? null,
    },
  };
}

function toLog(doc: LogDoc): ChatLog {
  return { id: doc._id, phone: doc.phone, direction: doc.direction, body: doc.body, createdAt: doc.createdAt };
}
