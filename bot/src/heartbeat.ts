import { database } from "./mongo.js";

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
  const db = await database();
  const at = new Date().toISOString();
  await db.collection<{ _id: string; at: string }>("meta").replaceOne({ _id: "heartbeat" }, { at }, { upsert: true });
}
