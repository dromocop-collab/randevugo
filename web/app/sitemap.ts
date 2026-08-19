import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seninrandevun.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/kesfet`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fiyatlar`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/isletmeler`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/online-randevu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...[
      ["ozellikler", 0.9],
      ["hakkimizda", 0.6],
      ["iletisim", 0.6],
      ["yardim-merkezi", 0.7],
      ["isletmeler/yardim", 0.75],
      ["guvenlik", 0.6],
      ["kvkk", 0.4],
      ["gizlilik", 0.4],
      ["kullanim-kosullari", 0.4],
      ["cerez-politikasi", 0.4],
    ].map(([path, priority]) => ({
      url: `${baseUrl}/${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: priority as number,
    })),
    {
      url: `${baseUrl}/kuafor-randevu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/berber-randevu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guzellik-merkezi-randevu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...[
      "spa-randevu",
      "saglik-randevu",
      "spor-randevu",
      "veteriner-randevu",
      "nail-studio-randevu",
      "danismanlik-randevu",
    ].map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];
}
