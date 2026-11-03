import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { loadAuthState, type PersistedAuth } from "./auth-state.js";
import { handleText } from "./handler.js";
import { lockPhone } from "./mutex.js";
import { lidText, mediaText } from "./messages.js";
import { normalizePhone } from "./phone.js";
import { logChat } from "./trips.js";

const logger = pino({ level: "error" });

let socket: WASocket | undefined;
let auth: PersistedAuth | undefined;
let generation = 0;
let attempt = 0;

export async function startWhatsApp(): Promise<void> {
  if (!auth) auth = await loadAuthState();
  await openSocket();
}

export async function flushAuth(): Promise<void> {
  await auth?.flush();
}

async function openSocket(): Promise<void> {
  if (!auth) return;
  const gen = ++generation;
  const previous = socket;
  socket = undefined;
  previous?.end(undefined);

  let version: [number, number, number] | undefined;
  try {
    version = (await fetchLatestBaileysVersion()).version;
  } catch (error) {
    console.warn("[wa] versi bawaan dipakai", error);
  }
  if (gen !== generation) return;

  const current = auth;
  const sock = makeWASocket({
    version,
    auth: current.state,
    logger,
    browser: Browsers.ubuntu("Gocrot"),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    shouldSyncHistoryMessage: () => false,
  });
  if (gen !== generation) {
    sock.end(undefined);
    return;
  }
  socket = sock;

  sock.ev.on("creds.update", () => {
    void current.saveCreds();
  });

  sock.ev.on("connection.update", (update) => {
    if (gen !== generation) return;
    if (update.qr) printQr(update.qr);
    if (update.connection === "open") {
      attempt = 0;
      console.log("[wa] terhubung");
      void current.flush();
    }
    if (update.connection === "close") {
      const code = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[wa] putus (${code ?? "?"})`);
      void reconnect(loggedOut);
    }
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (gen !== generation || type !== "notify") return;
    for (const message of messages) {
      void onMessage(message).catch((error: unknown) => {
        console.error("[wa] pesan gagal diproses", error);
      });
    }
  });
}

async function reconnect(loggedOut: boolean): Promise<void> {
  if (loggedOut) {
    try {
      await auth?.clear();
    } catch (error) {
      console.error("[wa] gagal menghapus sesi", error);
    }
    auth = undefined;
    try {
      auth = await loadAuthState();
    } catch (error) {
      console.error("[wa] gagal menyiapkan sesi baru", error);
      return;
    }
    attempt = 0;
  }
  const delay = loggedOut ? 3000 : Math.min(60_000, 1000 * 2 ** attempt);
  attempt += 1;
  console.log(`[wa] sambung lagi dalam ${Math.round(delay / 1000)} detik`);
  setTimeout(() => {
    void openSocket().catch((error: unknown) => {
      console.error("[wa] gagal menyambung", error);
      void reconnect(false);
    });
  }, delay);
}

async function onMessage(message: WAMessage): Promise<void> {
  if (message.key.fromMe) return;
  const stamp = messageTime(message);
  if (Date.now() - stamp > 10 * 60 * 1000) return;

  const remote = message.key.remoteJid || "";
  if (!remote || remote.endsWith("@g.us") || remote === "status@broadcast" || remote.endsWith("@newsletter")) {
    return;
  }

  const sender = resolveSender(message);
  const text = textOf(message);
  if (!sender) {
    if (text) await socket?.sendMessage(remote, { text: lidText() });
    return;
  }
  if (!text) {
    await sendAndLog(sender.replyJid, sender.phone, mediaText());
    return;
  }

  await lockPhone(sender.phone, () =>
    handleText({
      replyJid: sender.replyJid,
      phone: sender.phone,
      text,
      send: (body) => sendAndLog(sender.replyJid, sender.phone, body),
    }),
  );
}

function resolveSender(message: WAMessage): { replyJid: string; phone: string } | null {
  const remote = message.key.remoteJid || "";
  const candidates = [remote, message.key.senderPn || ""];
  const phoneJid = candidates.find((jid) => jid.endsWith("@s.whatsapp.net"));
  if (!phoneJid) return null;
  const phone = normalizePhone(phoneJid.split("@")[0].split(":")[0]);
  if (!phone) return null;
  return { replyJid: remote, phone };
}

function textOf(message: WAMessage): string {
  const content = message.message;
  if (!content) return "";
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ""
  ).trim();
}

function messageTime(message: WAMessage): number {
  const raw = message.messageTimestamp as { toNumber?: () => number } | number | null | undefined;
  if (typeof raw === "number") return raw * 1000;
  if (raw && typeof raw.toNumber === "function") return raw.toNumber() * 1000;
  return Date.now();
}

function printQr(qr: string): void {
  console.log("\n[wa] Scan QR ini di WhatsApp > Perangkat tertaut\n");
  qrcode.generate(qr, { small: true });
}

async function sendAndLog(jid: string, phone: string, text: string): Promise<void> {
  if (!socket) throw new Error("WhatsApp belum terhubung");
  await socket.sendMessage(jid, { text });
  await logChat(phone, "out", text).catch((error: unknown) => {
    console.error("[log] gagal menyimpan pesan keluar", error);
  });
}
