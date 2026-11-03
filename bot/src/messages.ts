import type { Draft, RequiredField } from "./draft.js";

const FIELD_LABEL: Record<RequiredField, string> = {
  origin: "lokasi jemput (dari)",
  destination: "tujuan (ke)",
  total: "total tarif",
};

export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function helpText(): string {
  return [
    "Kirim rute seperti biasa, contoh:",
    "",
    "Dari pool Primajasa Cikopo ke Bandara Soekarno-Hatta total 700rb",
    "",
    "Boleh ditambah tol, bensin, atau parkir.",
    "Ketik BATAL untuk mengulang.",
  ].join("\n");
}

export function unregisteredText(): string {
  return [
    "❌ Nomor ini belum terdaftar sebagai pengemudi aktif.",
    "Hubungi admin komunitas supaya nomornya didaftarkan.",
  ].join("\n");
}

export function missingText(draft: Draft): string {
  const labels = draft.missing.map((field) => FIELD_LABEL[field]).join(", ");
  const example =
    draft.missing.length === 1 && draft.missing[0] === "total"
      ? "Contoh: 700rb"
      : draft.missing.includes("destination")
        ? "Contoh: Bandara Soekarno-Hatta"
        : "Contoh: Pool Primajasa Cikopo";
  return [`⚠️ Saya belum menangkap: ${labels}.`, "Balas bagian yang kurang saja.", "", example].join(
    "\n",
  );
}

export function summaryText(draft: Draft): string {
  const lines = [
    draft.confidence === "low"
      ? "⚠️ Saya kurang yakin. Mohon dibaca pelan-pelan."
      : "Mohon dicek ya.",
    "",
    `Dari: ${draft.origin}`,
    `Ke: ${draft.destination}`,
    `Total: ${rupiah(draft.total ?? 0)}`,
  ];
  const extra = breakdownLines(draft);
  if (extra.length) lines.push(...extra);
  lines.push("", "Ketik YA kalau sudah benar.", "Ketik TIDAK untuk batal.");
  return lines.join("\n");
}

function breakdownLines(draft: Draft): string[] {
  const labels: Array<[keyof Draft["breakdown"], string]> = [
    ["tol", "Tol"],
    ["bensin", "Bensin"],
    ["parkir", "Parkir"],
    ["lain", "Lain"],
  ];
  return labels
    .filter(([key]) => draft.breakdown[key] != null)
    .map(([key, label]) => `${label}: ${rupiah(draft.breakdown[key] ?? 0)}`);
}

export function successText(code: string, publicUrl: string): string {
  const lines = ["✅ Tercatat.", "", "Nomor seri:", code, "", "Tulis nomor ini di kwitansi fisik."];
  if (publicUrl) lines.push(`Cek kwitansi: ${publicUrl}`);
  return lines.join("\n");
}

export function noSeriesText(): string {
  return [
    "⚠️ Stok nomor seri habis.",
    "Hubungi admin, lalu ketik YA lagi setelah nomor baru dibuat.",
    "Data perjalanan ini masih tersimpan.",
  ].join("\n");
}

export function discardText(): string {
  return ["Baik, draf dibatalkan.", "Kirim ulang rute perjalanan dari awal."].join("\n");
}

export function aiErrorText(): string {
  return ["⚠️ Saya belum bisa membaca pesan itu.", "Coba kirim ulang sebentar lagi."].join("\n");
}

export function rateLimitText(): string {
  return ["⚠️ Terlalu banyak pesan beruntun.", "Tunggu beberapa menit, lalu kirim lagi."].join("\n");
}

export function mediaText(): string {
  return "Kirim dalam bentuk teks ya. Foto belum bisa dibaca.";
}

export function lidText(): string {
  return [
    "⚠️ Nomor WhatsApp tidak terbaca.",
    "Kirim dari chat pribadi biasa, atau hubungi admin.",
  ].join("\n");
}

export function genericErrorText(): string {
  return "⚠️ Ada gangguan. Coba kirim ulang sebentar lagi.";
}
