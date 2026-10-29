import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { BLOCKED_CRAWLERS } from "@/lib/security/bot-policy";

/**
 * Özel alanlar (paneller, hesap, ödeme/randevu belirteçleri, API) taranmaz.
 * Bu sayfalar ayrıca noindex metası taşır. Statik dosyalar ve görseller (/_next/) açık kalır
 * ki Google sayfaları doğru işleyebilsin.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/static/", "/_next/image"],
        disallow: [
          "/dashboard",
          "/super-admin",
          "/admin",
          "/onboarding",
          "/hesabim",
          "/randevu/", "/randevu-degistir/",
          "/musteri/",
          "/siram",
          "/giris",
          "/kayit",
          "/sifremi-unuttum",
          "/isletmeler/giris",
          "/isletmeler/kayit",
          "/api/",
        ],
      },
      // Yapay zekâ / veri toplama / SEO tarayıcıları: sitenin hiçbir yeri (proxy.ts ayrıca 403 döner).
      { userAgent: [...BLOCKED_CRAWLERS], disallow: ["/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
