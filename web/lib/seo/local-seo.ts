import { cache } from "react";
import { searchBusinesses } from "@/features/discovery/search-repository";
import type { Business } from "@/types/business";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seninrandevun.com";

export const LOCAL_CATEGORIES = {
  kuafor: { label: "Kuaför", values: ["kuafor", "kuaför"], image: "/images/categories/kuafor.png" },
  berber: { label: "Berber", values: ["berber"], image: "/images/categories/berber.png" },
  "guzellik-merkezi": { label: "Güzellik Merkezi", values: ["guzellik", "güzellik"], image: "/images/categories/guzellik.png" },
  "nail-studio": { label: "Nail Studio", values: ["nail", "tırnak"], image: "/images/categories/nail.png" },
  "spa-masaj": { label: "Spa & Masaj", values: ["spa", "masaj"], image: "/images/categories/spa.png" },
  spor: { label: "Spor & PT", values: ["spor", "personal training"], image: "/images/categories/spor.png" },
  veteriner: { label: "Veteriner", values: ["veteriner"], image: "/images/categories/veteriner.png" },
} as const;

export type LocalCategorySlug = keyof typeof LOCAL_CATEGORIES;

function normalized(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const getFethiyeBusinesses = cache(async (): Promise<Business[]> => {
  const rows = await searchBusinesses({ city: "Muğla", maxResults: 100 });
  return rows.filter((business) => normalized(business.district ?? "").includes("fethiye"));
});

export function businessesForCategory(rows: Business[], slug: LocalCategorySlug) {
  const values = LOCAL_CATEGORIES[slug].values.map(normalized);
  return rows.filter((business) => {
    const haystack = normalized(`${business.category} ${business.description ?? ""}`);
    return values.some((value) => haystack.includes(value));
  });
}

export function isLocalCategory(value: string): value is LocalCategorySlug {
  return Object.prototype.hasOwnProperty.call(LOCAL_CATEGORIES, value);
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
