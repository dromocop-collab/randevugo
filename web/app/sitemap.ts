import type { MetadataRoute } from "next";
import { LOCAL_CATEGORIES, businessesForCategory, getFethiyeBusinesses, type LocalCategorySlug } from "@/lib/seo/local-seo";

const STATIC_LAST_MODIFIED = new Date("2026-08-24T00:00:00.000Z");

export const revalidate = 3600;

function businessLastModified(value: unknown): Date {
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }

  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      try {
        const parsed = toDate.call(value) as Date;
        if (Number.isFinite(parsed.getTime())) return parsed;
      } catch {
        // Use the stable deployment date below.
      }
    }
  }

  return STATIC_LAST_MODIFIED;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://seninrandevun.com").replace(/\/+$/, "");
  const alternates = (url: string) => ({ languages: { "tr-TR": url, "x-default": url } });
  const businesses = await getFethiyeBusinesses().catch(() => []);
  const localPages: MetadataRoute.Sitemap = ["mugla", "mugla/fethiye"].map((path) => ({
    url: `${baseUrl}/${path}`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "daily", priority: path === "mugla/fethiye" ? 0.95 : 0.8,
    alternates: alternates(`${baseUrl}/${path}`),
  }));
  for (const slug of Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[]) {
    const hasBusiness = businessesForCategory(businesses, slug).length > 0;
    if (hasBusiness) {
      const url = `${baseUrl}/mugla/fethiye/${slug}`;
      localPages.push({ url, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "daily", priority: 0.85, alternates: alternates(url), images: [`${baseUrl}${LOCAL_CATEGORIES[slug].image}`] });
    }
  }
  const businessPages: MetadataRoute.Sitemap = businesses
    .filter((business) => business.slug && business.isPublished && business.status === "active")
    .map((business) => {
      const url = `${baseUrl}/isletme/${encodeURIComponent(business.slug)}`;
      const images = [business.coverUrl, business.logoUrl]
        .filter((image): image is string => Boolean(image))
        .map((image) => image.startsWith("http") ? image : `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`);
      return {
        url,
        lastModified: businessLastModified(business.updatedAt || business.createdAt),
        changeFrequency: "daily" as const,
        priority: business.isVerified ? 0.86 : 0.8,
        alternates: alternates(url),
        images: images.length ? images : undefined,
      };
    });

  return [
    {
      url: baseUrl,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
      alternates: alternates(baseUrl),
      images: [`${baseUrl}/og.png`],
    },
    {
      url: `${baseUrl}/kesfet`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: alternates(`${baseUrl}/kesfet`),
    },
    {
      url: `${baseUrl}/fiyatlar`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: alternates(`${baseUrl}/fiyatlar`),
    },
    {
      url: `${baseUrl}/isletmeler`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alternates(`${baseUrl}/isletmeler`),
    },
    {
      url: `${baseUrl}/online-randevu`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: alternates(`${baseUrl}/online-randevu`),
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
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: priority as number,
      alternates: alternates(`${baseUrl}/${path}`),
    })),
    {
      url: `${baseUrl}/kuafor-randevu`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alternates(`${baseUrl}/kuafor-randevu`),
    },
    {
      url: `${baseUrl}/berber-randevu`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alternates(`${baseUrl}/berber-randevu`),
    },
    {
      url: `${baseUrl}/guzellik-merkezi-randevu`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: alternates(`${baseUrl}/guzellik-merkezi-randevu`),
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
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.75,
      alternates: alternates(`${baseUrl}/${path}`),
    })),
    ...localPages,
    ...businessPages,
  ];
}
