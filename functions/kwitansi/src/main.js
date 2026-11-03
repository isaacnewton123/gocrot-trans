import { randomInt } from "node:crypto";
import { Client, Query, TablesDB, Users } from "node-appwrite";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "main";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BATCH = 100;

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(header(req, "x-appwrite-key"));

  const tablesDB = new TablesDB(client);
  const users = new Users(client);
  const body = readBody(req);
  const action = body.action || header(req, "x-action");

  try {
    if (action === "validate") {
      return res.json(await validateSeries(tablesDB, body.code));
    }
    if (action === "generate") {
      const denied = await assertAdmin(users, header(req, "x-appwrite-user-id"));
      if (denied) return res.json({ ok: false, error: denied.message }, denied.status);
      const result = await generateSeries(tablesDB, body, log);
      return res.json(result);
    }
    return res.json({ ok: false, error: "Aksi tidak dikenal." }, 400);
  } catch (err) {
    error(err?.stack || String(err));
    const message =
      action === "generate" ? err?.message || "Gagal membuat nomor seri." : "Gagal memeriksa nomor seri.";
    return res.json({ ok: false, error: message }, 500);
  }
};

export function normalizeSeries(input) {
  const compact = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  if (/^[A-Z0-9]{8}$/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4)}`;
  return String(input || "")
    .trim()
    .toUpperCase();
}

async function validateSeries(tablesDB, codeInput) {
  const code = normalizeSeries(codeInput);
  if (!/^[A-Z0-9]{4}-\d{4}$/.test(code)) {
    return { ok: true, result: "not_found", series: code };
  }
  try {
    const series = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: "series",
      rowId: code,
    });
    if (series.status === "blocked") {
      return {
        ok: true,
        result: "blocked",
        series: code,
        reason: series.blockedReason || null,
      };
    }
    if (series.status === "available") {
      return { ok: true, result: "unused", series: code };
    }
    if (series.status === "used" && series.tripId) {
      try {
        const trip = await tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: "trips",
          rowId: series.tripId,
        });
        return { ok: true, result: "valid", series: code, trip: publicTrip(trip) };
      } catch (err) {
        if (err?.code !== 404) throw err;
      }
    }
    return {
      ok: true,
      result: "already_used",
      series: code,
      usedAt: series.usedAt || series.$updatedAt || null,
    };
  } catch (err) {
    if (err?.code === 404) return { ok: true, result: "not_found", series: code };
    throw err;
  }
}

function publicTrip(trip) {
  return {
    origin: trip.origin,
    destination: trip.destination,
    total: trip.total,
    driverName: trip.driverName,
    confirmedAt: trip.confirmedAt || trip.$createdAt,
    seriesCode: trip.seriesCode,
    breakdown: {
      tol: trip.tol ?? null,
      bensin: trip.bensin ?? null,
      parkir: trip.parkir ?? null,
      lain: trip.lain ?? null,
    },
  };
}

async function assertAdmin(users, userId) {
  if (!userId) return { status: 401, message: "Login admin diperlukan." };
  const user = await users.get({ userId });
  if (!user.labels?.includes("admin")) return { status: 403, message: "Hanya admin yang boleh membuat nomor seri." };
  return null;
}

async function generateSeries(tablesDB, body, log) {
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error("Jumlah per permintaan harus 1 sampai 500.");
  }

  let prefix = typeof body.prefix === "string" ? body.prefix.trim().toUpperCase() : "";
  let suffixStart = Number(body.suffixStart || 0);
  let sequenceStart = Number(body.sequenceStart || 0);

  if (!prefix) {
    prefix = await freshPrefix(tablesDB);
    suffixStart = 1;
    sequenceStart = (await maxSequence(tablesDB)) + 1;
  } else if (!isPrefix(prefix) || !Number.isInteger(suffixStart) || suffixStart < 1) {
    throw new Error("Awalan atau nomor awal tidak valid.");
  }
  if (suffixStart + count - 1 > 9999) {
    throw new Error("Satu awalan hanya sampai 9999.");
  }
  if (!Number.isInteger(sequenceStart) || sequenceStart < 1) {
    sequenceStart = (await maxSequence(tablesDB)) + 1;
  }

  let created = 0;
  for (let offset = 0; offset < count; offset += BATCH) {
    const size = Math.min(BATCH, count - offset);
    const rows = [];
    for (let index = 0; index < size; index += 1) {
      const suffix = suffixStart + offset + index;
      const code = `${prefix}-${String(suffix).padStart(4, "0")}`;
      rows.push({
        $id: code,
        code,
        prefix,
        suffix,
        sequence: sequenceStart + offset + index,
        status: "available",
        tripId: "",
        blockedReason: "",
        usedAt: "",
      });
    }
    await tablesDB.createRows({
      databaseId: DATABASE_ID,
      tableId: "series",
      rows,
    });
    created += size;
    log(`seri ${prefix} +${size}`);
  }

  const from = `${prefix}-${String(suffixStart).padStart(4, "0")}`;
  const to = `${prefix}-${String(suffixStart + created - 1).padStart(4, "0")}`;
  return {
    ok: true,
    prefix,
    created,
    from,
    to,
    nextSuffix: suffixStart + created,
    nextSequence: sequenceStart + created,
  };
}

async function freshPrefix(tablesDB) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const prefix = randomPrefix();
    const existing = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: "series",
      queries: [Query.equal("prefix", prefix), Query.limit(1)],
    });
    if (!existing.rows.length) return prefix;
  }
  throw new Error("Gagal mencari awalan yang masih kosong.");
}

async function maxSequence(tablesDB) {
  const page = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: "series",
    queries: [Query.orderDesc("sequence"), Query.limit(1)],
  });
  return page.rows[0]?.sequence || 0;
}

function randomPrefix() {
  let prefix = "";
  for (let index = 0; index < 4; index += 1) prefix += ALPHABET[randomInt(ALPHABET.length)];
  return prefix;
}

function isPrefix(value) {
  return value.length === 4 && [...value].every((char) => ALPHABET.includes(char));
}

function readBody(req) {
  if (req.bodyJson && typeof req.bodyJson === "object") return req.bodyJson;
  try {
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

function header(req, name) {
  const headers = req.headers || {};
  return headers[name] || headers[name.toLowerCase()] || "";
}
