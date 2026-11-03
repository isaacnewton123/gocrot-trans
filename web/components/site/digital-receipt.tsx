"use client";

import type { PublicTrip } from "@/lib/types";
import { angkaKeTerbilang } from "@/lib/format";

function formatRibuan(angka: number): string {
  return Math.abs(Math.floor(angka)).toLocaleString("id-ID");
}

function parseJakartaDateParts(iso: string): { tanggalBulan: string; tahunDuaDigit: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { tanggalBulan: "...................", tahunDuaDigit: "......" };
  }
  const day = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const month = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "Asia/Jakarta",
  }).format(date);
  const year = new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);

  const tahunDuaDigit = year.length >= 2 ? year.slice(-2) : year;
  return {
    tanggalBulan: ` ${day} ${month} `,
    tahunDuaDigit,
  };
}

export function DigitalReceipt({
  series,
  trip,
}: {
  series: string;
  trip: PublicTrip;
}) {
  const { tanggalBulan, tahunDuaDigit } = parseJakartaDateParts(trip.confirmedAt);

  const nominalFormatted = `${formatRibuan(trip.total)},-`;
  const terbilangText = (trip.terbilang || `${angkaKeTerbilang(trip.total)} Rupiah`)
    .replace(/#/g, "")
    .trim();

  const terimaDari = trip.receivedFrom || "Penumpang / Pelanggan GOCROT TRANS";
  const bayar1 = trip.paymentLine1 || "Layanan Jasa Transportasi Perjalanan";
  const bayar2 =
    trip.paymentLine2 ||
    `Rute ${trip.originShort || trip.origin} — ${trip.destinationShort || trip.destination}`;
  const isTransfer = trip.paymentMethod === "transfer";

  return (
    <div className="w-full">
      {/* KANVAS KWITANSI DIGITAL PERMANEN (Read-Only, Tidak Bisa Diubah) */}
      <div className="print-wrapper flex w-full justify-start overflow-x-auto pb-4 lg:justify-center">
        <div className="kwitansi-paper" aria-label={`Kwitansi Digital Resmi Nomor ${series}`}>
          {/* 1. BAGIAN LUBANG BINDER & PERFORASI KIRI */}
          <div className="binder-strip">
            <div className="binder-hole" />
            <div className="binder-hole" />
          </div>

          {/* 2. SIDEBAR KIRI (Logo & Teks Vertikal) */}
          <div className="left-sidebar">
            {/* Logo Kecil di Kiri Atas */}
            <div className="mb-2 flex w-full justify-center px-1 pt-1">
              <svg viewBox="0 0 520 290" className="h-auto w-full drop-shadow-sm">
                <g
                  transform="translate(172, 165) rotate(-6) scale(1, 0.56)"
                  stroke="#26292e"
                  strokeWidth="4.5"
                  fill="none"
                  strokeLinejoin="round"
                >
                  <circle cx="0" cy="0" r="102" fill="#ffffff" />
                  <circle cx="0" cy="0" r="90" fill="#ffffff" />
                  <g strokeWidth="4">
                    <line x1="0" y1="-116" x2="0" y2="-90" />
                    <line x1="58" y1="-100" x2="45" y2="-78" />
                    <line x1="100" y1="-58" x2="78" y2="-45" />
                    <line x1="116" y1="0" x2="90" y2="0" />
                    <line x1="100" y1="58" x2="78" y2="45" />
                    <line x1="58" y1="100" x2="45" y2="78" />
                    <line x1="0" y1="116" x2="0" y2="90" />
                    <line x1="-58" y1="100" x2="-45" y2="78" />
                    <line x1="-100" y1="58" x2="-78" y2="45" />
                    <line x1="-116" y1="0" x2="-90" y2="0" />
                    <line x1="-100" y1="-58" x2="-78" y2="-45" />
                    <line x1="-58" y1="-100" x2="-45" y2="-78" />
                  </g>
                  <circle cx="0" cy="0" r="70" />
                  <circle cx="0" cy="0" r="52" />
                  <polygon
                    points="0,-125 18,-25 125,0 25,18 0,125 -18,25 -125,0 -25,-18"
                    fill="#ffffff"
                    stroke="#26292e"
                    strokeWidth="4.5"
                    transform="rotate(25)"
                  />
                  <g transform="rotate(-22)">
                    <polygon
                      points="0,-155 24,-24 155,0 24,24 0,165 -24,24 -155,0 -24,-24"
                      fill="#ffffff"
                      stroke="#26292e"
                      strokeWidth="5"
                    />
                    <line x1="0" y1="-155" x2="0" y2="165" stroke="#26292e" strokeWidth="4" />
                    <line x1="-155" y1="0" x2="155" y2="0" stroke="#26292e" strokeWidth="4" />
                    <circle cx="0" cy="0" r="22" fill="#ffffff" stroke="#26292e" strokeWidth="5" />
                  </g>
                </g>
                <text
                  x="90"
                  y="274"
                  fontFamily="'Arial Black', sans-serif"
                  fontWeight="900"
                  fontSize="36"
                  fill="#ffffff"
                  stroke="#26292e"
                  strokeWidth="4"
                  transform="rotate(-28, 90, 274)"
                >
                  S
                </text>
                <g
                  fontFamily="'Arial Black', 'Archivo Black', sans-serif"
                  fontWeight="900"
                  fontSize="112"
                  stroke="#26292e"
                  strokeWidth="7"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                >
                  <text x="8" y="106" fill="#9ea3a8" letterSpacing="-4">
                    GO
                  </text>
                  <text x="195" y="106" fill="#dec024" letterSpacing="-3">
                    CROT
                  </text>
                </g>
                <text
                  x="302"
                  y="152"
                  fontFamily="'Arial Black', 'Archivo Black', sans-serif"
                  fontWeight="900"
                  fontSize="44"
                  fill="#8f949a"
                  stroke="#26292e"
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  letterSpacing="8"
                >
                  TRANS
                </text>
              </svg>
            </div>

            {/* Teks Vertikal: GOCROT TRANS & Alamat */}
            <div className="vertical-company-info">
              <div className="vertical-company-title">GOCROT TRANS</div>
              <div className="vertical-company-address">Jl. Bina Marga, Jomin Barat</div>
              <div className="vertical-company-address">
                Kec. Kota Baru, Karawang,
                <div>
                  <span style={{ letterSpacing: "0.2px" }}>Jawa Barat , 41374</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. AREA KONTEN UTAMA KWITANSI */}
          <div className="main-receipt-area">
            {/* CAP "TERVERIFIKASI" DI TENGAH KWITANSI */}
            <div className="verified-center-stamp" aria-hidden="true">
              <div className="verified-center-stamp-inner">
                <span className="verified-center-stamp-title">TERVERIFIKASI</span>
                <span className="verified-center-stamp-sub">
                  DOKUMEN SAH · NO. {series}
                </span>
              </div>
            </div>

            {/* BARIS HEADER: No. & KWITANSI */}
            <div className="relative z-10 mb-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-receipt-serif text-[24px] font-bold text-[#1c2654]">No.</span>
                <span className="font-receipt-serif inline-block min-w-[140px] border-b border-slate-400/60 px-1 text-[20px] font-bold tracking-wide text-slate-900">
                  {series}
                </span>
              </div>
              <h2 className="kwitansi-heading pr-3">KWITANSI</h2>
            </div>

            {/* BARIS ISIAN FORMULIR (PERMANEN / READ-ONLY) */}
            <div className="relative z-10 my-auto flex flex-col gap-3.5">
              {/* Telah Terima Dari */}
              <div className="receipt-row">
                <div className="receipt-label">Telah Terima Dari</div>
                <div className="receipt-colon">:</div>
                <div className="receipt-line">{terimaDari}</div>
              </div>

              {/* Uang Sebanyak */}
              <div className="receipt-row receipt-row-top pt-1">
                <div className="receipt-label">Uang Sebanyak</div>
                <div className="receipt-colon">:</div>
                <div className="receipt-open-field">{terbilangText}</div>
              </div>

              {/* Untuk Pembayaran (2 Baris Garis Hitam) */}
              <div className="flex flex-col gap-5">
                <div className="receipt-row">
                  <div className="receipt-label">Untuk Pembayaran</div>
                  <div className="receipt-colon">:</div>
                  <div className="receipt-line">{bayar1}</div>
                </div>
                <div className="receipt-row">
                  <div className="receipt-label" />
                  <div className="receipt-colon" />
                  <div className="receipt-line">{bayar2}</div>
                </div>
              </div>
            </div>

            {/* BAGIAN BAWAH: Jumlah Rp, Pembayaran Via, & Tanggal */}
            <div className="relative z-10 mt-5">
              {/* Baris Tanggal di Kanan Atas dari Blok Jumlah Rp */}
              <div className="mb-1 flex justify-end pr-1">
                <div className="font-receipt-serif flex items-baseline text-[17.5px] text-slate-900">
                  <span>Tanggal,</span>
                  <span className="inline-block min-w-[95px] px-1.5 text-center font-semibold">
                    {tanggalBulan}
                  </span>
                  <span>20</span>
                  <span className="inline-block min-w-[32px] font-semibold">
                    {tahunDuaDigit}
                  </span>
                </div>
              </div>

              {/* Blok Jumlah Rp. & Checkbox Permanen */}
              <div className="flex items-end justify-between">
                <div>
                  {/* Kotak Jumlah Rp. */}
                  <div className="jumlah-wrapper">
                    <span className="jumlah-label">Jumlah Rp.</span>
                    <div className="parallelogram-box">
                      <div className="parallelogram-content">{nominalFormatted}</div>
                    </div>
                  </div>

                  {/* Pembayaran Via: Cash / Transfer (Read-Only) */}
                  <div className="font-receipt-serif mt-2.5 flex items-center gap-6 pl-1 text-[16.5px] text-slate-900">
                    <span>Pembayaran Via :</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="custom-checkbox">{!isTransfer ? "✓" : ""}</span>
                      <span>Cash</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="custom-checkbox">{isTransfer ? "✓" : ""}</span>
                      <span>Transfer</span>
                    </span>
                  </div>
                </div>

                {/* Area Tanda Tangan Kanan Bawah */}
                <div className="relative z-20 flex h-14 w-52 items-end justify-center pr-4">
                  <span className="font-receipt-serif w-full text-center text-[15px] font-bold text-[#0f172a]">
                    ( {trip.driverName} )
                  </span>
                </div>
              </div>
            </div>

            {/* STEMPEL RESMI JASA TRANSPORTASI GO CROT TRANS */}
            <div className="stamp-overlay">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/stemple.png"
                alt="Stempel Resmi Jasa Transportasi Go Crot Trans"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
