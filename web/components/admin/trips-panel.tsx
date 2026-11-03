"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText, ids, Query, tables } from "@/lib/appwrite";
import { download, formatWhen, jakartaEnd, jakartaStart, normalizeSeries, rupiah, toCsv, toExcelXml } from "@/lib/format";
import type { Driver, Trip } from "@/lib/types";

type Filters = { q: string; driver: string; from: string; to: string };

export function TripsPanel() {
  const [filters, setFilters] = useState<Filters>({ q: "", driver: "", from: "", to: "" });
  const [applied, setApplied] = useState<Filters>(filters);
  const [rows, setRows] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void tables()
      .listRows<Driver>({
        databaseId: ids.databaseId,
        tableId: ids.drivers,
        queries: [Query.limit(100)],
      })
      .then((page) => setDrivers([...page.rows].sort((a, b) => a.name.localeCompare(b.name, "id"))))
      .catch((error: unknown) => setMessage(errorText(error)));
  }, []);

  async function load(next: Filters, reset: boolean, after: string | null) {
    const queries = buildQueries(next);
    if (after) queries.push(Query.cursorAfter(after));
    const page = await tables().listRows<Trip>({
      databaseId: ids.databaseId,
      tableId: ids.trips,
      queries,
    });
    const visible = page.rows.filter((trip) => matches(trip, next));
    setRows((current) => (reset ? visible : [...current, ...visible]));
    setCursor(page.rows.length >= 25 ? page.rows[page.rows.length - 1].$id : null);
  }

  useEffect(() => {
    void load(applied, true, null).catch((error: unknown) => setMessage(errorText(error)));
    // reload when the applied filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  function search(event: FormEvent) {
    event.preventDefault();
    setApplied(filters);
  }

  async function exportRows(kind: "csv" | "xls") {
    setBusy(true);
    setMessage("");
    try {
      const collected: Trip[] = [];
      let after: string | null = null;
      for (let page = 0; page < 20 && collected.length < 1000; page += 1) {
        const queries = buildQueries(applied);
        queries[queries.length - 1] = Query.limit(50);
        if (after) queries.push(Query.cursorAfter(after));
        const result = await tables().listRows<Trip>({
          databaseId: ids.databaseId,
          tableId: ids.trips,
          queries,
        });
        collected.push(...result.rows.filter((trip) => matches(trip, applied)));
        if (result.rows.length < 50) break;
        after = result.rows[result.rows.length - 1].$id;
      }
      const header = ["Waktu", "Nomor seri", "Pengemudi", "WhatsApp", "Dari", "Ke", "Total", "Tol", "Bensin", "Parkir", "Lain"];
      const body = collected.map((trip) => [
        formatWhen(trip.confirmedAt || trip.$createdAt),
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
      setMessage(`${collected.length} perjalanan diunduh.`);
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
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
            <option key={driver.$id} value={driver.phone}>
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
          <article key={trip.$id} className="rounded-xl border bg-card p-4">
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
              <tr key={trip.$id} className="border-b last:border-0">
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
        <Button variant="outline" onClick={() => void load(applied, false, cursor).catch((error: unknown) => setMessage(errorText(error)))}>
          Muat lagi
        </Button>
      )}
    </div>
  );
}

function buildQueries(filters: Filters): string[] {
  const term = filters.q.trim();
  const code = normalizeSeries(term);
  if (/^[A-Z0-9]{4}-\d{4}$/.test(code)) return [Query.equal("seriesCode", code), Query.limit(25)];
  if (term.length >= 3) return [Query.search("searchText", term), Query.limit(25)];
  const queries = [Query.orderDesc("$createdAt"), Query.limit(25)];
  if (filters.driver) queries.unshift(Query.equal("driverPhone", filters.driver));
  if (filters.from) queries.push(Query.greaterThanEqual("$createdAt", jakartaStart(filters.from)));
  if (filters.to) queries.push(Query.lessThanEqual("$createdAt", jakartaEnd(filters.to)));
  return queries;
}

function matches(trip: Trip, filters: Filters): boolean {
  if (filters.driver && trip.driverPhone !== filters.driver) return false;
  const when = new Date(trip.confirmedAt || trip.$createdAt).getTime();
  if (filters.from && when < new Date(jakartaStart(filters.from)).getTime()) return false;
  if (filters.to && when > new Date(jakartaEnd(filters.to)).getTime()) return false;
  return true;
}

function money(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
