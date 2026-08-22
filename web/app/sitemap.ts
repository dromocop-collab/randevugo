import type { MetadataRoute } from "next";
import { LOCAL_CATEGORIES, businessesForCategory, getFethiyeBusinesses, type LocalCategorySlug } from "@/lib/seo/local-seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seninrandevun.com";
  const businesses = await getFethiyeBusinesses().catch(() => []);
  const localPages: MetadataRoute.Sitemap = ["mugla", "mugla/fethiye"].map((path) => ({
    url: `${baseUrl}/${path}`, lastModified: new Date(), changeFrequency: "daily", priority: path === "mugla/fethiye" ? 0.95 : 0.8,
  }));
  for (const slug of Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[]) {
    const hasBusiness = businessesForCategory(businesses, slug).length > 0;
    if (hasBusiness) localPages.push({ url: `${baseUrl}/mugla/fethiye/${slug}`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 });
  }
  const businessPages: MetadataRoute.Sitemap = businesses.map((business) => ({ url: `${baseUrl}/isletme/${business.slug}`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 }));

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
    ...localPages,
    ...businessPages,
  ];
}
