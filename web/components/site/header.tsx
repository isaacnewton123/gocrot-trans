"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#layanan", label: "Layanan" },
  { href: "/#armada", label: "Armada" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/validasi", label: "Validasi Kwitansi" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="no-print sticky top-0 z-20 border-b border-[#e5e3dc] bg-[#f8f7f3]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-1.5" onClick={() => setOpen(false)}>
          <Image src="/logo-gocrot.webp" alt="Gocrot Trans" width={150} height={48} className="h-8 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#44403c] md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#141c42]"
            >
              {link.label}
            </Link>
          ))}
          <span className="h-4 w-px bg-[#dcd9d0]" aria-hidden="true" />
          <Link
            href="/admin/dashboard"
            className="text-xs font-semibold uppercase tracking-wider text-[#78716c] transition-colors hover:text-[#141c42]"
          >
            Admin
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-9 items-center rounded-md border border-[#d6d3cb] bg-white px-3 text-xs font-semibold uppercase tracking-wider text-[#292524] md:hidden"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Tutup" : "Menu"}
        </button>
      </div>

      {open && (
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 border-t border-[#e5e3dc] bg-white px-5 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2 text-sm font-medium text-[#292524] hover:bg-[#f8f7f3]"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/dashboard"
            className="rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wider text-[#78716c]"
            onClick={() => setOpen(false)}
          >
            Dashboard Admin
          </Link>
        </nav>
      )}
    </header>
  );
}
