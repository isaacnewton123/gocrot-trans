"use client";

import { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { DriversPanel } from "@/components/admin/drivers-panel";
import { LogsPanel } from "@/components/admin/logs-panel";
import { SeriesPanel } from "@/components/admin/series-panel";
import { TripsPanel } from "@/components/admin/trips-panel";

const tabs = [
  ["trips", "Perjalanan"],
  ["drivers", "Pengemudi"],
  ["series", "Nomor seri"],
  ["logs", "Log chat"],
] as const;

type Tab = (typeof tabs)[number][0];

export function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("trips");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="font-serif text-4xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <SignOutButton redirectUrl="/sign-in">
          <Button variant="outline">Keluar</Button>
        </SignOutButton>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <Button key={id} variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      <section className="mt-5">
        {tab === "trips" && <TripsPanel />}
        {tab === "drivers" && <DriversPanel />}
        {tab === "series" && <SeriesPanel />}
        {tab === "logs" && <LogsPanel />}
      </section>
    </main>
  );
}
