import type { Draft, RequiredField } from "./draft.js";
import { terbilangRupiah } from "./receipt.js";

const FIELD_LABEL: Record<RequiredField, string> = {
  receivedFrom: "nama penumpang/penyewanya",
  origin: "lokasi jemput beserta kotanya",
  destination: "lokasi tujuan beserta kotanya",
  total: "total tarifnya",
};

export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function helpText(): string {
  return "Halo! Mau buat kwitansi perjalanan? Langsung kirim aja *nama penumpang*, *lokasi jemput & tujuan*, sama *total tarifnya* ya.";
}

export function unregisteredText(): string {
  return "Maaf, nomor WhatsApp ini belum terdaftar sebagai pengemudi aktif Gocrot Trans. Coba hubungi admin dulu ya supaya nomornya didaftarkan.";
}

export function missingText(draft: Draft): string {
  if (draft.question) {
    return draft.question.trim();
  }

  const labels = draft.missing.map((field) => FIELD_LABEL[field]);
  if (labels.length === 1) {
    return `Oke, tinggal ${labels[0]} aja nih yang belum. Boleh diinfokan?`;
  }
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(", ");
  return `Siap, boleh infokan ${rest}, sama ${last} ya?`;
}

export function summaryText(draft: Draft): string {
  const total = draft.total ?? 0;
  const lines = [
    "📋 *Konfirmasi Detail Kwitansi*",
    "",
    `• *Terima Dari:* ${draft.receivedFrom ?? "-"}`,
    `• *Pembayaran:* ${draft.paymentLine1 ?? "Layanan Jasa Transportasi Perjalanan"}`,
    `• *Rute Kwitansi:* ${draft.paymentLine2 ?? `Rute ${draft.originShort ?? ""} — ${draft.destinationShort ?? ""}`}`,
    `• *Jemput:* ${draft.origin}`,
    `• *Tujuan:* ${draft.destination}`,
    `• *Total:* *${rupiah(total)}* (_${terbilangRupiah(total)}_)`,
    `• *Metode:* ${draft.paymentMethod === "transfer" ? "Transfer" : "Cash"}`,
  ];

  const extra = breakdownLines(draft);
  if (extra.length) {
    lines.push(...extra);
  }

  lines.push(
    "",
    "Sudah pas datanya? Balas *YA* untuk cetak nomor seri, atau *BATAL* kalau mau ulang.",
  );
  return lines.join("\n");
}

function breakdownLines(draft: Draft): string[] {
  const labels: Array<[keyof Draft["breakdown"], string]> = [
    ["tol", "Tol"],
    ["bensin", "Bensin"],
    ["parkir", "Parkir"],
    ["lain", "Lain-lain"],
  ];
  return labels
    .filter(([key]) => draft.breakdown[key] != null)
    .map(([key, label]) => `• *${label}:* ${rupiah(draft.breakdown[key] ?? 0)}`);
}

export function successText(code: string, publicUrl: string): string {
  const lines = [
    "✅ *Kwitansi Berhasil Tercatat*",
    "",
    `Nomor Seri: *${code}*`,
    "Silakan tulis nomor ini di kwitansi fisik.",
  ];
  if (publicUrl) {
    lines.push("", `Cek & unduh kwitansi digital:\n${publicUrl}`);
  }
  return lines.join("\n");
}

export function noSeriesText(): string {
  return "Stok nomor seri di sistem lagi habis nih. Coba kabari admin buat tambah nomor seri baru, nanti tinggal balas *YA* lagi ya.";
}

export function discardText(): string {
  return "Oke, draf yang tadi sudah dibatalkan. Kalau mau buat baru, langsung kirim aja datanya ya.";
}

export function aiErrorText(): string {
  return "Maaf, barusan koneksinya agak tersendat. Boleh kirim ulang pesannya?";
}

export function rateLimitText(): string {
  return "Pesannya agak terlalu cepat nih, tunggu sekitar semenit baru kirim lagi ya.";
}

export function mediaText(): string {
  return "Kirim pakai teks aja ya, atau lewat fitur *Lampirkan → Lokasi* kalau mau kirim titik map.";
}

export function lidText(): string {
  return "Nomor WhatsApp-nya belum terbaca jelas. Coba kirim dari chat pribadi biasa atau hubungi admin ya.";
}

export function genericErrorText(): string {
  return "Maaf, lagi ada sedikit gangguan. Coba kirim ulang sebentar lagi ya.";
}
