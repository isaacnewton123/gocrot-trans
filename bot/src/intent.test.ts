import assert from "node:assert/strict";
import test from "node:test";
import { intentOf, isCancel, isGreeting } from "./intent.js";

test("mengenali YA dan TIDAK yang pendek", () => {
  assert.equal(intentOf("YA"), "yes");
  assert.equal(intentOf("iya!"), "yes");
  assert.equal(intentOf("tidak"), "no");
  assert.equal(intentOf("ya dari bandara"), "other");
  assert.equal(intentOf("700rb"), "other");
});

test("batal dan sapaan tidak tertukar dengan rute", () => {
  assert.equal(isCancel("Batal"), true);
  assert.equal(isCancel("Batalin bikin nya dah"), true);
  assert.equal(isCancel("gak jadi"), true);
  assert.equal(isCancel("Nggk jadi"), true);
  assert.equal(isCancel("batal dari pool"), false);
  assert.equal(isGreeting("halo"), true);
  assert.equal(isGreeting("P"), true);
  assert.equal(isGreeting("halo dari pool ke bandara 700rb"), false);
});
