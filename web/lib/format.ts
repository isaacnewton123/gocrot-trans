export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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
