import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import { APP_STORE_ID } from "@/lib/app-store";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { graph, organizationJsonLd, serializeJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const verificationOther: Record<string, string> = {};
if (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION) verificationOther["msvalidate.01"] = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#081b13" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SeninRandevun — Yakınındaki İşletmeyi Keşfet, Online Randevu Al",
    template: "%s | SeninRandevun",
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "SeninRandevun — Yakınındaki İşletmeyi Keşfet",
    description:
      "Yakınındaki kuaför, berber, güzellik, sağlık ve bakım işletmelerini keşfet; müsait saatleri gör ve online randevunu anında oluştur.",
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: "/og.png",
        width: 1729,
        height: 910,
        alt: "SeninRandevun ile yakındaki işletmeleri keşfedin",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SeninRandevun — İşletme Keşfet ve Randevu Al",
    description:
      "Yakınınızdaki en iyi işletmeleri keşfedin, uygun saati seçin ve online randevunuzu anında oluşturun.",
    images: ["/og.png"],
    creator: "@seninrandevun",
    site: "@seninrandevun",
  },
  category: "technology",
  classification: "Business Software",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Arama Konsolu doğrulama kodları ortam değişkeninden gelir; kodda token tutulmaz.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION || undefined,
    ...(Object.keys(verificationOther).length ? { other: verificationOther } : {}),
  },
  other: {
    "msapplication-TileColor": "#0b6b45",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": SITE_NAME,
    "apple-itunes-app": `app-id=${APP_STORE_ID}, app-argument=${SITE_URL}`,
  },
};

/* ─── JSON-LD: Organization + WebSite (site bağlantıları arama kutusu) ─── */
const jsonLd = graph(organizationJsonLd(), websiteJsonLd());

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" dir="ltr" suppressHydrationWarning className={`${jakarta.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("sr-dashboard-skin");if(["emerald","midnight","pearl","ocean","violet","sunset","rose","graphite","champagne","forest","ruby","indigo"].includes(s)){document.documentElement.dataset.dashboardSkin=s}}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
