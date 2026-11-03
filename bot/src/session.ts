import { database } from "./mongo.js";
import { sanitizeDraft, type Draft } from "./draft.js";

export type SessionState = "idle" | "awaiting_missing" | "awaiting_confirm";

export type Session = {
  state: SessionState;
  buffer: string[];
  draft: Draft | null;
  committedSeries: string | null;
};

type SessionDoc = {
  _id: string;
  state: string;
  buffer: string;
  draft: string;
  committedSeries: string;
};

export function emptySession(): Session {
  return { state: "idle", buffer: [], draft: null, committedSeries: null };
}

export async function loadSession(phone: string): Promise<Session> {
  const db = await database();
  const row = await db.collection<SessionDoc>("chat_sessions").findOne({ _id: phone });
  if (!row) return emptySession();
  return decodeSession(row);
}

export async function saveSession(phone: string, session: Session): Promise<void> {
  const db = await database();
  await db.collection<SessionDoc>("chat_sessions").replaceOne(
    { _id: phone },
    {
      state: session.state,
      buffer: JSON.stringify(session.buffer.slice(-15)),
      draft: JSON.stringify(session.draft),
      committedSeries: session.committedSeries ?? "",
    },
    { upsert: true },
  );
}

function decodeSession(row: SessionDoc): Session {
  let draft: Draft | null = null;
  if (row.draft && row.draft !== "null") {
    try {
      draft = sanitizeDraft(row.draft);
    } catch {
      draft = null;
    }
  }
  const committed = row.committedSeries || "";
  return {
    state: row.state === "awaiting_missing" || row.state === "awaiting_confirm" ? row.state : "idle",
    buffer: parseBuffer(row.buffer),
    draft,
    committedSeries: committed || null,
  };
}

function parseBuffer(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(-15);
  } catch {
    return [];
  }
}
