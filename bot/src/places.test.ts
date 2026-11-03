import assert from "node:assert/strict";
import test from "node:test";
import { addressIsEnough, choiceReply, latestPin, selectLabels, shouldSearch } from "./places.js";

test("nama usaha singkat dicari, alamat kampung tidak", () => {
  assert.equal(shouldSearch("BNC Stay"), true);
  assert.equal(shouldSearch("Kp. Pedes, Desa Karangsari, Kecamatan Purwasari"), false);
  assert.equal(shouldSearch("[lokasi WhatsApp] -6.300000, 107.300000"), false);
});

test("hasil peta yang tidak memuat kata kuncinya dibuang", () => {
  const labels = selectLabels("BNC Stay", [
    {
      name: "BNC Stay",
      display_name: "BNC Stay, Sukaseuri, Karawang, Jawa Barat, Indonesia",
      address: { road: "Sukaseuri", city: "Karawang" },
    },
    {
      name: "BNC Stay",
      display_name: "BNC Stay, Bekasi, Jawa Barat, Indonesia",
      address: { city: "Bekasi" },
    },
    {
      name: "Jalan Raya",
      display_name: "Jalan Raya, Bandung, Indonesia",
      address: { city: "Bandung" },
    },
  ]);
  assert.deepEqual(labels, [
    "BNC Stay, Sukaseuri, Karawang, Jawa Barat",
    "BNC Stay, Bekasi, Jawa Barat",
  ]);
});

test("alamat peta dipakai utuh dan toko di titik yang sama digabung", () => {
  const labels = selectLabels("aeon deltamas", [
    {
      name: "AEON",
      display_name: "AEON, Jalan Ganesha Boulevard, Kota Deltamas, Hegarmukti, Kab Bekasi, Jawa Barat, 17825, Indonesia",
      address: { road: "Jalan Ganesha Boulevard", village: "Hegarmukti", postcode: "17825" },
    },
    {
      name: "AEON Mall",
      display_name:
        "AEON Mall, Jalan Ganesha Boulevard, Kota Deltamas, Hegarmukti, Kab Bekasi, Jawa Barat, 17825, Indonesia",
      address: { road: "Jalan Ganesha Boulevard", village: "Hegarmukti", postcode: "17825" },
    },
  ]);
  assert.deepEqual(labels, [
    "AEON Mall, Jalan Ganesha Boulevard, Kota Deltamas, Hegarmukti, Kab Bekasi, Jawa Barat, 17825",
  ]);
});

test("jalan, kota, dan kode pos sudah cukup tanpa desa", () => {
  const address = "Pool DAMRI Cikopo, Jl. Raya Cikopo, Purwakarta, Jawa Barat, 41181";
  assert.equal(addressIsEnough(address), true);
  assert.equal(shouldSearch(address), false);
  assert.equal(
    latestPin(["[lokasi WhatsApp] Pool DAMRI Cikopo, Jl. Raya Cikopo, Purwakarta, Jawa Barat, 41181 -6.450000, 107.450000"]),
    address,
  );
});

test("balasan nomor memilih tempat yang ditawarkan", () => {
  const sentence = choiceReply({ field: "origin", options: ["BNC Stay, Karawang", "BNC Stay, Bekasi"] }, "2");
  assert.equal(sentence, "Jemput: BNC Stay, Bekasi");
  assert.equal(choiceReply({ field: "destination", options: ["A", "B"] }, "9"), null);
});
