import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhone } from "./phone.js";

test("menormalkan nomor Indonesia", () => {
  assert.equal(normalizePhone("0812-3456-7890"), "6281234567890");
  assert.equal(normalizePhone("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizePhone("6281234567890"), "6281234567890");
  assert.equal(normalizePhone("81234567890"), "6281234567890");
  assert.equal(normalizePhone("123"), null);
});
