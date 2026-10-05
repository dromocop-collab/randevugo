import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import { APP_STORE_ID } from "@/lib/app-store";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const SITE_URL = "https://seninrandevun.com";
const SITE_NAME = "SeninRandevun";
const SITE_DESCRIPTION =
  "Yakınınızdaki kuaför, berber, güzellik, sağlık, spor ve bakım işletmelerini keşfedin; müsait saatleri karşılaştırıp saniyeler içinde online randevu alın.";

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
  keywords: [
    "online randevu sistemi",
    "randevu yazılımı",
    "kuaför randevu",
    "berber randevu",
    "güzellik merkezi randevu",
    "online booking Türkiye",
    "online randevu al",
    "işletme paneli",
    "randevu yönetimi",
    "çalışan yönetimi",
    "müşteri takip",
    "CRM yazılımı",
    "appointment booking system",
    "salon randevu",
    "sağlık randevu",
    "spor salonu randevu",
    "veteriner randevu",
    "danışmanlık randevu",
    "7/24 online randevu",
    "ücretsiz randevu sistemi",
    "randevu hatırlatma",
    "SMS randevu hatırlatma",
    "işletme yönetim yazılımı",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  generator: "Next.js",
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
      "Binlerce işletme arasından aradığınızı bulun, müsait saatleri görün ve anında online randevu oluşturun.",
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION,
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

/* ─── JSON-LD Structured Data ─── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/kesfet?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 1024,
        height: 1024,
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+90-530-478-8298",
          contactType: "customer service",
          email: "info@seninrandevun.com",
          areaServed: "TR",
          availableLanguage: "Turkish",
        },
      ],
      sameAs: [
        "https://instagram.com/seninrandevun",
        "https://twitter.com/seninrandevun",
        "https://linkedin.com/company/seninrandevun",
      ],
    },
  ],
};

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
