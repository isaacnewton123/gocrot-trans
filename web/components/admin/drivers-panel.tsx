"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDriver, listDrivers, updateDriver } from "@/lib/records";
import type { Driver } from "@/lib/types";

export function DriversPanel() {
  const [rows, setRows] = useState<Driver[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const result = await listDrivers();
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setRows(result.rows);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await addDriver({ name, phone });
    if (!result.ok) setMessage(result.error);
    else {
      setName("");
      setPhone("");
      await load();
    }
    setBusy(false);
  }

  async function save(driver: Driver, nextName: string, active: boolean) {
    setMessage("");
    const result = await updateDriver({ id: driver.id, name: nextName, active });
    if (!result.ok) setMessage(result.error);
    else await load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Nama lengkap" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="08xx atau 628xx" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Button type="submit" disabled={busy}>
          Tambah
        </Button>
      </form>
      {message && <p className="text-sm font-semibold text-destructive">{message}</p>}
      <div className="space-y-3">
        {rows.map((driver) => (
          <DriverRow key={driver.id} driver={driver} onSave={save} />
        ))}
        {!rows.length && <p className="text-muted-foreground">Belum ada pengemudi.</p>}
      </div>
    </div>
  );
}

function DriverRow({
  driver,
  onSave,
}: {
  driver: Driver;
  onSave: (driver: Driver, name: string, active: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(driver.name);
  const [active, setActive] = useState(driver.active);
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
      <div>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <p className="mt-1 font-mono text-sm text-muted-foreground">{driver.phone}</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        Aktif
      </label>
      <Button variant="outline" onClick={() => void onSave(driver, name, active)}>
        Simpan
      </Button>
    </div>
  );
}
