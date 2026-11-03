import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSeries } from "./main.js";

test("menormalkan nomor seri", () => {
  assert.equal(normalizeSeries("a7k2-0001"), "A7K2-0001");
  assert.equal(normalizeSeries("a7k20001"), "A7K2-0001");
  assert.equal(normalizeSeries("  a7k2 0001 "), "A7K2-0001");
  assert.equal(normalizeSeries("bukan"), "BUKAN");
});
