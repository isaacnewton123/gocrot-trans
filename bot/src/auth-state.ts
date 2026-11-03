import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
} from "@whiskeysockets/baileys";
import { database } from "./mongo.js";

type KeyBag = Record<string, Record<string, unknown>>;

const DEBOUNCE_MS = 300;
const AUTH_ID = "baileys-auth";

export type PersistedAuth = {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  flush: () => Promise<void>;
  clear: () => Promise<void>;
};

export async function loadAuthState(): Promise<PersistedAuth> {
  const keys: KeyBag = {};
  let creds: AuthenticationCreds = initAuthCreds();

  const db = await database();
  const existing = await db.collection<{ _id: string; payload: string }>("wa_auth").findOne({ _id: AUTH_ID });
  if (!existing?.payload) {
    console.log("[wa] belum ada sesi. QR akan muncul di log.");
  } else {
    const parsed = JSON.parse(existing.payload, BufferJSON.reviver) as {
      creds?: AuthenticationCreds;
      keys?: KeyBag;
    };
    if (!parsed.creds) throw new Error("Berkas sesi WhatsApp rusak");
    creds = parsed.creds;
    Object.assign(keys, parsed.keys ?? {});
    console.log("[wa] sesi dimuat dari MongoDB");
  }

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, idsToRead) => {
        const values: Record<string, unknown> = {};
        for (const id of idsToRead) {
          let value = keys[type]?.[id];
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value as Record<string, unknown>);
          }
          if (value) values[id] = value;
        }
        return values;
      },
      set: async (data: SignalDataSet) => {
        for (const category of Object.keys(data)) {
          const bucket = (keys[category] ??= {});
          const entries = data[category as keyof SignalDataSet];
          if (!entries) continue;
          for (const id of Object.keys(entries)) {
            const value = entries[id];
            if (value) bucket[id] = value;
            else delete bucket[id];
          }
        }
        schedule();
      },
    } as AuthenticationState["keys"],
  };

  let timer: NodeJS.Timeout | undefined;
  let chain: Promise<void> = Promise.resolve();
  let allowSave = true;

  const persist = () => {
    if (!allowSave) return chain;
    const payload = JSON.stringify({ creds: state.creds, keys }, BufferJSON.replacer);
    chain = chain
      .then(async () => {
        const store = await database();
        await store
          .collection<{ _id: string; payload: string }>("wa_auth")
          .replaceOne({ _id: AUTH_ID }, { payload }, { upsert: true });
      })
      .catch((error: unknown) => {
        console.error("[wa] gagal menyimpan sesi", error);
      });
    return chain;
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void persist();
    }, DEBOUNCE_MS);
  };

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    await persist();
  };

  return {
    state,
    saveCreds: flush,
    flush,
    clear: async () => {
      allowSave = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
      await chain;
      state.creds = initAuthCreds();
      for (const category of Object.keys(keys) as Array<keyof KeyBag>) delete keys[category];
      const store = await database();
      await store.collection<{ _id: string; payload: string }>("wa_auth").deleteOne({ _id: AUTH_ID });
      allowSave = true;
      console.log("[wa] sesi dihapus. Scan QR baru.");
    },
  };
}
