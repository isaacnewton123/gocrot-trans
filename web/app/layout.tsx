import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

const description =
  "Gocrot Trans adalah layanan penyedia jasa transportasi. Tersedia sedan, MPV, dan minibus untuk perjalanan dalam kota, luar kota, maupun antar-bandara. Perjalanan dijalankan pengemudi terdaftar, dengan rute yang disepakati dan kwitansi yang bisa diperiksa.";

export const metadata: Metadata = {
  title: {
    default: "Gocrot Trans",
    template: "%s · Gocrot Trans",
  },
  description,
  applicationName: "Gocrot-Trans",
  appleWebApp: {
    capable: true,
    title: "Gocrot-Trans",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={`${sans.variable} ${serif.variable}`}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
