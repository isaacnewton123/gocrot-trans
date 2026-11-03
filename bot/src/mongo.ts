import { setServers } from "node:dns";
import { MongoClient, type Db } from "mongodb";

type Slot = { ready?: Promise<Db> };

const globalMongo = globalThis as typeof globalThis & { __gocrotBotMongo?: Slot };

export async function database(): Promise<Db> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI belum diisi.");
  if (!globalMongo.__gocrotBotMongo) globalMongo.__gocrotBotMongo = {};
  const slot = globalMongo.__gocrotBotMongo;
  if (!slot.ready) {
    // Router di jaringan ini menolak query SRV lewat alamat IPv6 lokal.
    setServers(["1.1.1.1", "8.8.8.8"]);
    const client = new MongoClient(uri);
    slot.ready = client.connect().then(async (connected) => {
      const db = connected.db();
      await Promise.all([
        db.collection("drivers").createIndex({ name: 1 }),
        db.collection("series").createIndex({ status: 1, sequence: 1 }),
        db.collection("trips").createIndex({ seriesCode: 1 }),
        db.collection("trips").createIndex({ confirmedAt: -1 }),
        db.collection("chat_logs").createIndex({ phone: 1, createdAt: -1 }),
        db.collection("chat_logs").createIndex({ createdAt: -1 }),
      ]);
      return db;
    });
  }
  return slot.ready;
}
