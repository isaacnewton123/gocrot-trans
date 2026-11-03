import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-[#e5e3dc] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex py-1">
            <Image src="/logo-gocrot.webp" alt="Gocrot Trans" width={140} height={44} className="h-8 w-auto" />
          </span>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#57534e]">
            Gocrot Trans — Layanan Jasa Transportasi Resmi. Jl. Bina Marga, Jomin Barat, Kec. Kota Baru, Karawang, Jawa Barat 41374.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-[#44403c]">
          <Link href="/validasi" className="hover:text-[#141c42]">
            Validasi Kwitansi
          </Link>
          <Link href="/admin/dashboard" className="text-[#78716c] hover:text-[#141c42]">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
