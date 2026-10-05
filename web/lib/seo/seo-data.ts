import { cache } from "react";
import { unstable_cache } from "next/cache";
import { searchBusinesses } from "@/features/discovery/search-repository";
import { listBookableServices } from "@/features/services/service-repository";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { SEO_CATEGORIES, SEO_CATEGORY_SLUGS, categoryDisplayName } from "@/lib/seo/categories";
import { displayPlace, rankByFrequency, seoSlug } from "@/lib/seo/text";
import type { Business } from "@/types/business";
import { withTimeout } from "@/lib/with-timeout";

/**
 * Arama motoru sayfalarının (sitemap, şehir, kategori, keşfet dizini, benzer işletmeler)
 * kullandığı hafif işletme dizini. Yalnızca yayında, aktif ve keşifte gizlenmemiş
 * işletmeler yer alır. İstekler arasında önbelleğe alınır; her vitrin ziyaretinde
 * yüzlerce belge okunmaz.
 */
export type SeoBusiness = {
  id: string;
  slug: string;
  name: string;
  /** Kanonik kategori anahtarı (ör. "kuafor"). */
  category: string;
  city: string;
  citySlug: string;
  district: string;
  description: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  coverUrl?: string;
  logoUrl?: string;
  updatedAt?: string;
};

function toIso(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cleanUrl(value: unknown): string | undefined {
  return typeof value === "string" && /^(https:\/\/|\/)/.test(value.trim()) ? value.trim() : undefined;
}

export function toSeoBusiness(business: Business): SeoBusiness | null {
  if (!business.slug || !business.name || !business.city) return null;
  if (business.isPublished !== true || business.status !== "active" || business.hiddenFromDiscovery === true) return null;
  const rating = Number(business.rating ?? 0);
  return {
    id: business.id,
    slug: business.slug,
    name: business.name.trim(),
    category: canonicalBusinessCategory(business.category ?? ""),
    city: displayPlace(business.city),
    citySlug: seoSlug(business.city),
    district: displayPlace(business.district),
    description: (business.description ?? "").trim().slice(0, 400),
    rating: Number.isFinite(rating) ? rating : 0,
    reviewCount: Math.max(0, Math.floor(Number(business.reviewCount ?? 0)) || 0),
    isVerified: business.isVerified === true,
    coverUrl: cleanUrl(business.coverUrl),
    logoUrl: cleanUrl(business.logoUrl),
    updatedAt: toIso(business.updatedAt) ?? toIso(business.createdAt),
  };
}

const loadSeoIndex = unstable_cache(
  async (): Promise<SeoBusiness[]> => {
    // Hata fırlatılırsa önbelleğe boş liste yazılmaz; çağıran taraf yakalar.
    const rows = await withTimeout(searchBusinesses({ maxResults: 1000 }), 8_000, "SEO işletme dizini");
    return rows.map(toSeoBusiness).filter((row): row is SeoBusiness => Boolean(row));
  },
  ["seo-business-index-v1"],
  { revalidate: 900, tags: ["seo-business-index"] },
);

/** Önbellekli SEO işletme dizini. Firestore'a ulaşılamazsa boş liste döner. */
export const getSeoIndex = cache(async (): Promise<SeoBusiness[]> => {
  try {
    return await loadSeoIndex();
  } catch {
    return [];
  }
});

export function sortForListing(rows: SeoBusiness[]): SeoBusiness[] {
  const score = (row: SeoBusiness) => (row.reviewCount > 0 ? row.rating * 18 : 0) + Math.log10(row.reviewCount + 1) * 8 + (row.isVerified ? 6 : 0) + (row.coverUrl ? 2 : 0);
  return [...rows].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "tr"));
}

export type CitySummary = { city: string; slug: string; businesses: SeoBusiness[] };

export function groupByCity(rows: SeoBusiness[]): CitySummary[] {
  const map = new Map<string, CitySummary>();
  for (const row of rows) {
    if (!row.citySlug) continue;
    const entry = map.get(row.citySlug) ?? { city: row.city, slug: row.citySlug, businesses: [] };
    entry.businesses.push(row);
    map.set(row.citySlug, entry);
  }
  return [...map.values()].sort((a, b) => b.businesses.length - a.businesses.length || a.city.localeCompare(b.city, "tr"));
}

export async function getCity(citySlug: string): Promise<CitySummary | null> {
  const rows = await getSeoIndex();
  return groupByCity(rows).find((item) => item.slug === citySlug) ?? null;
}

export type CategoryCount = { slug: string; label: string; count: number };

/** Yalnızca kendi sayfası olabilen ve en az bir işletmesi olan kategoriler. */
export function categoryCounts(rows: SeoBusiness[]): CategoryCount[] {
  return SEO_CATEGORY_SLUGS
    .map((slug) => ({ slug, label: SEO_CATEGORIES[slug].label, count: rows.filter((row) => row.category === slug).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || SEO_CATEGORY_SLUGS.indexOf(a.slug) - SEO_CATEGORY_SLUGS.indexOf(b.slug));
}

export function districtRanking(rows: SeoBusiness[]) {
  return rankByFrequency(rows.map((row) => row.district));
}

export function topRated(rows: SeoBusiness[]) {
  const rated = rows.filter((row) => row.reviewCount > 0 && row.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  const best = rated[0];
  return best ? { name: best.name, rating: best.rating, reviewCount: best.reviewCount } : undefined;
}

export type ServiceSummary = { minPrice: number | null; maxPrice: number | null; names: string[] };

const loadServiceSummary = unstable_cache(
  async (businessId: string): Promise<ServiceSummary> => {
    const services = await withTimeout(listBookableServices(businessId), 8_000, "Hizmet özeti");
    const prices = services.map((service) => Number(service.price)).filter((price) => Number.isFinite(price) && price > 0);
    return {
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      names: services.map((service) => service.name?.trim()).filter((name): name is string => Boolean(name)).slice(0, 40),
    };
  },
  ["seo-service-summary-v1"],
  { revalidate: 3600, tags: ["seo-service-summary"] },
);

/** Birden çok işletmenin hizmetlerinden fiyat aralığı ve en sık hizmet adları. */
export async function summarizeServices(rows: SeoBusiness[], limit = 24) {
  const summaries = await Promise.all(rows.slice(0, limit).map((row) => loadServiceSummary(row.id).catch(() => null)));
  const valid = summaries.filter((item): item is ServiceSummary => Boolean(item));
  const mins = valid.map((item) => item.minPrice).filter((value): value is number => value !== null);
  const maxs = valid.map((item) => item.maxPrice).filter((value): value is number => value !== null);
  const popular = rankByFrequency(valid.flatMap((item) => [...new Set(item.names.map((name) => name.toLocaleLowerCase("tr-TR")))]))
    .filter((item) => item.count >= (valid.length > 3 ? 2 : 1))
    .slice(0, 6)
    .map((item) => item.name);
  return {
    minPrice: mins.length ? Math.min(...mins) : null,
    maxPrice: maxs.length ? Math.max(...maxs) : null,
    popularServices: popular,
  };
}

export { categoryDisplayName };
