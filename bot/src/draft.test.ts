import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeDraft } from "./draft.js";
import { angkaKeTerbilang, deriveShortPlace } from "./receipt.js";

test("membuang data yang dikarang atau tidak utuh", () => {
  const draft = sanitizeDraft(
    JSON.stringify({
      origin: "  Pool Cikopo ",
      destination: null,
      total: "700rb",
      series: "A7K2-0001",
      confidence: "high",
      missing: [],
      breakdown: { tol: 25000, bensin: 0, parkir: null, lain: 1.5 },
    }),
  );

  assert.equal(draft.receivedFrom, null);
  assert.equal(draft.origin, "Pool Cikopo");
  assert.equal(draft.originShort, "Pool Cikopo");
  assert.equal(draft.destination, null);
  assert.equal(draft.destinationShort, null);
  assert.equal(draft.total, null);
  assert.deepEqual(draft.missing, ["receivedFrom", "destination", "total"]);
  assert.equal(draft.breakdown.tol, 25000);
  assert.equal(draft.breakdown.bensin, 0);
  assert.equal(draft.breakdown.lain, null);
  assert.equal(draft.confidence, "medium");
  assert.equal(draft.question, null);
  assert.equal("series" in draft, false);
});

test("menyimpan nama pendek, nama panjang dengan kode pos, dan data kwitansi", () => {
  const fullOrigin = "PT Chang Shin Indonesia, Jl. Dusun Gintungkolot, Karawang, Jawa Barat, 41371";
  const fullDest = "Bantargebang, Bekasi, Jawa Barat, 17151";
  assert.equal(deriveShortPlace(fullOrigin), "PT Chang Shin Indonesia, Karawang");
  assert.equal(deriveShortPlace(fullDest), "Bantargebang, Bekasi");
  assert.equal(angkaKeTerbilang(2500000), "Dua Juta Lima Ratus Ribu");

  const draft = sanitizeDraft(
    JSON.stringify({
      origin: fullOrigin,
      destination: fullDest,
      receivedFrom: "PT. Maju Bersama Logistik",
      paymentLine1: "Sewa Armada Transportasi Pariwisata (2 Hari)",
      paymentMethod: "transfer",
      total: 2500000,
      breakdown: {},
      confidence: "high",
      missing: [],
    }),
  );
  assert.equal(draft.origin, fullOrigin);
  assert.equal(draft.originShort, "PT Chang Shin Indonesia, Karawang");
  assert.equal(draft.destination, fullDest);
  assert.equal(draft.destinationShort, "Bantargebang, Bekasi");
  assert.equal(draft.receivedFrom, "PT. Maju Bersama Logistik");
  assert.equal(draft.paymentLine1, "Sewa Armada Transportasi Pariwisata (2 Hari)");
  assert.equal(draft.paymentLine2, "Rute PT Chang Shin Indonesia, Karawang — Bantargebang, Bekasi");
  assert.equal(draft.paymentMethod, "transfer");
});

test("menyimpan pertanyaan kalau tempatnya belum spesifik", () => {
  const draft = sanitizeDraft(
    JSON.stringify({
      origin: null,
      destination: "Bandara Soekarno-Hatta",
      total: 700000,
      confidence: "high",
      missing: ["origin"],
      question: "  Pool Primajasa yang mana? Sebutkan kotanya.  ",
      breakdown: {},
    }),
  );
  assert.equal(draft.question, "Pool Primajasa yang mana? Sebutkan kotanya.");
  assert.equal(draft.confidence, "medium");
  assert.equal(draft.destination, "Bandara Soekarno-Hatta");
});

test("menerima integer rupiah dan nama penumpang yang sudah jelas", () => {
  const draft = sanitizeDraft(
    '{"receivedFrom":"Bpk. Budi","origin":"Cikopo","destination":"Soekarno-Hatta","total":700000,"breakdown":{},"confidence":"high","missing":[]}',
  );
  assert.equal(draft.receivedFrom, "Bpk. Budi");
  assert.equal(draft.total, 700000);
  assert.deepEqual(draft.missing, []);
  assert.equal(draft.confidence, "high");
});
