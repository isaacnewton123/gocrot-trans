"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { account, errorText, ids, isMissing, tables } from "@/lib/appwrite";
import { envReady } from "@/lib/env";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await account().createEmailPasswordSession({ email, password });
      const user = await account().get();
      if (!user.labels?.includes("admin")) {
        await account().deleteSession({ sessionId: "current" });
        setError("Akun ini bukan admin. Minta label admin di konsol Appwrite.");
        return;
      }
      try {
        await tables().updateRow({
          databaseId: ids.databaseId,
          tableId: ids.admins,
          rowId: user.$id,
          data: { name: user.name || email, email, active: true },
        });
      } catch (err) {
        if (!isMissing(err)) throw err;
        await tables().createRow({
          databaseId: ids.databaseId,
          tableId: ids.admins,
          rowId: user.$id,
          data: { name: user.name || email, email, active: true },
        });
      }
      router.push("/admin/dashboard");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Card>
        <CardHeader>
          <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Admin</p>
          <CardTitle>Masuk dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {!envReady && <p className="mb-4 text-sm text-amber-800">Konfigurasi Appwrite belum diisi.</p>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !envReady}>
              {busy ? "Masuk..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
