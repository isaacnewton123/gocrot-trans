import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

const fleet = [
  {
    name: "Sedan",
    text: "Untuk satu sampai tiga penumpang. Cocok untuk janji kota, antar-jemput kantor, atau perjalanan yang ingin lebih tenang.",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=80",
    alt: "Sedan hitam di jalan",
  },
  {
    name: "MPV",
    text: "Untuk keluarga dan koper. Kursi lebih lega, tanpa harus berpindah kendaraan di tengah perjalanan.",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=80",
    alt: "Kendaraan keluarga di jalan",
  },
  {
    name: "Minibus",
    text: "Untuk rombongan kecil. Satu kendaraan, satu kesepakatan rute, dan satu kwitansi untuk seluruh perjalanan.",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1400&q=80",
    alt: "Minibus di jalan",
  },
  {
    name: "Antar bandara",
    text: "Jemput dan antar bandara dengan jadwal yang disepakati. Pengemudi sudah terdaftar sebelum berangkat.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80",
    alt: "Pesawat di bandara",
  },
];

const gallery = [
  {
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    alt: "Perjalanan menembus lembah",
  },
  {
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80",
    alt: "Mobil di jalan kota",
  },
  {
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    alt: "Pengemudi di dalam mobil",
  },
  {
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
    alt: "Jalan kota di siang hari",
  },
  {
    image: "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80",
    alt: "Pesawat di gerbang bandara",
  },
  {
    image: "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80",
    alt: "Sedan di malam hari",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37b12]">Transportasi komunitas</p>
            <h1 className="mt-3 font-serif text-5xl leading-[1.05] text-balance md:text-6xl">
              Perjalanan yang jelas, dari jemput sampai kwitansi.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Gocrot Trans adalah layanan penyedia jasa transportasi. Tersedia beberapa tipe kendaraan untuk perjalanan
              dalam kota, luar kota, dan antar-bandara. Perjalanan dijalankan dengan pengemudi terdaftar, rute yang
              disepakati di awal, dan tarif yang nanti bisa dicek kembali lewat nomor seri kwitansi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/validasi"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Periksa kwitansi
              </Link>
              <Link
                href="/#armada"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-white px-5 text-sm font-semibold"
              >
                Lihat armada
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <Image
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1600&q=80"
              alt="Pengemudi membawa penumpang di jalan"
              width={1600}
              height={1100}
              className="h-80 w-full object-cover md:h-[28rem]"
              priority
            />
          </div>
        </section>

        <section id="layanan" className="border-y border-border bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
            {[
              ["Pengemudi terdaftar", "Hanya nomor WhatsApp yang didaftarkan admin yang dapat mencatat perjalanan."],
              ["Rute disepakati dulu", "Asal, tujuan, dan total tarif dikonfirmasi sebelum nomor seri ditulis di kertas."],
              ["Kwitansi bisa dicek", "Penumpang memasukkan nomor seri dan melihat apakah catatan perjalanan itu sah."],
            ].map(([title, text]) => (
              <div key={title}>
                <h2 className="font-serif text-2xl">{title}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="armada" className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37b12]">Armada</p>
          <h2 className="mt-2 font-serif text-4xl">Pilih kendaraan sesuai perjalanan.</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {fleet.map((item) => (
              <article key={item.name} className="overflow-hidden rounded-2xl border border-border bg-white">
                <Image src={item.image} alt={item.alt} width={1400} height={900} className="h-56 w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-serif text-2xl">{item.name}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="galeri" className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a37b12]">Foto lain</p>
            <h2 className="mt-2 font-serif text-4xl">Di jalan, dari kota sampai bandara.</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
              {gallery.map((photo) => (
                <Image
                  key={photo.image}
                  src={photo.image}
                  alt={photo.alt}
                  width={1200}
                  height={900}
                  className="h-40 w-full rounded-xl object-cover md:h-52"
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Foto dari Unsplash.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="rounded-2xl bg-neutral-950 px-6 py-10 text-white md:px-10">
            <h2 className="font-serif text-4xl">Nomor seri di kertas bisa diperiksa di sini.</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/75">
              Setiap kwitansi memakai nomor yang sama bentuknya, misalnya A7K2-0001. Masukkan nomor itu untuk melihat
              asal, tujuan, total, nama pengemudi, dan waktu pencatatan.
            </p>
            <Link
              href="/validasi"
              className="mt-6 inline-flex h-12 items-center rounded-md bg-white px-5 text-sm font-semibold text-neutral-950"
            >
              Buka halaman validasi
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
