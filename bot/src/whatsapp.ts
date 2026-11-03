import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { loadAuthState, type PersistedAuth } from "./auth-state.js";
import { handleText } from "./handler.js";
import { lockPhone } from "./mutex.js";
import { lidText, mediaText } from "./messages.js";
import { normalizePhone } from "./phone.js";
import { logChat } from "./trips.js";

const logger = quietLogger();

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
    markOnlineOnConnect: true,
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
      void reconnect(loggedOut, code);
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

async function reconnect(loggedOut: boolean, code?: number): Promise<void> {
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
  const seconds = Math.round(delay / 1000);
  console.log(`[wa] ${closeReason(code)}. Sambung lagi dalam ${seconds} detik.`);
  setTimeout(() => {
    void openSocket().catch((error: unknown) => {
      console.error("[wa] gagal menyambung", error instanceof Error ? error.message : error);
      void reconnect(false);
    });
  }, delay);
}

type BaileysLogger = {
  level: string;
  child: (obj: Record<string, unknown>) => BaileysLogger;
  trace: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

function closeReason(code: number | undefined): string {
  switch (code) {
    case DisconnectReason.restartRequired:
      return "WhatsApp meminta sambungan baru";
    case DisconnectReason.loggedOut:
      return "perangkat tertaut dicabut";
    case DisconnectReason.connectionReplaced:
      return "sesi dibuka di tempat lain";
    case DisconnectReason.badSession:
      return "sesi rusak";
    case DisconnectReason.timedOut:
    case DisconnectReason.connectionLost:
      return "koneksi terputus";
    case DisconnectReason.connectionClosed:
      return "koneksi ditutup";
    default:
      return `koneksi berhenti${code ? ` (${code})` : ""}`;
  }
}

function quietLogger(): BaileysLogger {
  const logger: BaileysLogger = {
    level: "error",
    child: () => logger,
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: (obj, msg) => noteLibrary(obj, msg),
  };
  return logger;
}

function noteLibrary(obj: unknown, msg?: string): void {
  const record = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : undefined;
  const text = msg || (typeof obj === "string" ? obj : textOfRecord(record?.msg));
  if (!text || text === "stream errored out") return;
  if (text === "error in handling message") {
    console.log("[wa] satu pesan tidak bisa dibaca, dilewati");
    return;
  }
  if (text.includes("init queries")) {
    console.log("[wa] data awal WhatsApp lambat dibuka, bot tetap tersambung");
    return;
  }
  const detail = textOfRecord((record?.err as { message?: unknown } | undefined)?.message);
  console.error(detail ? `[wa] ${text}: ${detail}` : `[wa] ${text}`);
}

function textOfRecord(value: unknown): string {
  return typeof value === "string" ? value : "";
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
  const stopThinking = await showThinking(sender.replyJid);
  let seen = false;
  const markRead = async () => {
    if (seen) return;
    seen = true;
    await socket?.readMessages([message.key]).catch((error: unknown) => {
      console.error("[wa] gagal menandai pesan terbaca", error instanceof Error ? error.message : error);
    });
  };
  try {
    if (!text) {
      await markRead();
      await sendAndLog(sender.replyJid, sender.phone, mediaText());
      return;
    }
    await lockPhone(sender.phone, () =>
      handleText({
        replyJid: sender.replyJid,
        phone: sender.phone,
        text,
        send: async (body) => {
          await markRead();
          await sendAndLog(sender.replyJid, sender.phone, body);
        },
      }),
    );
  } finally {
    await markRead();
    await stopThinking();
  }
}

async function showThinking(jid: string): Promise<() => Promise<void>> {
  const beat = async () => {
    await socket?.sendPresenceUpdate("available");
    await socket?.presenceSubscribe(jid);
    await socket?.sendPresenceUpdate("composing", jid);
  };
  await beat().catch((error: unknown) => {
    console.error("[wa] gagal menampilkan sedang mengetik", error instanceof Error ? error.message : error);
  });
  const timer = setInterval(() => {
    void beat().catch(() => undefined);
  }, 8000);
  return async () => {
    clearInterval(timer);
    await socket?.sendPresenceUpdate("paused", jid).catch(() => undefined);
  };
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
  const pin = content.locationMessage || content.liveLocationMessage;
  if (pin) return locationText(pin);
  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    ""
  ).trim();
}

function locationText(pin: {
  degreesLatitude?: number | null;
  degreesLongitude?: number | null;
  name?: string | null;
  address?: string | null;
}): string {
  const pieces = [sharedAddress(pin.name, pin.address).join(", ")];
  if (typeof pin.degreesLatitude === "number" && typeof pin.degreesLongitude === "number") {
    pieces.push(`${pin.degreesLatitude.toFixed(6)}, ${pin.degreesLongitude.toFixed(6)}`);
  }
  return ["[lokasi WhatsApp]", ...pieces.filter(Boolean)].join(" ");
}

function sharedAddress(name?: string | null, address?: string | null): string[] {
  const raw = [name, address]
    .flatMap((part) => (part ?? "").split(","))
    .map((part) => part.trim())
    .filter((part) => part && !/^(id|indonesia)$/i.test(part));
  const unique: string[] = [];
  for (const part of raw) {
    if (!unique.some((item) => item.toLowerCase() === part.toLowerCase())) unique.push(part);
  }
  const postcode = unique.find((part) => /^\d{5}$/.test(part));
  const road = unique.find((part) => /\b(jl\.?|jalan)\b/i.test(part));
  const rest = unique.filter((part) => part !== postcode && part !== road);
  return [...rest, road, postcode].filter((part): part is string => Boolean(part));
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
