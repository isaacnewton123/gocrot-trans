import { config } from "./config.js";
import type { Draft } from "./draft.js";
import { extractTrip } from "./ai.js";
import { intentOf, isCancel, isGreeting } from "./intent.js";
import {
  aiErrorText,
  discardText,
  genericErrorText,
  helpText,
  missingText,
  noSeriesText,
  rateLimitText,
  successText,
  summaryText,
  unregisteredText,
} from "./messages.js";
import { choiceReply, groundPlaces } from "./places.js";
import { emptySession, loadSession, saveSession, type Session } from "./session.js";
import { confirmTrip, getDriver, isNoSeries, logChat } from "./trips.js";

const recentAi = new Map<string, number[]>();

export async function handleText(input: {
  replyJid: string;
  phone: string;
  text: string;
  send: (text: string) => Promise<void>;
}): Promise<void> {
  const text = input.text.trim().slice(0, 1000);
  if (!text) return;

  await logChat(input.phone, "in", text).catch((error: unknown) => {
    console.error("[log] gagal menyimpan pesan masuk", error);
  });

  try {
    await route(input.replyJid, input.phone, text, input.send);
  } catch (error) {
    console.error("[bot] gagal memproses pesan", error);
    await input.send(genericErrorText()).catch(() => undefined);
  }
}

async function route(
  replyJid: string,
  phone: string,
  text: string,
  send: (text: string) => Promise<void>,
): Promise<void> {
  void replyJid;
  const driver = await getDriver(phone);
  if (!driver?.active) {
    await send(unregisteredText());
    return;
  }

  if (isCancel(text)) {
    const current = await loadSession(phone);
    await saveSession(phone, emptySession());
    if (current.committedSeries) {
      await send(`${successText(current.committedSeries, config.publicUrl)}\n\nSesi ditutup. Perjalanan tadi tetap tercatat.`);
      return;
    }
    await send(discardText());
    return;
  }

  const session = await loadSession(phone);
  if (session.committedSeries) {
    await send(successText(session.committedSeries, config.publicUrl));
    if (intentOf(text) === "yes") await saveSession(phone, emptySession());
    return;
  }

  if (session.state === "awaiting_confirm") {
    const intent = intentOf(text);
    if (intent === "yes") {
      await confirm(phone, session, driver.name, send);
      return;
    }
    if (intent === "no") {
      await saveSession(phone, emptySession());
      await send(discardText());
      return;
    }
  } else if (session.state === "idle" && isGreeting(text)) {
    await send(helpText());
    return;
  }

  if (!allowAi(phone)) {
    await send(rateLimitText());
    return;
  }

  session.buffer = [...session.buffer, choiceReply(session.draft?.choices, text) ?? text].slice(-15);
  session.committedSeries = null;
  let draft: Draft;
  try {
    draft = await extractTrip(session.buffer);
  } catch (error) {
    console.error("[ai] ekstraksi gagal", error);
    session.state = session.buffer.length ? "awaiting_missing" : "idle";
    await saveSession(phone, session);
    await send(aiErrorText());
    return;
  }

  draft = await groundPlaces(draft, session.buffer);
  session.draft = draft;
  if (draft.question || draft.missing.length || draft.total == null || !draft.origin || !draft.destination) {
    session.state = "awaiting_missing";
    await saveSession(phone, session);
    await send(missingText(draft));
    return;
  }

  session.state = "awaiting_confirm";
  await saveSession(phone, session);
  await send(summaryText(draft));
}

async function confirm(
  phone: string,
  session: Session,
  driverName: string,
  send: (text: string) => Promise<void>,
): Promise<void> {
  const draft = session.draft;
  if (!draft?.origin || !draft.destination || draft.total == null || draft.missing.length) {
    session.state = "awaiting_missing";
    await saveSession(phone, session);
    await send(missingText(draft ?? emptyDraft()));
    return;
  }

  try {
    const code = await confirmTrip({
      phone,
      driverName,
      draft,
      sourceText: session.buffer.join("\n"),
    });
    session.committedSeries = code;
    session.state = "awaiting_confirm";
    await saveSession(phone, session);
    await send(successText(code, config.publicUrl));
    await saveSession(phone, emptySession());
  } catch (error) {
    if (isNoSeries(error)) {
      await send(noSeriesText());
      return;
    }
    throw error;
  }
}

function emptyDraft(): Draft {
  return {
    origin: null,
    destination: null,
    total: null,
    breakdown: { tol: null, bensin: null, parkir: null, lain: null },
    confidence: "low",
    missing: ["origin", "destination", "total"],
    question: null,
    choices: null,
  };
}

function allowAi(phone: string): boolean {
  const now = Date.now();
  const recent = (recentAi.get(phone) ?? []).filter((stamp) => now - stamp < 5 * 60 * 1000);
  if (recent.length >= 12) {
    recentAi.set(phone, recent);
    return false;
  }
  recent.push(now);
  recentAi.set(phone, recent);
  return true;
}
