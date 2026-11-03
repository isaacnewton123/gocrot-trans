"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { download, formatWhen, rupiah, toCsv, toExcelXml } from "@/lib/format";
import { exportTrips, listDrivers, listTrips } from "@/lib/records";
import type { Driver, Trip, TripFilters } from "@/lib/types";

export function TripsPanel() {
  const [filters, setFilters] = useState<TripFilters>({ q: "", driver: "", from: "", to: "" });
  const [applied, setApplied] = useState<TripFilters>(filters);
  const [rows, setRows] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listDrivers().then((result) => {
      if (result.ok) setDrivers(result.rows);
      else setMessage(result.error);
    });
  }, []);

  async function load(next: TripFilters, reset: boolean, after: string | null) {
    const result = await listTrips({ filters: next, after });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setRows((current) => (reset ? result.rows : [...current, ...result.rows]));
    setCursor(result.cursor);
  }

  useEffect(() => {
    void load(applied, true, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  function search(event: FormEvent) {
    event.preventDefault();
    setApplied(filters);
  }

  async function exportRows(kind: "csv" | "xls") {
    setBusy(true);
    setMessage("");
    const result = await exportTrips(applied);
    if (!result.ok) setMessage(result.error);
    else {
      const header = [
        "Waktu",
        "Nomor Seri",
        "Telah Terima Dari",
        "Dari (Nama Pendek)",
        "Alamat Jemput Lengkap",
        "Ke (Nama Pendek)",
        "Alamat Tujuan Lengkap",
        "Untuk Pembayaran (Baris 1)",
        "Rute Kwitansi (Baris 2)",
        "Metode Pembayaran",
        "Total",
        "Terbilang",
        "Pengemudi",
        "WhatsApp",
        "Tol",
        "Bensin",
        "Parkir",
        "Lain",
      ];
      const body = result.rows.map((trip) => [
        formatWhen(trip.confirmedAt),
        trip.seriesCode,
        trip.receivedFrom,
        trip.originShort,
        trip.origin,
        trip.destinationShort,
        trip.destination,
        trip.paymentLine1,
        trip.paymentLine2,
        trip.paymentMethod === "transfer" ? "Transfer" : "Cash",
        String(trip.total),
        trip.terbilang,
        trip.driverName,
        trip.driverPhone,
        money(trip.tol),
        money(trip.bensin),
        money(trip.parkir),
        money(trip.lain),
      ]);
      if (kind === "csv") download("perjalanan.csv", toCsv([header, ...body]), "text/csv;charset=utf-8");
      else download("perjalanan.xls", toExcelXml(header, body), "application/vnd.ms-excel");
      setMessage(`${result.rows.length} perjalanan diunduh.`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4">
        <Input
          placeholder="Cari seri, penerima, pengemudi, atau lokasi"
          value={filters.q}
          onChange={(event) => setFilters({ ...filters, q: event.target.value })}
        />
        <select
          className="h-11 rounded-md border bg-card px-3 text-sm"
          value={filters.driver}
          onChange={(event) => setFilters({ ...filters, driver: event.target.value })}
        >
          <option value="">Semua pengemudi</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.phone}>
              {driver.name}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={filters.from}
          onChange={(event) => setFilters({ ...filters, from: event.target.value })}
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(event) => setFilters({ ...filters, to: event.target.value })}
        />
        <div className="flex flex-wrap gap-2 md:col-span-4">
          <Button type="submit">Cari</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void exportRows("csv")}>
            Unduh CSV
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void exportRows("xls")}>
            Unduh Excel
          </Button>
        </div>
      </form>

      {message && <p className="text-sm font-semibold">{message}</p>}

      {/* Tampilan Mobile */}
      <div className="space-y-3 md:hidden">
        {rows.map((trip) => (
          <article key={trip.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-base font-bold text-[#141c42]">{trip.seriesCode}</p>
              <span className="text-xs font-medium text-muted-foreground">{formatWhen(trip.confirmedAt)}</span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Terima dari: {trip.receivedFrom}
            </p>
            <p className="mt-1.5 font-semibold text-foreground">
              {trip.originShort} → {trip.destinationShort}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Jemput: {trip.origin}
            </p>
            <p className="text-xs text-muted-foreground">
              Tujuan: {trip.destination}
            </p>
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <p className="font-semibold text-[#141c42]">{rupiah(trip.total)}</p>
              <p className="text-xs text-muted-foreground">{trip.driverName}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Tampilan Tabel Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-[#faf9f6] text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3.5">Seri & Waktu</th>
              <th className="p-3.5">Terima Dari & Pembayaran</th>
              <th className="p-3.5">Rute Ringkas & Alamat Lengkap</th>
              <th className="p-3.5">Nominal</th>
              <th className="p-3.5">Pengemudi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((trip) => (
              <tr key={trip.id} className="align-top hover:bg-[#faf9f6]/60">
                <td className="p-3.5">
                  <div className="font-mono font-bold text-[#141c42]">{trip.seriesCode}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatWhen(trip.confirmedAt)}</div>
                </td>
                <td className="p-3.5">
                  <div className="font-medium text-foreground">{trip.receivedFrom}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{trip.paymentLine1}</div>
                </td>
                <td className="p-3.5 max-w-md">
                  <div className="font-semibold text-[#141c42]">
                    {trip.originShort} → {trip.destinationShort}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Jemput:</span> {trip.origin}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Tujuan:</span> {trip.destination}
                  </div>
                </td>
                <td className="p-3.5 whitespace-nowrap">
                  <div className="font-semibold text-[#141c42]">{rupiah(trip.total)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground capitalize">{trip.paymentMethod}</div>
                </td>
                <td className="p-3.5 whitespace-nowrap">
                  <div className="font-medium">{trip.driverName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{trip.driverPhone}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && <p className="text-sm text-muted-foreground">Tidak ada data perjalanan.</p>}
      {cursor && (
        <Button variant="outline" onClick={() => void load(applied, false, cursor)}>
          Muat lebih banyak
        </Button>
      )}
    </div>
  );
}

function money(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
