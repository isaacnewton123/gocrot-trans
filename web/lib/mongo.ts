import { MongoClient, type Db } from "mongodb";

type Slot = { client?: MongoClient; ready?: Promise<Db> };

const globalMongo = globalThis as typeof globalThis & { __gocrotMongo?: Slot };

export async function database(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI belum diisi.");
  if (!globalMongo.__gocrotMongo) globalMongo.__gocrotMongo = {};
  const slot = globalMongo.__gocrotMongo;
  if (!slot.ready) {
    const client = new MongoClient(uri);
    slot.client = client;
    slot.ready = client.connect().then(async (connected) => {
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
    });
  }
  return slot.ready;
}

export function failMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan.";
}
