import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://seninrandevun.com").replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/dashboard",
          "/super-admin/",
          "/super-admin",
          "/admin/",
          "/admin",
          "/onboarding/",
          "/onboarding",
          "/hesabim/",
          "/hesabim",
          "/randevu/",
          "/musteri/",
          "/giris",
          "/kayit",
          "/sifremi-unuttum",
          "/isletmeler/giris/",
          "/isletmeler/giris",
          "/isletmeler/kayit/",
          "/isletmeler/kayit",
          "/api/",
          "/api",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
