import { randomUUID } from "node:crypto";
import type { Draft, PaymentMethod } from "./draft.js";
import { database } from "./mongo.js";
import { createMutex } from "./mutex.js";
import {
  derivePaymentLine1,
  derivePaymentLine2,
  deriveReceivedFrom,
  deriveShortPlace,
  terbilangRupiah,
} from "./receipt.js";

export type Driver = {
  phone: string;
  name: string;
  active: boolean;
};

type SeriesDoc = {
  _id: string;
  code: string;
  status: string;
  tripId: string;
  usedAt: string;
};

type TripDoc = {
  _id: string;
  seriesCode: string;
  driverPhone: string;
  driverName: string;
  origin: string;
  originShort: string;
  destination: string;
  destinationShort: string;
  receivedFrom: string;
  paymentLine1: string;
  paymentLine2: string;
  paymentMethod: PaymentMethod;
  total: number;
  terbilang: string;
  tol: number | null;
  bensin: number | null;
  parkir: number | null;
  lain: number | null;
  confirmedAt: string;
  sourceText: string;
  searchText: string;
};

const claimLock = createMutex();

export async function getDriver(phone: string): Promise<Driver | null> {
  const db = await database();
  const row = await db.collection<Driver & { _id: string }>("drivers").findOne({ _id: phone });
  if (!row) return null;
  return { phone: row.phone || row._id, name: row.name, active: Boolean(row.active) };
}

export async function logChat(phone: string, direction: "in" | "out", body: string): Promise<void> {
  const db = await database();
  await db.collection<{
    _id: string;
    phone: string;
    direction: "in" | "out";
    body: string;
    createdAt: string;
  }>("chat_logs").insertOne({
    _id: randomUUID(),
    phone,
    direction,
    body: body.slice(0, 8000),
    createdAt: new Date().toISOString(),
  });
}

export async function confirmTrip(input: {
  phone: string;
  driverName: string;
  draft: Draft;
  sourceText: string;
}): Promise<string> {
  return claimLock(async () => {
    const db = await database();
    const tripId = randomUUID();
    const confirmedAt = new Date().toISOString();
    const series = await db.collection<SeriesDoc>("series").findOneAndUpdate(
      { status: "available" },
      { $set: { status: "used", tripId, usedAt: confirmedAt } },
      { sort: { sequence: 1 }, returnDocument: "after" },
    );
    if (!series) {
      const error = new Error("NO_SERIES");
      error.name = "NO_SERIES";
      throw error;
    }
    try {
      await db.collection<TripDoc>("trips").insertOne(tripData(input, series.code || series._id, tripId, confirmedAt));
    } catch (error) {
      await db
        .collection<SeriesDoc>("series")
        .updateOne({ _id: series._id }, { $set: { status: "available", tripId: "", usedAt: "" } })
        .catch((revertError: unknown) => {
          console.error("[series] gagal mengembalikan nomor", series.code, revertError);
        });
      throw error;
    }
    return series.code || series._id;
  });
}

function tripData(
  input: { phone: string; driverName: string; draft: Draft; sourceText: string },
  seriesCode: string,
  tripId: string,
  confirmedAt: string,
): TripDoc {
  const draft = input.draft;
  const origin = draft.origin ?? "";
  const destination = draft.destination ?? "";
  const originShort = draft.originShort || deriveShortPlace(origin);
  const destinationShort = draft.destinationShort || deriveShortPlace(destination);
  const receivedFrom = deriveReceivedFrom(draft.receivedFrom, originShort);
  const paymentLine1 = derivePaymentLine1(draft.paymentLine1);
  const paymentLine2 = derivePaymentLine2(draft.paymentLine2, originShort, destinationShort);
  const paymentMethod: PaymentMethod = draft.paymentMethod === "transfer" ? "transfer" : "cash";
  const total = draft.total ?? 0;
  const terbilang = terbilangRupiah(total);

  return {
    _id: tripId,
    seriesCode,
    driverPhone: input.phone,
    driverName: input.driverName,
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
    tol: draft.breakdown.tol ?? null,
    bensin: draft.breakdown.bensin ?? null,
    parkir: draft.breakdown.parkir ?? null,
    lain: draft.breakdown.lain ?? null,
    confirmedAt,
    sourceText: input.sourceText.slice(0, 8000),
    searchText: [
      seriesCode,
      input.driverName,
      input.phone,
      receivedFrom,
      originShort,
      origin,
      destinationShort,
      destination,
      paymentLine1,
      paymentLine2,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .slice(0, 800),
  };
}

export function isNoSeries(error: unknown): boolean {
  return error instanceof Error && error.name === "NO_SERIES";
}
