import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
} from "@whiskeysockets/baileys";
import { InputFile } from "node-appwrite/file";
import { ids, storage } from "./appwrite.js";
import { isNotFound } from "./errors.js";

type KeyBag = Record<string, Record<string, unknown>>;

const DEBOUNCE_MS = 1500;

export type PersistedAuth = {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  flush: () => Promise<void>;
  clear: () => Promise<void>;
};

export async function loadAuthState(): Promise<PersistedAuth> {
  const keys: KeyBag = {};
  let creds: AuthenticationCreds = initAuthCreds();

  try {
    const downloaded = await storage.getFileDownload({
      bucketId: ids.bucketId,
      fileId: ids.authFileId,
    });
    const parsed = JSON.parse(Buffer.from(downloaded).toString("utf8"), BufferJSON.reviver) as {
      creds?: AuthenticationCreds;
      keys?: KeyBag;
    };
    if (!parsed.creds) throw new Error("Berkas sesi WhatsApp rusak");
    creds = parsed.creds;
    Object.assign(keys, parsed.keys ?? {});
    console.log("[wa] sesi dimuat dari Appwrite Storage");
  } catch (error) {
    if (!isNotFound(error)) throw error;
    console.log("[wa] belum ada sesi. QR akan muncul di log.");
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
    const payload = Buffer.from(
      JSON.stringify({ creds: state.creds, keys }, BufferJSON.replacer),
      "utf8",
    );
    chain = chain
      .then(async () => {
        try {
          await storage.deleteFile({ bucketId: ids.bucketId, fileId: ids.authFileId });
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }
        await storage.createFile({
          bucketId: ids.bucketId,
          fileId: ids.authFileId,
          file: InputFile.fromBuffer(payload, "baileys-auth.json"),
        });
      })
      .catch((error: unknown) => {
        console.error("[wa] gagal menyimpan sesi ke Appwrite", error);
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
      try {
        await storage.deleteFile({ bucketId: ids.bucketId, fileId: ids.authFileId });
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
      allowSave = true;
      console.log("[wa] sesi dihapus. Scan QR baru.");
    },
  };
}
