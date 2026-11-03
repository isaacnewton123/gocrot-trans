import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeDraft } from "./draft.js";

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

  assert.equal(draft.origin, "Pool Cikopo");
  assert.equal(draft.destination, null);
  assert.equal(draft.total, null);
  assert.deepEqual(draft.missing, ["destination", "total"]);
  assert.equal(draft.breakdown.tol, 25000);
  assert.equal(draft.breakdown.bensin, 0);
  assert.equal(draft.breakdown.lain, null);
  assert.equal(draft.confidence, "medium");
  assert.equal("series" in draft, false);
});

test("menerima integer rupiah yang sudah jelas", () => {
  const draft = sanitizeDraft(
    '{"origin":"Cikopo","destination":"Soekarno-Hatta","total":700000,"breakdown":{},"confidence":"high","missing":[]}',
  );
  assert.equal(draft.total, 700000);
  assert.deepEqual(draft.missing, []);
  assert.equal(draft.confidence, "high");
});
