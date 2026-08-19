import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seninrandevun.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/super-admin/",
          "/admin/",
          "/onboarding/",
          "/hesabim/",
          "/randevu/",
          "/musteri/",
          "/isletmeler/giris/",
          "/isletmeler/kayit/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
