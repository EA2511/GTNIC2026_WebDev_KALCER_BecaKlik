import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BecaKlik — Sistem Manajemen & Pemesanan Becak Listrik Majalengka",
  description:
    "BecaKlik: Platform manajemen operasional pangkalan dan pemesanan becak listrik terintegrasi di Kabupaten Majalengka.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-becaklik.png",
    shortcut: "/logo-becaklik.png",
    apple: "/logo-becaklik.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
