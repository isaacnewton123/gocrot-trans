"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWhen } from "@/lib/format";
import { listLogs } from "@/lib/records";
import type { ChatLog } from "@/lib/types";

export function LogsPanel() {
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<ChatLog[]>([]);
  const [message, setMessage] = useState("");

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setMessage("");
    const result = await listLogs(phone);
    if (!result.ok) setMessage(result.error);
    else setRows(result.rows);
  }

  useEffect(() => {
    void load();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <form onSubmit={load} className="flex gap-2">
        <Input placeholder="Filter nomor, kosongkan untuk semua" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Button type="submit">Cari</Button>
      </form>
      {message && <p className="text-sm font-semibold text-destructive">{message}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">
              {formatWhen(row.createdAt)} · {row.phone} · {row.direction === "in" ? "masuk" : "keluar"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{row.body}</p>
          </article>
        ))}
        {!rows.length && <p className="text-muted-foreground">Belum ada log.</p>}
      </div>
    </div>
  );
}
