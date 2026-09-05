import type { MetadataRoute } from "next";
import { LOCAL_CATEGORIES, businessesForCategory, getFethiyeBusinesses, type LocalCategorySlug } from "@/lib/seo/local-seo";
import { searchBusinesses } from "@/features/discovery/search-repository";

/** Use a recent date for static pages to signal freshness to crawlers. */
const STATIC_LAST_MODIFIED = new Date();

export const revalidate = 3600;

const CATEGORY_IMAGES: Record<string, string> = {
  kuafor: "/images/categories/kuafor.png",
  berber: "/images/categories/berber.png",
  guzellik: "/images/categories/guzellik.png",
  spa: "/images/categories/spa.png",
  nail: "/images/categories/nail.png",
  spor: "/images/categories/spor.png",
  saglik: "/images/categories/saglik.png",
  danismanlik: "/images/categories/danismanlik.png",
  veteriner: "/images/categories/veteriner.png",
  yazilim: "/images/categories/yazilim.png",
};

/**
 * Ensure image URLs are valid inside XML by encoding bare `&` as `&amp;`.
 * Next.js sitemap generator does NOT XML-encode image URLs, causing
 * Google Search Console parse errors (e.g. Firebase Storage token URLs).
 */
function xmlSafeUrl(url: string): string {
  return url.replace(/&(?!amp;)/g, "&amp;");
}

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

  // Fetch ALL active businesses for sitemap (not just Fethiye)
  const [allBusinesses, fethiyeBusinesses] = await Promise.all([
    searchBusinesses({ maxResults: 500 }).catch(() => []),
    getFethiyeBusinesses().catch(() => []),
  ]);

  // Local SEO pages
  const localPages: MetadataRoute.Sitemap = ["mugla", "mugla/fethiye"].map((path) => ({
    url: `${baseUrl}/${path}`, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "daily", priority: path === "mugla/fethiye" ? 0.95 : 0.8,
    alternates: alternates(`${baseUrl}/${path}`),
  }));
  for (const slug of Object.keys(LOCAL_CATEGORIES) as LocalCategorySlug[]) {
    const hasBusiness = businessesForCategory(fethiyeBusinesses, slug).length > 0;
    if (hasBusiness) {
      const url = `${baseUrl}/mugla/fethiye/${slug}`;
      localPages.push({ url, lastModified: STATIC_LAST_MODIFIED, changeFrequency: "daily", priority: 0.85, alternates: alternates(url), images: [xmlSafeUrl(`${baseUrl}${LOCAL_CATEGORIES[slug].image}`)] });
    }
  }

  // All active business pages
  const businessPages: MetadataRoute.Sitemap = allBusinesses
    .filter((business) => business.slug && business.isPublished && business.status === "active")
    .map((business) => {
      const url = `${baseUrl}/isletme/${encodeURIComponent(business.slug)}`;
      const images = [business.coverUrl, business.logoUrl]
        .filter((image): image is string => Boolean(image))
        .map((image) => image.startsWith("http") ? image : `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`)
        .map(xmlSafeUrl);
      return {
        url,
        lastModified: businessLastModified(business.updatedAt || business.createdAt),
        changeFrequency: "daily" as const,
        priority: business.isVerified ? 0.86 : 0.8,
        alternates: alternates(url),
        images: images.length ? images : undefined,
      };
    });

  // Category landing pages with images
  const categoryLandingPages: MetadataRoute.Sitemap = [
    { path: "kuafor-randevu", cat: "kuafor", priority: 0.85 },
    { path: "berber-randevu", cat: "berber", priority: 0.85 },
    { path: "guzellik-merkezi-randevu", cat: "guzellik", priority: 0.85 },
    { path: "spa-randevu", cat: "spa", priority: 0.8 },
    { path: "saglik-randevu", cat: "saglik", priority: 0.8 },
    { path: "spor-randevu", cat: "spor", priority: 0.8 },
    { path: "veteriner-randevu", cat: "veteriner", priority: 0.8 },
    { path: "nail-studio-randevu", cat: "nail", priority: 0.8 },
    { path: "danismanlik-randevu", cat: "danismanlik", priority: 0.8 },
    { path: "yazilim-web-randevu", cat: "yazilim", priority: 0.8 },
  ].map(({ path, cat, priority }) => ({
    url: `${baseUrl}/${path}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly" as const,
    priority,
    alternates: alternates(`${baseUrl}/${path}`),
    images: CATEGORY_IMAGES[cat] ? [xmlSafeUrl(`${baseUrl}${CATEGORY_IMAGES[cat]}`)] : undefined,
  }));

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
      images: [`${baseUrl}/og.png`],
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
    ...categoryLandingPages,
    ...localPages,
    ...businessPages,
  ];
}
