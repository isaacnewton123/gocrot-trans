"use client";

import { FormEvent, useState } from "react";

import { DigitalReceipt } from "@/components/site/digital-receipt";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatWhen, normalizeSeries, rupiah } from "@/lib/format";
import { validateReceipt } from "@/lib/records";
import type { PublicTrip, Validation } from "@/lib/types";

export default function ValidasiPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Validation | null>(null);

  async function checkCode(rawCode: string) {
    setError("");
    setResult(null);
    const series = normalizeSeries(rawCode);
    if (!series) {
      setError("Masukkan nomor seri yang tertera pada kwitansi.");
      return;
    }
    setBusy(true);
    try {
      const data = await validateReceipt(series);
      if (!data.ok) setError(data.error);
      else setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memeriksa data.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await checkCode(code);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f7f3] text-[#18181b]">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 md:py-16">
        {/* Form Pencarian Nomor Seri */}
        <div className="no-print mx-auto w-full max-w-xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1c2654]/80">
              Verifikasi Dokumen Resmi
            </p>
            <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-[#141c42] md:text-4xl">
              Validasi Kwitansi Perjalanan
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#57534e]">
              Masukkan nomor seri kwitansi (contoh:{" "}
              <button
                type="button"
                onClick={() => {
                  setCode("KVKS-0001");
                  void checkCode("KVKS-0001");
                }}
                className="font-mono font-semibold text-[#1c2654] underline decoration-[#1c2654]/30 underline-offset-4 hover:decoration-[#1c2654]"
              >
                KVKS-0001
              </button>
              ) untuk menampilkan kwitansi digital permanen yang tercatat di database.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-7 rounded-xl border border-[#e5e3dc] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
          >
            <Label htmlFor="seri" className="text-xs font-semibold uppercase tracking-wider text-[#57534e]">
              Nomor Seri Kwitansi
            </Label>
            <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <Input
                id="seri"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                placeholder="KVKS-0001"
                className="h-12 flex-1 border-[#d6d3cb] bg-[#faf9f6] font-mono text-lg uppercase tracking-wider text-[#141c42] focus-visible:ring-[#1c2654]"
              />
              <Button
                type="submit"
                disabled={busy}
                className="h-12 bg-[#1c2654] px-6 text-sm font-semibold text-white hover:bg-[#141c42]"
              >
                {busy ? "Memeriksa..." : "Periksa Kwitansi"}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm font-medium text-[#b91c1c]">{error}</p>}
          </form>
        </div>

        {/* Hasil Validasi */}
        {result && <ResultSection result={result} />}
      </main>

      <SiteFooter />
    </div>
  );
}

function ResultSection({ result }: { result: Validation }) {
  if (result.result === "valid") {
    return (
      <div className="mt-10 space-y-8">
        {/* Baris Status & Aksi Cetak (Tidak ikut tercetak di kertas) */}
        <div className="no-print mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d6e4da] bg-[#f4f9f5] px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#15653a]/25 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#15653a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15653a]" />
              Terverifikasi
            </span>
            <span className="text-sm text-[#292524]">
              Kwitansi <strong className="font-mono font-bold text-[#141c42]">{result.series}</strong> terdaftar sah dan bersifat permanen.
            </span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c2654] bg-[#1c2654] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#141c42]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak / Unduh PDF
          </button>
        </div>

        {/* Kwitansi Digital Resmi Permanen */}
        <DigitalReceipt series={result.series} trip={result.trip} />

        {/* Detail Arsip Database (Nama Pendek & Alamat Lengkap Beserta Kode Pos) */}
        <TripArchiveCard series={result.series} trip={result.trip} />
      </div>
    );
  }

  if (result.result === "not_found") {
    return (
      <section className="no-print mx-auto mt-8 max-w-xl rounded-xl border border-[#e5c7c7] bg-white p-6">
        <span className="inline-block rounded border border-[#b91c1c]/30 bg-[#fef2f2] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#991b1b]">
          Tidak Ditemukan
        </span>
        <p className="mt-3 text-base text-[#292524]">
          Nomor seri <strong className="font-mono">{result.series || "tersebut"}</strong> tidak terdaftar di dalam buku catatan perjalanan Gocrot Trans.
        </p>
      </section>
    );
  }

  const statusTitle =
    result.result === "blocked"
      ? "Nomor Seri Diblokir"
      : result.result === "unused"
        ? "Nomor Seri Belum Digunakan"
        : "Nomor Seri Sudah Terpakai";

  const copy =
    result.result === "blocked"
      ? `Nomor seri ini telah diblokir oleh administrator${result.reason ? ` (${result.reason})` : "."}`
      : result.result === "unused"
        ? "Nomor seri ini terdaftar di buku kwitansi resmi, namun belum digunakan untuk transaksi perjalanan."
        : `Nomor seri ini tercatat telah digunakan${result.usedAt ? ` pada ${formatWhen(result.usedAt)}` : ""}, tetapi data rincian perjalanan tidak lengkap.`;

  return (
    <section className="no-print mx-auto mt-8 max-w-xl rounded-xl border border-[#e5dec9] bg-white p-6">
      <span className="inline-block rounded border border-[#92400e]/30 bg-[#fffbeb] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#92400e]">
        {statusTitle}
      </span>
      <p className="mt-3 font-mono text-xl font-bold text-[#141c42]">{result.series}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[#57534e]">{copy}</p>
    </section>
  );
}

function TripArchiveCard({ series, trip }: { series: string; trip: PublicTrip }) {
  const breakdown: Array<[string, number | null]> = [
    ["Biaya Tol", trip.breakdown.tol],
    ["Bahan Bakar (Bensin)", trip.breakdown.bensin],
    ["Biaya Parkir", trip.breakdown.parkir],
    ["Biaya Lain-lain", trip.breakdown.lain],
  ];
  const activeBreakdown = breakdown.filter(([, value]) => value != null && value > 0);

  return (
    <section className="no-print mx-auto max-w-[960px] rounded-xl border border-[#e5e3dc] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#efede7] pb-4">
        <div>
          <h2 className="font-serif text-xl text-[#141c42]">
            Arsip Data Perjalanan & Detail Alamat
          </h2>
          <p className="mt-0.5 text-xs text-[#78716c]">
            Data di bawah ini tercatat permanen dari laporan pengemudi dan pemetaan lokasi.
          </p>
        </div>
        <span className="font-mono text-sm font-semibold text-[#1c2654]">
          No. Seri: {series}
        </span>
      </div>

      {/* Grid Lokasi: Nama Pendek & Alamat Lengkap dengan Kode Pos */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#efede7] bg-[#faf9f6] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#78716c]">
            Titik Jemput (Asal)
          </p>
          <p className="mt-1 text-base font-semibold text-[#141c42]">
            {trip.originShort || trip.origin}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#57534e]">
            <span className="font-medium text-[#292524]">Alamat Lengkap & Kode Pos:</span>{" "}
            {trip.origin}
          </p>
        </div>

        <div className="rounded-lg border border-[#efede7] bg-[#faf9f6] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#78716c]">
            Titik Tujuan (Destinasi)
          </p>
          <p className="mt-1 text-base font-semibold text-[#141c42]">
            {trip.destinationShort || trip.destination}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#57534e]">
            <span className="font-medium text-[#292524]">Alamat Lengkap & Kode Pos:</span>{" "}
            {trip.destination}
          </p>
        </div>
      </div>

      {/* Detail Kwitansi & Transaksi */}
      <dl className="mt-5 divide-y divide-[#efede7] text-sm">
        <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
          <dt className="text-[#78716c]">Telah Terima Dari</dt>
          <dd className="font-medium text-[#18181b] sm:col-span-2">{trip.receivedFrom}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
          <dt className="text-[#78716c]">Untuk Pembayaran</dt>
          <dd className="font-medium text-[#18181b] sm:col-span-2">
            <div>{trip.paymentLine1}</div>
            <div className="text-xs text-[#57534e]">{trip.paymentLine2}</div>
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
          <dt className="text-[#78716c]">Nominal & Terbilang</dt>
          <dd className="font-semibold text-[#141c42] sm:col-span-2">
            {rupiah(trip.total)}{" "}
            <span className="font-normal italic text-[#57534e]">({trip.terbilang})</span>
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
          <dt className="text-[#78716c]">Metode Pembayaran</dt>
          <dd className="font-medium text-[#18181b] sm:col-span-2">
            {trip.paymentMethod === "transfer" ? "Transfer" : "Cash (Tunai)"}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
          <dt className="text-[#78716c]">Pengemudi Bertugas</dt>
          <dd className="font-medium text-[#18181b] sm:col-span-2">{trip.driverName}</dd>
        </div>
        <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
          <dt className="text-[#78716c]">Waktu Tercatat</dt>
          <dd className="font-medium text-[#18181b] sm:col-span-2">
            {formatWhen(trip.confirmedAt)} WIB
          </dd>
        </div>
        {activeBreakdown.map(([label, value]) => (
          <div key={label} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3">
            <dt className="text-[#78716c]">{label}</dt>
            <dd className="text-[#292524] sm:col-span-2">{rupiah(value ?? 0)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
