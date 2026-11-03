import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validasi kwitansi",
  description: "Periksa nomor seri kwitansi Gocrot Trans tanpa login.",
};

export default function ValidasiLayout({ children }: { children: ReactNode }) {
  return children;
}
