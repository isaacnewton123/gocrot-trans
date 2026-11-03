import { setServers } from "node:dns";
import { MongoClient, type Db } from "mongodb";

type Slot = { client?: MongoClient; ready?: Promise<Db> };

const globalMongo = globalThis as typeof globalThis & { __gocrotMongoV2?: Slot };

export async function database(): Promise<Db> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI belum diisi.");
  if (!globalMongo.__gocrotMongoV2) globalMongo.__gocrotMongoV2 = {};
  const slot = globalMongo.__gocrotMongoV2;
  if (!slot.ready) {
    // Router di jaringan ini menolak query SRV lewat alamat IPv6 lokal.
    try {
      setServers(["1.1.1.1", "8.8.8.8"]);
    } catch {
      // Abaikan jika gagal menyetel DNS server
    }
    const client = new MongoClient(uri);
    slot.client = client;
    slot.ready = client
      .connect()
      .then(async (connected) => {
        const db = connected.db();
        await Promise.all([
          db.collection("drivers").createIndex({ name: 1 }),
          db.collection("series").createIndex({ status: 1, sequence: 1 }),
          db.collection("series").createIndex({ prefix: 1 }),
          db.collection("trips").createIndex({ seriesCode: 1 }),
          db.collection("trips").createIndex({ driverPhone: 1, confirmedAt: -1 }),
          db.collection("trips").createIndex({ confirmedAt: -1 }),
          db.collection("chat_logs").createIndex({ createdAt: -1 }),
          db.collection("chat_logs").createIndex({ phone: 1, createdAt: -1 }),
        ]);
        return db;
      })
      .catch((err) => {
        slot.ready = undefined;
        slot.client = undefined;
        throw err;
      });
  }
  return slot.ready;
}

export function failMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan.";
}
