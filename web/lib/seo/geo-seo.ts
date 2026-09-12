import { cache } from "react";
import { searchBusinesses } from "@/features/discovery/search-repository";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import type { Business } from "@/types/business";

export const GEO_CATEGORIES = {
  kuafor: { label: "Kuaför", image: "/images/categories/kuafor.png" },
  berber: { label: "Berber", image: "/images/categories/berber.png" },
  guzellik: { label: "Güzellik Merkezi", image: "/images/categories/guzellik.png" },
  nail: { label: "Nail Studio", image: "/images/categories/nail.png" },
  spa: { label: "Spa ve Masaj", image: "/images/categories/spa.png" },
  spor: { label: "Spor ve Personal Trainer", image: "/images/categories/spor.png" },
  saglik: { label: "Sağlık", image: "/images/categories/saglik.png" },
  danismanlik: { label: "Danışmanlık", image: "/images/categories/danismanlik.png" },
  veteriner: { label: "Veteriner", image: "/images/categories/veteriner.png" },
  yazilim: { label: "Yazılım ve Web", image: "/images/categories/yazilim.png" },
} as const;

export type GeoCategorySlug = keyof typeof GEO_CATEGORIES;

export function seoSlug(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const getSeoBusinesses = cache(() => searchBusinesses({ maxResults: 500 }));

export async function resolveCity(citySlug: string) {
  const businesses = await getSeoBusinesses();
  const city = businesses.find((item) => seoSlug(item.city) === citySlug)?.city;
  return city ? { city, businesses: businesses.filter((item) => seoSlug(item.city) === citySlug) } : null;
}

export function businessesInCategory(businesses: Business[], category: GeoCategorySlug) {
  return businesses.filter((business) => canonicalBusinessCategory(business.category) === category);
}

export function isGeoCategory(value: string): value is GeoCategorySlug {
  return Object.prototype.hasOwnProperty.call(GEO_CATEGORIES, value);
}
