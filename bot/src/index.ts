import express from "express";
import { config, mongoReady } from "./config.js";
import { maybeBeat } from "./heartbeat.js";
import { flushAuth, startWhatsApp } from "./whatsapp.js";

const app = express();
app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
  if (mongoReady()) maybeBeat();
});

app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("gocrot-bot");
});

const server = app.listen(config.port, () => {
  console.log(`[http] mendengarkan port ${config.port}`);
});

if (!mongoReady()) {
  console.error("[boot] MONGODB_URI wajib diisi. WhatsApp belum dijalankan.");
} else {
  void startWhatsApp().catch((error: unknown) => {
    console.error("[boot] WhatsApp gagal dimulai", error);
  });
}

async function shutdown(): Promise<void> {
  console.log("[boot] menyimpan sesi sebelum berhenti");
  await flushAuth().catch((error: unknown) => {
    console.error("[boot] gagal menyimpan sesi", error);
  });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
}

process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});
