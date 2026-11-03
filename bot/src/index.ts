import express from "express";
import { appwriteReady, config } from "./config.js";
import { maybeBeat } from "./heartbeat.js";
import { flushAuth, startWhatsApp } from "./whatsapp.js";

const app = express();
app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
  if (appwriteReady()) maybeBeat();
});

app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("gocrot-bot");
});

const server = app.listen(config.port, () => {
  console.log(`[http] mendengarkan port ${config.port}`);
});

if (!appwriteReady()) {
  console.error(
    "[boot] APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, dan APPWRITE_API_KEY wajib diisi. WhatsApp belum dijalankan.",
  );
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
