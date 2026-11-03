import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-5 py-16">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">Komunitas taxi</p>
        <h1 className="mt-2 font-serif text-5xl leading-none">Gocrot Trans</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Cek apakah nomor seri di kwitansi benar-benar tercatat. Penumpang tidak perlu login.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href="/validasi"
          className="inline-flex h-14 items-center justify-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground"
        >
          Validasi kwitansi
        </Link>
        <Link
          href="/admin/login"
          className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold"
        >
          Masuk admin
        </Link>
      </div>
    </main>
  );
}
