import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import { APP_STORE_ID } from "@/lib/app-store";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { graph, organizationJsonLd, serializeJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { I18nProvider } from "@/i18n/client";
import { LanguageSuggestion } from "@/i18n/language-switcher";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";
import "../globals.css";

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
// Meta (Senin Randevun işletme portföyü) alan adı doğrulaması — WhatsApp Business / işletme doğrulaması için.
verificationOther["facebook-domain-verification"] = "90se8e7m21rozro5ah9pavq07zbc17";

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("SeninRandevun — Yakınındaki İşletmeyi Keşfet, Online Randevu Al"),
      template: "%s | SeninRandevun",
    },
    description: t(SITE_DESCRIPTION),
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
      title: t("SeninRandevun — Yakınındaki İşletmeyi Keşfet"),
      description: t("Yakınındaki kuaför, berber, güzellik, sağlık ve bakım işletmelerini keşfet; müsait saatleri gör ve online randevunu anında oluştur."),
      type: "website",
      locale: LOCALE_LABELS[locale].og,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: "/og-v2.png",
          width: 1200,
          height: 630,
          alt: t("SeninRandevun ile yakındaki işletmeleri keşfedin"),
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("SeninRandevun — İşletme Keşfet ve Randevu Al"),
      description: t("Yakınınızdaki en iyi işletmeleri keşfedin, uygun saati seçin ve online randevunuzu anında oluşturun."),
      images: ["/og-v2.png"],
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
    // appleWebApp alanıyla (elle meta değil): panel/yönetim layout'ları kendi PWA adlarıyla bunu ezebilsin.
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
    other: {
      "msapplication-TileColor": "#0b6b45",
      "apple-itunes-app": `app-id=${APP_STORE_ID}, app-argument=${SITE_URL}`,
    },
  };
}

// Yalnız tanımlı diller; /xx/... gibi bilinmeyen önekler 404 olur.
export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const label = LOCALE_LABELS[locale];
  // JSON-LD: Organization + WebSite (site bağlantıları arama kutusu), etkin dilde.
  const jsonLd = graph(organizationJsonLd(), websiteJsonLd(await getT(), locale));
  return (
    <html lang={locale} dir={label.dir} suppressHydrationWarning className={`${jakarta.variable} ${spaceGrotesk.variable} h-full antialiased`}>
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
        {locale === "tr" ? (
          // Kullanıcı başka bir dili seçtiyse önekiz (Türkçe) adrese gelince o dile geç. CDN önbelleğinden bağımsız çalışsın
          // diye tarayıcıda yapılır; arama motorlarının çerezi olmadığından Türkçe sayfaları görmeye devam ederler.
          <script dangerouslySetInnerHTML={{ __html: `try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([a-z]{2})/);var l=m&&m[1];if(l&&l!=="tr"&&${JSON.stringify(LOCALES.filter((item) => item !== "tr"))}.indexOf(l)>-1){var p=location.pathname;location.replace("/"+l+(p==="/"?"":p)+location.search+location.hash)}}catch(e){}` }} />
        ) : null}
      </head>
      <body className="min-h-full">
        <I18nProvider locale={locale}>
          <AppProviders>{children}</AppProviders>
          <LanguageSuggestion />
        </I18nProvider>
      </body>
    </html>
  );
}
