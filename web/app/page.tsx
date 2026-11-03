import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

const fleet = [
  {
    name: "Sedan",
    text: "Kapasitas satu hingga tiga penumpang. Ideal untuk keperluan dinas dalam kota, kunjungan bisnis, atau penjemputan personal.",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=80",
    alt: "Sedan di jalan raya",
  },
  {
    name: "MPV Keluarga",
    text: "Kabin lebih lapang untuk keluarga maupun bagasi perjalanan luar kota, tanpa perlu berganti kendaraan.",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=80",
    alt: "Kendaraan MPV di jalan",
  },
  {
    name: "Minibus Pariwisata",
    text: "Untuk rombongan kantor atau keluarga besar. Satu kesepakatan rute dan satu bukti kwitansi resmi untuk seluruh perjalanan.",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1400&q=80",
    alt: "Minibus di jalan",
  },
  {
    name: "Antar-Jemput Bandara",
    text: "Penjemputan dan pengantaran bandara terjadwal dengan pengemudi terdaftar serta rincian biaya tol dan parkir yang transparan.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80",
    alt: "Pesawat di bandara",
  },
];

const gallery = [
  {
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    alt: "Perjalanan antarkota",
  },
  {
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80",
    alt: "Kendaraan di jalan raya",
  },
  {
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    alt: "Pengemudi bertugas",
  },
  {
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    alt: "Lalu lintas perkotaan",
  },
  {
    image: "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80",
    alt: "Terminal bandara",
  },
  {
    image: "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80",
    alt: "Perjalanan sore hari",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f7f3] text-[#18181b]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1c2654]/80">
              Jasa Transportasi Resmi · Karawang
            </p>
            <h1 className="mt-3 font-serif text-4xl font-normal leading-[1.12] tracking-tight text-[#141c42] md:text-5xl">
              Perjalanan yang tercatat rapi, dari titik jemput hingga kwitansi resmi.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#57534e]">
              Gocrot Trans menyediakan layanan transportasi sedan, MPV, dan minibus untuk perjalanan dalam kota, luar kota, maupun antar-jemput bandara. Setiap perjalanan dijalankan oleh pengemudi terdaftar dan dilengkapi kwitansi digital permanen yang dapat diverifikasi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/validasi"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1c2654] px-6 text-sm font-semibold text-white transition hover:bg-[#141c42]"
              >
                Validasi Nomor Kwitansi
              </Link>
              <Link
                href="/#armada"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[#d6d3cb] bg-white px-6 text-sm font-semibold text-[#292524] transition hover:bg-[#f2f0ea]"
              >
                Lihat Pilihan Armada
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e5e3dc] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <Image
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1600&q=80"
              alt="Pengemudi membawa penumpang di jalan"
              width={1600}
              height={1100}
              className="h-72 w-full rounded-lg object-cover md:h-[24rem]"
              priority
            />
          </div>
        </section>

        {/* Pilar Layanan */}
        <section id="layanan" className="border-y border-[#e5e3dc] bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
            {[
              [
                "01 · Pengemudi Terdaftar",
                "Hanya pengemudi resmi yang terdaftar pada sistem Gocrot Trans yang dapat menerbitkan nomor seri kwitansi perjalanan.",
              ],
              [
                "02 · Alamat & Rute Terpetakan",
                "Titik jemput, tujuan, hingga detail jalan dan kode pos diverifikasi dan disimpan secara permanen di dalam arsip perjalanan.",
              ],
              [
                "03 · Kwitansi Digital Permanen",
                "Setiap nomor seri menampilkan dokumen kwitansi digital resmi berstempel yang tidak dapat diubah oleh pihak luar.",
              ],
            ].map(([title, text]) => (
              <div key={title} className="border-l-2 border-[#1c2654]/20 pl-5">
                <h2 className="font-serif text-xl text-[#141c42]">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#57534e]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pilihan Armada */}
        <section id="armada" className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1c2654]/80">Armada Kami</p>
          <h2 className="mt-2 font-serif text-3xl text-[#141c42]">Kendaraan sesuai kebutuhan perjalanan.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {fleet.map((item) => (
              <article
                key={item.name}
                className="overflow-hidden rounded-xl border border-[#e5e3dc] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                <Image src={item.image} alt={item.alt} width={1400} height={900} className="h-56 w-full object-cover" />
                <div className="p-6">
                  <h3 className="font-serif text-2xl text-[#141c42]">{item.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#57534e]">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Galeri */}
        <section id="galeri" className="border-t border-[#e5e3dc] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1c2654]/80">Dokumentasi</p>
            <h2 className="mt-2 font-serif text-3xl text-[#141c42]">Perjalanan dalam dan luar kota.</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.map((photo) => (
                <Image
                  key={photo.image}
                  src={photo.image}
                  alt={photo.alt}
                  width={1200}
                  height={900}
                  className="h-40 w-full rounded-lg border border-[#e5e3dc] object-cover md:h-52"
                />
              ))}
            </div>
          </div>
        </section>

        {/* Banner Validasi Kwitansi (Light Editorial Card) */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-[#d6d3cb] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] md:flex-row md:items-center md:p-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1c2654]/80">
                Verifikasi Online
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#141c42]">
                Periksa keaslian nomor seri kwitansi Anda.
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#57534e]">
                Masukkan kode seri yang tertera pada lembar kwitansi (misalnya <span className="font-mono font-semibold text-[#141c42]">KVKS-0001</span>) untuk melihat kwitansi digital resmi berstempel beserta rincian rute dan alamat lengkap.
              </p>
            </div>
            <Link
              href="/validasi"
              className="inline-flex h-11 shrink-0 items-center rounded-lg bg-[#1c2654] px-6 text-sm font-semibold text-white transition hover:bg-[#141c42]"
            >
              Buka Halaman Validasi
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
