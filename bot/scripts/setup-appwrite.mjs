import { existsSync, readFileSync } from "node:fs";
import { Client, Compression, Permission, Role, Storage, TablesDB } from "node-appwrite";

loadEnv(new URL("../.env", import.meta.url));

const endpoint = required("APPWRITE_ENDPOINT");
const projectId = required("APPWRITE_PROJECT_ID");
const apiKey = required("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID?.trim() || "main";
const bucketId = process.env.APPWRITE_BUCKET_ID?.trim() || "baileys-auth";

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

const adminPermissions = [
  Permission.read(Role.label("admin")),
  Permission.create(Role.label("admin")),
  Permission.update(Role.label("admin")),
  Permission.delete(Role.label("admin")),
];

const tables = [
  {
    id: "drivers",
    name: "Pengemudi",
    columns: async (tableId) => {
      await varchar(tableId, "phone", 16, true);
      await varchar(tableId, "name", 120, true);
      await bool(tableId, "active", true);
      await varchar(tableId, "note", 200, false);
    },
    indexes: [],
  },
  {
    id: "series",
    name: "Nomor seri",
    columns: async (tableId) => {
      await varchar(tableId, "code", 16, true);
      await varchar(tableId, "prefix", 8, true);
      await integer(tableId, "suffix", true, 1, 9999);
      await integer(tableId, "sequence", true, 1);
      await varchar(tableId, "status", 16, true);
      await varchar(tableId, "tripId", 36, false);
      await varchar(tableId, "blockedReason", 200, false);
      await varchar(tableId, "usedAt", 40, false);
    },
    indexes: [
      { key: "status_seq", type: "key", columns: ["status", "sequence"], orders: ["ASC", "ASC"] },
      { key: "seq", type: "key", columns: ["sequence"], orders: ["DESC"] },
      { key: "prefix", type: "key", columns: ["prefix"], orders: ["ASC"] },
    ],
  },
  {
    id: "trips",
    name: "Perjalanan",
    columns: async (tableId) => {
      await varchar(tableId, "seriesCode", 16, true);
      await varchar(tableId, "driverPhone", 16, true);
      await varchar(tableId, "driverName", 120, true);
      await varchar(tableId, "origin", 180, true);
      await varchar(tableId, "destination", 180, true);
      await integer(tableId, "total", true, 1, 2_000_000_000);
      await integer(tableId, "tol", false, 0, 2_000_000_000);
      await integer(tableId, "bensin", false, 0, 2_000_000_000);
      await integer(tableId, "parkir", false, 0, 2_000_000_000);
      await integer(tableId, "lain", false, 0, 2_000_000_000);
      await varchar(tableId, "confirmedAt", 40, true);
      await mediumtext(tableId, "sourceText", true);
      await varchar(tableId, "searchText", 500, true);
    },
    indexes: [
      { key: "series_code", type: "unique", columns: ["seriesCode"] },
      { key: "driver_time", type: "key", columns: ["driverPhone", "$createdAt"], orders: ["ASC", "DESC"] },
      { key: "search_text", type: "fulltext", columns: ["searchText"] },
    ],
  },
  {
    id: "chat_logs",
    name: "Log chat",
    columns: async (tableId) => {
      await varchar(tableId, "phone", 16, true);
      await varchar(tableId, "direction", 3, true);
      await mediumtext(tableId, "body", true);
    },
    indexes: [{ key: "phone_time", type: "key", columns: ["phone", "$createdAt"], orders: ["ASC", "DESC"] }],
  },
  {
    id: "sessions",
    name: "Sesi bot",
    columns: async (tableId) => {
      await varchar(tableId, "state", 32, true);
      await mediumtext(tableId, "buffer", true);
      await mediumtext(tableId, "draft", true);
      await varchar(tableId, "committedSeries", 16, false);
    },
    indexes: [],
  },
  {
    id: "admins",
    name: "Admin",
    columns: async (tableId) => {
      await varchar(tableId, "name", 120, true);
      await varchar(tableId, "email", 254, true);
      await bool(tableId, "active", true);
    },
    indexes: [],
  },
  {
    id: "meta",
    name: "Meta",
    columns: async (tableId) => {
      await varchar(tableId, "at", 40, true);
    },
    indexes: [],
  },
];

await ensure("database", () =>
  tablesDB.create({ databaseId, name: "Gocrot", enabled: true }),
);

for (const table of tables) {
  await ensure(`tabel ${table.id}`, () =>
    tablesDB.createTable({
      databaseId,
      tableId: table.id,
      name: table.name,
      permissions: adminPermissions,
      rowSecurity: false,
      enabled: true,
    }),
  );
  await table.columns(table.id);
  await waitUntilReady(table.id);
  for (const index of table.indexes) {
    await ensure(`indeks ${table.id}.${index.key}`, () =>
      tablesDB.createIndex({
        databaseId,
        tableId: table.id,
        key: index.key,
        type: index.type,
        columns: index.columns,
        orders: index.orders,
      }),
    );
  }
  await waitUntilReady(table.id);
}

await ensure("bucket baileys-auth", () =>
  storage.createBucket({
    bucketId,
    name: "Sesi Baileys",
    permissions: [],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 10 * 1024 * 1024,
    allowedFileExtensions: ["json"],
    compression: Compression.Gzip,
    encryption: false,
    antivirus: false,
    transformations: false,
  }),
);

console.log("Selesai. Database, tabel, indeks, dan bucket siap.");

async function varchar(tableId, key, size, required) {
  await ensure(`kolom ${tableId}.${key}`, () =>
    tablesDB.createVarcharColumn({ databaseId, tableId, key, size, required }),
  );
}

async function mediumtext(tableId, key, required) {
  await ensure(`kolom ${tableId}.${key}`, () =>
    tablesDB.createMediumtextColumn({ databaseId, tableId, key, required }),
  );
}

async function bool(tableId, key, required) {
  await ensure(`kolom ${tableId}.${key}`, () =>
    tablesDB.createBooleanColumn({ databaseId, tableId, key, required }),
  );
}

async function integer(tableId, key, required, min, max = 9_007_199_254_740_991) {
  await ensure(`kolom ${tableId}.${key}`, () =>
    tablesDB.createIntegerColumn({ databaseId, tableId, key, required, min, max }),
  );
}

async function waitUntilReady(tableId) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const table = await tablesDB.getTable({ databaseId, tableId });
    const pieces = [...(table.columns ?? []), ...(table.indexes ?? [])];
    const failed = pieces.filter((piece) => piece.status === "failed" || piece.status === "stuck");
    if (failed.length) {
      throw new Error(
        `${tableId}: ${failed.map((piece) => `${piece.key} ${piece.error || piece.status}`).join("; ")}`,
      );
    }
    const pending = pieces.some((piece) => piece.status && piece.status !== "available");
    if (!pending) return;
    await sleep(1000);
  }
  throw new Error(`Kolom atau indeks ${tableId} belum siap.`);
}

async function ensure(label, fn) {
  try {
    await fn();
    console.log(`buat ${label}`);
  } catch (error) {
    if (error?.code === 409) {
      console.log(`sudah ada ${label}`);
      return;
    }
    throw error;
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} belum diisi. Salin bot/.env.example menjadi bot/.env.`);
    process.exit(1);
  }
  return value;
}

function loadEnv(url) {
  if (!existsSync(url)) return;
  const text = readFileSync(url, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
