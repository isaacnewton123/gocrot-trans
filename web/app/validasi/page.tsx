"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { envReady } from "@/lib/env";
import { errorText, executeFunction } from "@/lib/appwrite";
import { formatWhen, normalizeSeries, rupiah } from "@/lib/format";
import type { PublicTrip, Validation } from "@/lib/types";

export default function ValidasiPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Validation | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    const series = normalizeSeries(code);
    if (!series) {
      setError("Isi nomor seri di kwitansi.");
      return;
    }
    setBusy(true);
    try {
      const data = await executeFunction<Validation>({ action: "validate", code: series });
      setResult(data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10">
      <Link href="/" className="text-sm font-semibold text-muted-foreground">
        Gocrot Trans
      </Link>
      <h1 className="mt-3 font-serif text-4xl">Validasi kwitansi</h1>
      <p className="mt-2 text-muted-foreground">Ketik nomor seri yang tertulis di kertas, misalnya A7K2-0001.</p>

      {!envReady && (
        <p className="mt-6 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-950">
          Konfigurasi Appwrite belum diisi di environment situs.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Label htmlFor="seri">Nomor seri</Label>
        <Input
          id="seri"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
          placeholder="A7K2-0001"
          className="h-16 font-mono text-2xl uppercase tracking-wide"
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !envReady}>
          {busy ? "Memeriksa..." : "Periksa"}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
      {result && <ResultCard result={result} />}
    </main>
  );
}

function ResultCard({ result }: { result: Validation }) {
  if (result.result === "valid") {
    return (
      <section className="mt-6 rounded-xl border-2 border-emerald-700 bg-emerald-50 p-5">
        <Badge variant="valid">Valid</Badge>
        <p className="mt-3 font-mono text-3xl font-bold tracking-wide">{result.series}</p>
        <TripFacts trip={result.trip} />
      </section>
    );
  }
  if (result.result === "not_found") {
    return (
      <section className="mt-6 rounded-xl border-2 border-red-700 bg-red-50 p-5">
        <Badge variant="bad">Tidak ditemukan</Badge>
        <p className="mt-3 text-lg">Nomor {result.series || "itu"} tidak ada di catatan komunitas.</p>
      </section>
    );
  }
  const copy =
    result.result === "blocked"
      ? `Nomor ini diblokir admin${result.reason ? `: ${result.reason}` : "."}`
      : result.result === "unused"
        ? "Nomor ini ada di buku kwitansi, tetapi belum dipakai untuk perjalanan."
        : `Nomor ini sudah terpakai${result.usedAt ? ` pada ${formatWhen(result.usedAt)}` : ""}, tanpa data perjalanan yang lengkap.`;
  return (
    <section className="mt-6 rounded-xl border-2 border-amber-700 bg-amber-50 p-5">
      <Badge variant="warn">{result.result === "blocked" ? "Diblokir" : result.result === "unused" ? "Belum dipakai" : "Sudah terpakai"}</Badge>
      <p className="mt-3 font-mono text-2xl font-bold">{result.series}</p>
      <p className="mt-2 text-lg">{copy}</p>
    </section>
  );
}

function TripFacts({ trip }: { trip: PublicTrip }) {
  const rows: Array<[string, string]> = [
    ["Dari", trip.origin],
    ["Ke", trip.destination],
    ["Total", rupiah(trip.total)],
    ["Pengemudi", trip.driverName],
    ["Waktu", formatWhen(trip.confirmedAt)],
  ];
  const breakdown: Array<[string, number | null]> = [
    ["Tol", trip.breakdown.tol],
    ["Bensin", trip.breakdown.bensin],
    ["Parkir", trip.breakdown.parkir],
    ["Lain", trip.breakdown.lain],
  ];
  return (
    <dl className="mt-4 space-y-2 text-lg">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-emerald-200 py-2">
          <dt className="text-emerald-900">{label}</dt>
          <dd className="text-right font-semibold">{value}</dd>
        </div>
      ))}
      {breakdown
        .filter(([, value]) => value != null)
        .map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-1 text-base">
            <dt>{label}</dt>
            <dd>{rupiah(value ?? 0)}</dd>
          </div>
        ))}
    </dl>
  );
}
