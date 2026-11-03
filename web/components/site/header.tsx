"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#armada", label: "Armada" },
  { href: "/#layanan", label: "Layanan" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/validasi", label: "Validasi" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-[#f7f6f3]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="shrink-0 px-2.5 py-1.5" onClick={() => setOpen(false)}>
          <Image src="/logo-gocrot.webp" alt="Gocrot Trans" width={150} height={48} className="h-8 w-auto" priority />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-foreground/80 hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <Link href="/admin/login" className="text-muted-foreground hover:text-foreground">
            Admin
          </Link>
        </nav>
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-md border border-border bg-white px-3 text-sm font-semibold md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Tutup" : "Menu"}
        </button>
      </div>
      {open && (
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2 text-sm font-semibold"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/admin/login" className="rounded-md px-2 py-2 text-sm font-semibold text-muted-foreground" onClick={() => setOpen(false)}>
            Admin
          </Link>
        </nav>
      )}
    </header>
  );
}
