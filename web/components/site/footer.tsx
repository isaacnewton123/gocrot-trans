import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex px-2.5 py-1.5">
            <Image src="/logo-gocrot.webp" alt="" width={140} height={44} className="h-8 w-auto" />
          </span>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Gocrot Trans menyediakan perjalanan dengan pengemudi terdaftar. Nomor seri pada kwitansi bisa diperiksa
            kapan saja, tanpa login.
          </p>
        </div>
        <div className="flex gap-5 text-sm font-semibold">
          <Link href="/validasi">Validasi kwitansi</Link>
          <Link href="/admin/login" className="text-muted-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
