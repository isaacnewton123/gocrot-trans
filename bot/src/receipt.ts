export function angkaKeTerbilang(nilaiInput: number): string {
  const nilai = Math.abs(Math.floor(nilaiInput));
  if (nilai === 0) return "Nol";

  const huruf = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  function konversi(n: number): string {
    if (n < 12) {
      return huruf[n];
    }
    if (n < 20) {
      return `${konversi(n - 10)} Belas`.trim();
    }
    if (n < 100) {
      const depan = konversi(Math.floor(n / 10));
      const belakang = konversi(n % 10);
      return [depan, "Puluh", belakang].filter(Boolean).join(" ");
    }
    if (n < 200) {
      const sisa = konversi(n - 100);
      return ["Seratus", sisa].filter(Boolean).join(" ");
    }
    if (n < 1000) {
      const depan = konversi(Math.floor(n / 100));
      const belakang = konversi(n % 100);
      return [depan, "Ratus", belakang].filter(Boolean).join(" ");
    }
    if (n < 2000) {
      const sisa = konversi(n - 1000);
      return ["Seribu", sisa].filter(Boolean).join(" ");
    }
    if (n < 1000000) {
      const depan = konversi(Math.floor(n / 1000));
      const belakang = konversi(n % 1000);
      return [depan, "Ribu", belakang].filter(Boolean).join(" ");
    }
    if (n < 1000000000) {
      const depan = konversi(Math.floor(n / 1000000));
      const belakang = konversi(n % 1000000);
      return [depan, "Juta", belakang].filter(Boolean).join(" ");
    }
    if (n < 1000000000000) {
      const depan = konversi(Math.floor(n / 1000000000));
      const belakang = konversi(n % 1000000000);
      return [depan, "Miliar", belakang].filter(Boolean).join(" ");
    }
    return "";
  }

  return konversi(nilai).replace(/\s+/g, " ").trim();
}

export function terbilangRupiah(total: number): string {
  return `${angkaKeTerbilang(total)} Rupiah`;
}

/**
 * Menghasilkan nama lokasi pendek yang rapi untuk baris kwitansi
 * dari alamat lengkap (tanpa membuang alamat lengkap di field utama).
 * Contoh:
 * "PT Chang Shin Indonesia, Jl. Dusun Gintungkolot, Karawang, 41371"
 * -> "PT Chang Shin Indonesia, Karawang"
 */
export function deriveShortPlace(fullAddress: string | null | undefined): string {
  if (!fullAddress) return "";
  const parts = fullAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\d{5}$/.test(p)) // kecualikan kode pos 5 digit dari nama pendek
    .filter(
      (p) =>
        !/^(indonesia|id|jawa barat|jawa tengah|jawa timur|banten|dki jakarta|daerah khusus ibukota jakarta|bali|sumatera.*)$/i.test(
          p,
        ),
    );

  if (parts.length === 0) return fullAddress.trim().slice(0, 60);
  if (parts.length === 1) return parts[0].slice(0, 60);

  const first = parts[0];
  // Cari elemen kota/kabupaten atau ambil elemen terakhir yang bukan jalan/dusun
  const cityCandidate =
    parts.find((p, idx) => idx > 0 && /^(kota|kab\.?|kabupaten)\b/i.test(p)) ??
    parts[parts.length - 1];

  if (first.toLowerCase() === cityCandidate.toLowerCase()) {
    return first.slice(0, 60);
  }
  return `${first}, ${cityCandidate}`.slice(0, 65);
}

export function deriveReceivedFrom(
  explicitReceivedFrom: string | null | undefined,
  originShort: string | null | undefined,
): string {
  const cleaned = explicitReceivedFrom?.trim();
  if (cleaned && cleaned !== "-" && cleaned.toLowerCase() !== "null") {
    return cleaned.slice(0, 90);
  }
  if (originShort) {
    const firstPart = originShort.split(",")[0]?.trim() ?? "";
    if (/^(pt\.?|cv\.?|hotel|rs\.?|rumah sakit|kantor|bank|yayasan)\b/i.test(firstPart)) {
      return firstPart.slice(0, 90);
    }
  }
  return "Penumpang / Pelanggan GOCROT TRANS";
}

export function derivePaymentLine1(explicitLine1: string | null | undefined): string {
  const cleaned = explicitLine1?.trim();
  if (cleaned && cleaned !== "-" && cleaned.toLowerCase() !== "null") {
    return cleaned.slice(0, 95);
  }
  return "Layanan Jasa Transportasi Perjalanan";
}

export function derivePaymentLine2(
  explicitLine2: string | null | undefined,
  originShort: string,
  destinationShort: string,
): string {
  const cleaned = explicitLine2?.trim();
  const isPP = cleaned ? /\b(pp|pulang[\s-]*pergi)\b/i.test(cleaned) : false;
  if (originShort && destinationShort) {
    return `Rute ${originShort} — ${destinationShort}${isPP ? " (PP)" : ""}`.slice(0, 95);
  }
  if (cleaned && cleaned !== "-" && cleaned.toLowerCase() !== "null") {
    return cleaned.slice(0, 95);
  }
  return "Perjalanan Dalam / Luar Kota";
}

