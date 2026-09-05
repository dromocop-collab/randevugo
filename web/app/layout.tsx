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
const GOOGLE_ANALYTICS_ID = "G-REDQN2FVRD";
const GOOGLE_TAG_MANAGER_ID = "GTM-KH38NV3L";
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
    "msapplication-TileColor": "#0b6b45",
    "mobile-web-app-capable": "yes",
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
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/isletmeler`,
      inLanguage: "tr-TR",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TRY",
        description: "Yeni işletmelere ilk 12 ay ücretsiz kullanım",
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
      "@type": "CollectionPage",
      "@id": `${SITE_URL}/#homepage`,
      url: SITE_URL,
      name: "Yakınındaki İşletmeleri Keşfet ve Online Randevu Al",
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: ["Online randevu", "Yerel işletme keşfi", "Hizmet rezervasyonu"],
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#booking-service`,
      name: "SeninRandevun Online Randevu ve İşletme Keşif Hizmeti",
      serviceType: "Online appointment booking marketplace",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "Country", name: "Türkiye" },
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: `${SITE_URL}/kesfet`,
        availableLanguage: "Turkish",
      },
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
          name: "Randevu almak ücretli mi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hayır. İşletme keşfetmek ve online randevu oluşturmak müşteriler için tamamen ücretsizdir.",
          },
        },
        {
          "@type": "Question",
          name: "Üye olmadan randevu alabilir miyim?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "İşletmenin sunduğu akışa göre temel iletişim bilgileriyle hızlıca randevu oluşturabilirsiniz.",
          },
        },
        {
          "@type": "Question",
          name: "Randevumu değiştirebilir miyim?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "İşletmenin iptal ve değişiklik kuralları doğrultusunda randevunuzu kolayca yönetebilirsiniz.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body className="min-h-full">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ANALYTICS_ID}', { anonymize_ip: true });`}
        </Script>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');`}
        </Script>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
