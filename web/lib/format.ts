export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

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
    if (n < 12) return huruf[n];
    if (n < 20) return `${konversi(n - 10)} Belas`.trim();
    if (n < 100) {
      return [konversi(Math.floor(n / 10)), "Puluh", konversi(n % 10)].filter(Boolean).join(" ");
    }
    if (n < 200) {
      return ["Seratus", konversi(n - 100)].filter(Boolean).join(" ");
    }
    if (n < 1000) {
      return [konversi(Math.floor(n / 100)), "Ratus", konversi(n % 100)].filter(Boolean).join(" ");
    }
    if (n < 2000) {
      return ["Seribu", konversi(n - 1000)].filter(Boolean).join(" ");
    }
    if (n < 1000000) {
      return [konversi(Math.floor(n / 1000)), "Ribu", konversi(n % 1000)].filter(Boolean).join(" ");
    }
    if (n < 1000000000) {
      return [konversi(Math.floor(n / 1000000)), "Juta", konversi(n % 1000000)]
        .filter(Boolean)
        .join(" ");
    }
    if (n < 1000000000000) {
      return [konversi(Math.floor(n / 1000000000)), "Miliar", konversi(n % 1000000000)]
        .filter(Boolean)
        .join(" ");
    }
    return "";
  }

  return konversi(nilai).replace(/\s+/g, " ").trim();
}

export function terbilangRupiah(total: number): string {
  return `${angkaKeTerbilang(total)} Rupiah`;
}

export function deriveShortPlace(fullAddress: string | null | undefined): string {
  if (!fullAddress) return "";
  const parts = fullAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\d{5}$/.test(p))
    .filter(
      (p) =>
        !/^(indonesia|id|jawa barat|jawa tengah|jawa timur|banten|dki jakarta|daerah khusus ibukota jakarta|bali|sumatera.*)$/i.test(
          p,
        ),
    );

  if (parts.length === 0) return fullAddress.trim().slice(0, 60);
  if (parts.length === 1) return parts[0].slice(0, 60);

  const first = parts[0];
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

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function jakartaStart(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toISOString();
}

export function jakartaEnd(date: string): string {
  return new Date(`${date}T23:59:59.999+07:00`).toISOString();
}

export function normalizeSeries(input: string): string {
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (/^[A-Z0-9]{8}$/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4)}`;
  return input.trim().toUpperCase();
}

export function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export function toExcelXml(headers: string[], rows: string[][]): string {
  const header = headers.map((cell) => xmlCell(cell)).join("");
  const body = rows
    .map((row) => `<Row>${row.map((cell) => xmlCell(cell)).join("")}</Row>`)
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Perjalanan"><Table>
<Row>${header}</Row>
${body}
</Table></Worksheet></Workbook>`;
}

function xmlCell(value: string): string {
  return `<Cell><Data ss:Type="String">${value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</Data></Cell>`;
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
