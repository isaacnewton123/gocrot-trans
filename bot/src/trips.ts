import { ID, Query } from "node-appwrite";
import { ids, tablesDB } from "./appwrite.js";
import type { Draft } from "./draft.js";
import { isNotFound } from "./errors.js";
import { createMutex } from "./mutex.js";

export type Driver = {
  $id: string;
  phone: string;
  name: string;
  active: boolean;
};

type SeriesRow = {
  $id: string;
  code: string;
  status: string;
};

const claimLock = createMutex();

export async function getDriver(phone: string): Promise<Driver | null> {
  try {
    const row = (await tablesDB.getRow({
      databaseId: ids.databaseId,
      tableId: ids.drivers,
      rowId: phone,
    })) as unknown as Driver;
    return row;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function logChat(phone: string, direction: "in" | "out", body: string): Promise<void> {
  await tablesDB.createRow({
    databaseId: ids.databaseId,
    tableId: ids.chatLogs,
    rowId: ID.unique(),
    data: {
      phone,
      direction,
      body: body.slice(0, 8000),
    },
  });
}

export async function confirmTrip(input: {
  phone: string;
  driverName: string;
  draft: Draft;
  sourceText: string;
}): Promise<string> {
  return claimLock(async () => {
    const series = await claimNextSeries();
    const tripId = ID.unique();
    const confirmedAt = new Date().toISOString();
    try {
      await tablesDB.updateRow({
        databaseId: ids.databaseId,
        tableId: ids.series,
        rowId: series.$id,
        data: {
          status: "used",
          tripId,
          usedAt: confirmedAt,
        },
      });
      await tablesDB.createRow({
        databaseId: ids.databaseId,
        tableId: ids.trips,
        rowId: tripId,
        data: tripData(input, series.code, confirmedAt),
      });
    } catch (error) {
      await tablesDB
        .updateRow({
          databaseId: ids.databaseId,
          tableId: ids.series,
          rowId: series.$id,
          data: { status: "available", tripId: "", usedAt: "" },
        })
        .catch((revertError: unknown) => {
          console.error("[series] gagal mengembalikan nomor", series.code, revertError);
        });
      throw error;
    }
    return series.code;
  });
}

async function claimNextSeries(): Promise<SeriesRow> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const page = await tablesDB.listRows({
      databaseId: ids.databaseId,
      tableId: ids.series,
      queries: [
        Query.equal("status", "available"),
        Query.orderAsc("sequence"),
        Query.limit(5),
      ],
    });
    const candidates = page.rows as unknown as SeriesRow[];
    if (!candidates.length) {
      const error = new Error("NO_SERIES");
      error.name = "NO_SERIES";
      throw error;
    }
    for (const candidate of candidates) {
      const fresh = (await tablesDB.getRow({
        databaseId: ids.databaseId,
        tableId: ids.series,
        rowId: candidate.$id,
      })) as unknown as SeriesRow;
      if (fresh.status !== "available") continue;
      return fresh;
    }
  }
  const error = new Error("NO_SERIES");
  error.name = "NO_SERIES";
  throw error;
}

function tripData(
  input: { phone: string; driverName: string; draft: Draft; sourceText: string },
  seriesCode: string,
  confirmedAt: string,
) {
  const draft = input.draft;
  const data: Record<string, string | number> = {
    seriesCode,
    driverPhone: input.phone,
    driverName: input.driverName,
    origin: draft.origin ?? "",
    destination: draft.destination ?? "",
    total: draft.total ?? 0,
    confirmedAt,
    sourceText: input.sourceText.slice(0, 8000),
    searchText: [seriesCode, input.driverName, input.phone, draft.origin, draft.destination]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .slice(0, 500),
  };
  if (draft.breakdown.tol != null) data.tol = draft.breakdown.tol;
  if (draft.breakdown.bensin != null) data.bensin = draft.breakdown.bensin;
  if (draft.breakdown.parkir != null) data.parkir = draft.breakdown.parkir;
  if (draft.breakdown.lain != null) data.lain = draft.breakdown.lain;
  return data;
}

export function isNoSeries(error: unknown): boolean {
  return error instanceof Error && error.name === "NO_SERIES";
}
