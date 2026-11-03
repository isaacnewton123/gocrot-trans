import { ids, tablesDB } from "./appwrite.js";
import { isNotFound } from "./errors.js";

let lastBeat = 0;

export function maybeBeat(): void {
  if (Date.now() - lastBeat < 9 * 60 * 1000) return;
  lastBeat = Date.now();
  void touch().catch((error: unknown) => {
    console.error("[heartbeat] gagal", error);
    lastBeat = 0;
  });
}

async function touch(): Promise<void> {
  const data = { at: new Date().toISOString() };
  try {
    await tablesDB.updateRow({
      databaseId: ids.databaseId,
      tableId: ids.meta,
      rowId: "heartbeat",
      data,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await tablesDB.createRow({
      databaseId: ids.databaseId,
      tableId: ids.meta,
      rowId: "heartbeat",
      data,
    });
  }
}
