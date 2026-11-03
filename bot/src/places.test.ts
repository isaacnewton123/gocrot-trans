import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeDraft } from "./draft.js";
import { addressIsEnough, choiceReply, groundPlaces, latestPin, queryVariants, selectLabels, shouldSearch } from "./places.js";

test("nama usaha dengan kota namun tanpa jalan/kode pos tetap dicari ke peta", () => {
  assert.equal(shouldSearch("RS SMC Hospital (Sentul Medical Center), Cikampek, Kabupaten Karawang, Jawa Barat"), true);
  assert.equal(shouldSearch("Intan Barokah, Kosambi, Kabupaten Karawang, Jawa Barat"), true);
  const variants = queryVariants("RS SMC Hospital (Sentul Medical Center), Cikampek, Kabupaten Karawang, Jawa Barat");
  assert.equal(variants.includes("Sentul Cikampek"), true);
});

test("tidak mencocokkan tempat lain yang hanya kebetulan satu kecamatan", () => {
  const labels = selectLabels("Villa Ciater Highland Resort, Ciater, Subang", [
    {
      name: "Ciater",
      display_name: "Ciater, Jalan Raya Lembang-Subang, Ciater, Subang, Jawa Barat, 41281, Indonesia",
      address: { road: "Jalan Raya Lembang-Subang", city: "Subang", postcode: "41281" },
    },
    {
      name: "Lapang Bola Lembah Ciater resort by SAHID",
      display_name: "Lapang Bola Lembah Ciater resort by SAHID, Ciater, Subang, Jawa Barat, Indonesia",
      address: { city: "Subang" },
    },
  ]);
  assert.deepEqual(labels, []);
});

test("shareloc Google Maps langsung melengkapi tujuan yang belum ketemu tanpa mengulang pilihan", async () => {
  const previousDraft = sanitizeDraft(
    JSON.stringify({
      receivedFrom: "Mr. Kwetiau",
      origin: "Prime Plaza Hotel Purwakarta, Blok L, Jalan Tol Jakarta–Cikampek, Cinangka, Purwakarta, Jawa Barat, 41138",
      destination: null,
      total: 1000000,
      confidence: "low",
      missing: ["destination"],
      question: "Tolong kirim shareloc",
    }),
  );
  const currentDraft = sanitizeDraft(
    JSON.stringify({
      receivedFrom: "Mr. Kwetiau",
      origin: "Hotel Prime Plaza, Purwakarta",
      destination: "Villa Ciater Highland Resort, Ciater, Subang",
      total: 1000000,
      confidence: "medium",
      missing: [],
    }),
  );
  const gmaps = [
    "https://maps.google.com/maps/search/Villa%20Ciater%20Highland%20Resort/@-6.71032968,107.66055512,17z?hl=en",
    "Jl. Riung Rangga, Subang, 41281, Jawa Barat, ID",
  ].join("\n");

  const grounded = await groundPlaces(currentDraft, [gmaps], { previousDraft });
  assert.equal(
    grounded.origin,
    "Prime Plaza Hotel Purwakarta, Blok L, Jalan Tol Jakarta–Cikampek, Cinangka, Purwakarta, Jawa Barat, 41138",
  );
  assert.equal(
    grounded.destination,
    "Villa Ciater Highland Resort, Jl. Riung Rangga, Subang, 41281, Jawa Barat",
  );
  assert.equal(grounded.choices, null);
  assert.equal(grounded.question, null);
  assert.deepEqual(grounded.missing, []);
});

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

test("alamat bandara, pool bus, dan tautan Google Maps tidak dianggap belum ketemu", () => {
  const terminal2 =
    "Terminal 2, Bandara Internasional Soekarno-Hatta, Pajang, Kec. Benda, Kota Tangerang, Banten 15126";
  const primajasa = "Pool Bus Primajasa Cikopo, Cikopo, Purwakarta, Jawa Barat, 41181";

  assert.equal(addressIsEnough(terminal2), true);
  assert.equal(shouldSearch(terminal2), false);
  assert.equal(addressIsEnough(primajasa), true);
  assert.equal(shouldSearch(primajasa), false);

  const gmapsMessage = [
    "https://maps.google.com/maps/search/Terminal%202/@-6.12203354,106.65248306,17z?hl=en",
    "RT.001/RW.010, Tangerang Kota, 15126, Banten, ID",
  ].join("\n");
  assert.equal(latestPin([gmapsMessage]), "RT.001/RW.010, Tangerang Kota, 15126, Banten");
});
