import { SEO_CATEGORIES, isSeoCategory, type SeoCategory } from "@/lib/seo/categories";
import { getCity, type SeoBusiness } from "@/lib/seo/seo-data";
import { seoSlug } from "@/lib/seo/text";

/** /sehir/[city]/[category] adreslerinde kullanılan kategoriler. */
export const GEO_CATEGORIES: Record<string, SeoCategory> = SEO_CATEGORIES;
export type GeoCategorySlug = string;

export { seoSlug };

export async function resolveCity(citySlug: string) {
  const city = await getCity(citySlug);
  return city ? { city: city.city, slug: city.slug, businesses: city.businesses } : null;
}

export function businessesInCategory(businesses: SeoBusiness[], category: string) {
  return businesses.filter((business) => business.category === category);
}

export function isGeoCategory(value: string): boolean {
  return isSeoCategory(value);
}
