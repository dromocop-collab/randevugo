import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { AppProviders } from "@/components/layout/app-providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://seninrandevun.com";
const SITE_NAME = "SeninRandevun";
const GOOGLE_ANALYTICS_ID = "G-REDQN2FVRD";
const SITE_DESCRIPTION =
  "Türkiye'nin #1 akıllı online randevu platformu. Kuaför, güzellik merkezi, berber, sağlık, spor ve daha fazlası için hızlı randevu alın. İşletmeniz için profesyonel randevu yönetimi, çalışan takibi, müşteri CRM ve gelişmiş analitik.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f9" },
    { media: "(prefers-color-scheme: dark)", color: "#09101a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SeninRandevun — Online Randevu Sistemi | Türkiye'nin #1 Randevu Platformu",
    template: "%s — SeninRandevun | Online Randevu Sistemi",
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
    title: "SeninRandevun — Türkiye'nin #1 Akıllı Online Randevu Platformu",
    description:
      "Binlerce işletme arasından aradığınızı bulun, müsait saatleri görün ve anında online randevu oluşturun. İşletmeniz için profesyonel randevu, çalışan ve müşteri yönetimi.",
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: "/logo.png",
        width: 1024,
        height: 1024,
        alt: "SeninRandevun — Online Randevu Sistemi Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SeninRandevun — Online Randevu Sistemi",
    description:
      "Online randevu, çalışan yönetimi, CRM ve gelişmiş analizleri tek panelde sunan premium SaaS. 14 gün ücretsiz deneyin!",
    images: ["/logo.png"],
    creator: "@seninrandevun",
    site: "@seninrandevun",
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "tr-TR": SITE_URL,
    },
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
    // Add these when you have them:
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  other: {
    "msapplication-TileColor": "#0284c7",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": SITE_NAME,
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
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
        description: "14 gün ücretsiz deneme",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "1200",
        bestRating: "5",
        worstRating: "1",
      },
      featureList: [
        "Online Randevu Yönetimi",
        "Çalışan ve Vardiya Yönetimi",
        "Müşteri CRM",
        "Gelişmiş Analitik Dashboard",
        "SMS ve E-posta Hatırlatmaları",
        "7/24 Online Randevu Sayfası",
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: SITE_URL,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "SeninRandevun nedir?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SeninRandevun, işletmelerin online randevu almasını, çalışan yönetimini, müşteri takibini ve gelişmiş analizleri tek bir panelden yapmasını sağlayan Türkiye'nin akıllı randevu platformudur.",
          },
        },
        {
          "@type": "Question",
          name: "SeninRandevun ücretsiz mi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Evet, 14 gün boyunca tüm özellikleri ücretsiz deneyebilirsiniz. Kredi kartı gerekmez.",
          },
        },
        {
          "@type": "Question",
          name: "Hangi sektörler için uygundur?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kuaför, berber, güzellik merkezi, spa, spor salonu, sağlık hizmetleri, veteriner, danışmanlık, eğitim ve daha birçok randevu bazlı sektör için uygundur.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" dir="ltr" className={`${jakarta.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ANALYTICS_ID}');`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
