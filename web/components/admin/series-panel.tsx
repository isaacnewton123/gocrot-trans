"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText, executeFunction, ids, Query, tables } from "@/lib/appwrite";
import type { GenerateResult, Series } from "@/lib/types";

export function SeriesPanel() {
  const [status, setStatus] = useState("available");
  const [rows, setRows] = useState<Series[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [count, setCount] = useState(100);
  const [reason, setReason] = useState("Buku kwitansi hilang");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(reset: boolean) {
    const queries = [Query.limit(30)];
    if (status === "all") queries.unshift(Query.orderDesc("sequence"));
    else {
      queries.unshift(Query.orderAsc("sequence"));
      queries.unshift(Query.equal("status", status));
    }
    const after = reset ? null : cursor;
    if (after) queries.push(Query.cursorAfter(after));
    const page = await tables().listRows<Series>({
      databaseId: ids.databaseId,
      tableId: ids.series,
      queries,
    });
    setRows((current) => (reset ? page.rows : [...current, ...page.rows]));
    setCursor(page.rows.length === 30 ? page.rows[page.rows.length - 1].$id : null);
  }

  useEffect(() => {
    setCursor(null);
    void load(true).catch((error: unknown) => setMessage(errorText(error)));
    // status is the only filter; load closes over the latest status via this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    const total = Math.floor(count);
    if (total < 1 || total > 9999) {
      setMessage("Jumlah harus 1 sampai 9999.");
      return;
    }
    setBusy(true);
    setMessage("Membuat nomor seri...");
    let made = 0;
    try {
      let remaining = total;
      let prefix = "";
      let suffixStart = 0;
      let sequenceStart = 0;
      let first = "";
      let last = "";
      while (remaining > 0) {
        const chunk = Math.min(200, remaining);
        const result = await executeFunction<GenerateResult>({
          action: "generate",
          count: chunk,
          prefix: prefix || undefined,
          suffixStart: suffixStart || undefined,
          sequenceStart: sequenceStart || undefined,
        });
        prefix = result.prefix;
        suffixStart = result.nextSuffix;
        sequenceStart = result.nextSequence;
        if (!first) first = result.from;
        last = result.to;
        made += result.created;
        remaining -= result.created;
        setMessage(`Membuat ${made} dari ${total}...`);
      }
      setMessage(`Selesai: ${made} nomor, ${first} sampai ${last}.`);
      setStatus("available");
      await load(true);
    } catch (error) {
      setMessage(
        `${errorText(error)}${made ? ` Sebagian sudah dibuat (${made}). Cek daftar sebelum mengulang.` : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function setBlocked(row: Series, blocked: boolean) {
    try {
      await tables().updateRow({
        databaseId: ids.databaseId,
        tableId: ids.series,
        rowId: row.$id,
        data: blocked
          ? { status: "blocked", blockedReason: reason || "Diblokir admin" }
          : { status: "available", blockedReason: "" },
      });
      await load(true);
    } catch (error) {
      setMessage(errorText(error));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={generate} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[8rem_1fr_auto] md:items-center">
        <Input
          type="number"
          min={1}
          max={9999}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
        <p className="text-sm text-muted-foreground">Satu klik membuat satu buku. Awalan acak, akhiran berurutan.</p>
        <Button type="submit" disabled={busy}>
          {busy ? "Memproses..." : "Buat nomor"}
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {["available", "used", "blocked", "all"].map((value) => (
          <Button key={value} variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>
            {labelStatus(value)}
          </Button>
        ))}
      </div>
      <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan blokir" />
      {message && <p className="text-sm font-semibold">{message}</p>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="p-3">Nomor</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.$id} className="border-b last:border-0">
                <td className="p-3 font-mono text-base">{row.code}</td>
                <td className="p-3">
                  <Badge variant={row.status === "used" ? "valid" : row.status === "blocked" ? "warn" : "default"}>
                    {labelStatus(row.status)}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  {row.status === "available" && (
                    <Button size="sm" variant="outline" onClick={() => void setBlocked(row, true)}>
                      Blokir
                    </Button>
                  )}
                  {row.status === "blocked" && (
                    <Button size="sm" variant="outline" onClick={() => void setBlocked(row, false)}>
                      Buka blokir
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cursor && (
        <Button variant="outline" onClick={() => void load(false).catch((error: unknown) => setMessage(errorText(error)))}>
          Muat lagi
        </Button>
      )}
    </div>
  );
}

function labelStatus(status: string): string {
  if (status === "available") return "Tersedia";
  if (status === "used") return "Terpakai";
  if (status === "blocked") return "Diblokir";
  return "Semua";
}
