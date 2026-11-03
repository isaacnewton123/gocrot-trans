import "../src/config.js";
import { database } from "../src/mongo.js";

async function main() {
  const db = await database();
  const waAuth = await db.collection("wa_auth").deleteMany({});
  const chatSessions = await db.collection("chat_sessions").deleteMany({});
  console.log(`[wa] Sesi auth dihapus (${waAuth.deletedCount}) & sesi chat direset (${chatSessions.deletedCount}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[wa] Gagal menghapus sesi:", err);
  process.exit(1);
});

