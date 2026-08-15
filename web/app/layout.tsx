import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://seninrandevun.com"),
  title: {
    default: "SeninRandevun | Online Randevu Sistemi",
    template: "%s | SeninRandevun",
  },
  description:
    "Isletmeler icin profesyonel online randevu, calisan, hizmet ve musteri yonetim platformu.",
  keywords: [
    "randevu yazilimi",
    "kuafor randevu",
    "online booking",
    "online randevu al",
    "isletme paneli",
  ],
  openGraph: {
    title: "SeninRandevun",
    description:
      "Isletmenizin randevularini tek panelden yonetin. Hizmet, ekip ve musteri sureclerini dijitallestirin.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "SeninRandevun",
    description:
      "Online randevu, calisan yonetimi, CRM ve analizleri tek panelde sunan premium SaaS.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${jakarta.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
