import { ids, tablesDB } from "./appwrite.js";
import { sanitizeDraft, type Draft } from "./draft.js";
import { isNotFound } from "./errors.js";

export type SessionState = "idle" | "awaiting_missing" | "awaiting_confirm";

export type Session = {
  state: SessionState;
  buffer: string[];
  draft: Draft | null;
  committedSeries: string | null;
};

export function emptySession(): Session {
  return { state: "idle", buffer: [], draft: null, committedSeries: null };
}

export async function loadSession(phone: string): Promise<Session> {
  try {
    const row = await tablesDB.getRow({
      databaseId: ids.databaseId,
      tableId: ids.sessions,
      rowId: phone,
    });
    return decodeSession(row);
  } catch (error) {
    if (isNotFound(error)) return emptySession();
    throw error;
  }
}

export async function saveSession(phone: string, session: Session): Promise<void> {
  const data = {
    state: session.state,
    buffer: JSON.stringify(session.buffer.slice(-15)),
    draft: JSON.stringify(session.draft),
    committedSeries: session.committedSeries ?? "",
  };
  try {
    await tablesDB.updateRow({
      databaseId: ids.databaseId,
      tableId: ids.sessions,
      rowId: phone,
      data,
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await tablesDB.createRow({
      databaseId: ids.databaseId,
      tableId: ids.sessions,
      rowId: phone,
      data,
    });
  }
}

function decodeSession(row: Record<string, unknown>): Session {
  const buffer = parseBuffer(row.buffer);
  let draft: Draft | null = null;
  if (typeof row.draft === "string" && row.draft && row.draft !== "null") {
    try {
      draft = sanitizeDraft(row.draft);
    } catch {
      draft = null;
    }
  }
  const state = row.state;
  const committed = typeof row.committedSeries === "string" ? row.committedSeries : "";
  return {
    state:
      state === "awaiting_missing" || state === "awaiting_confirm" ? state : "idle",
    buffer,
    draft,
    committedSeries: committed || null,
  };
}

function parseBuffer(value: unknown): string[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(-15);
  } catch {
    return [];
  }
}
