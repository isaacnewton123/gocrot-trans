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
      const header = ["Waktu", "Nomor seri", "Pengemudi", "WhatsApp", "Dari", "Ke", "Total", "Tol", "Bensin", "Parkir", "Lain"];
      const body = result.rows.map((trip) => [
        formatWhen(trip.confirmedAt),
        trip.seriesCode,
        trip.driverName,
        trip.driverPhone,
        trip.origin,
        trip.destination,
        String(trip.total),
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
        <Input placeholder="Cari seri, nama, atau lokasi" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
        <select
          className="h-11 rounded-md border bg-card px-3"
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
        <Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
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
      <div className="space-y-3 md:hidden">
        {rows.map((trip) => (
          <article key={trip.id} className="rounded-xl border bg-card p-4">
            <p className="font-mono text-lg font-bold">{trip.seriesCode}</p>
            <p className="mt-1">{trip.origin} → {trip.destination}</p>
            <p className="font-semibold">{rupiah(trip.total)}</p>
            <p className="text-sm text-muted-foreground">{trip.driverName} · {formatWhen(trip.confirmedAt)}</p>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3">Seri</th>
              <th className="p-3">Rute</th>
              <th className="p-3">Total</th>
              <th className="p-3">Pengemudi</th>
              <th className="p-3">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((trip) => (
              <tr key={trip.id} className="border-b last:border-0">
                <td className="p-3 font-mono">{trip.seriesCode}</td>
                <td className="p-3">{trip.origin} → {trip.destination}</td>
                <td className="p-3">{rupiah(trip.total)}</td>
                <td className="p-3">{trip.driverName}</td>
                <td className="p-3">{formatWhen(trip.confirmedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="text-muted-foreground">Tidak ada perjalanan.</p>}
      {cursor && (
        <Button variant="outline" onClick={() => void load(applied, false, cursor)}>
          Muat lagi
        </Button>
      )}
    </div>
  );
}

function money(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
