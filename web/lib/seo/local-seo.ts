import { cache } from "react";
import { SEO_CATEGORIES, type SeoCategory } from "@/lib/seo/categories";
import { getSeoIndex, type SeoBusiness } from "@/lib/seo/seo-data";
import { SITE_URL } from "@/lib/seo/site";
import { seoSlug } from "@/lib/seo/text";
import { serializeJsonLd } from "@/lib/seo/schema";

export { SITE_URL };

/** Eski Fethiye adresleri (/mugla/fethiye/[category]) → kanonik kategori anahtarı. */
const LEGACY_LOCAL_CATEGORIES = {
  kuafor: "kuafor",
  berber: "berber",
  "guzellik-merkezi": "guzellik",
  "nail-studio": "nail",
  "spa-masaj": "spa",
  spor: "spor",
  veteriner: "veteriner",
} as const;

export type LocalCategorySlug = keyof typeof LEGACY_LOCAL_CATEGORIES;

export const LOCAL_CATEGORIES = Object.fromEntries(
  Object.entries(LEGACY_LOCAL_CATEGORIES).map(([slug, canonical]) => [slug, { ...SEO_CATEGORIES[canonical], slug: canonical }]),
) as Record<LocalCategorySlug, SeoCategory>;

export const getFethiyeBusinesses = cache(async (): Promise<SeoBusiness[]> => {
  const rows = await getSeoIndex();
  return rows.filter((business) => business.citySlug === "mugla" && seoSlug(business.district).includes("fethiye"));
});

export function businessesForCategory(rows: SeoBusiness[], slug: LocalCategorySlug) {
  const canonical = LEGACY_LOCAL_CATEGORIES[slug];
  return rows.filter((business) => business.category === canonical);
}

export function isLocalCategory(value: string): value is LocalCategorySlug {
  return Object.prototype.hasOwnProperty.call(LEGACY_LOCAL_CATEGORIES, value);
}

export function jsonLd(value: unknown) {
  return serializeJsonLd(value);
}
