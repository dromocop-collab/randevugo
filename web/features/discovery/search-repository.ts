import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { Business } from "@/types/business";
import { businessCategoryQueryValues, canonicalBusinessCategory } from "@/lib/business-categories";

export interface SearchFilters {
  searchText?: string;
  category?: string;
  city?: string;
  district?: string;
  businessType?: string;
  maxResults?: number;
}

export interface DiscoveryFacets {
  categoryCounts: Record<string, number>;
  categoryCovers: Record<string, string>;
  cities: string[];
  totalBusinesses: number;
}

export interface BusinessSearchResult extends Business {
  matchedServiceName?: string;
}

function isPublicReadyBusiness(business: Business): boolean {
  return [business.id, business.slug, business.name, business.category, business.phone, business.address, business.city, business.district]
    .every((value) => typeof value === "string" && value.trim().length > 0);
}

function isPublicActiveBusiness(business: Business): boolean {
  return business.status === "active" && business.isPublished === true && isPublicReadyBusiness(business);
}

function includesSearch(value: unknown, searchTerm: string) {
  return typeof value === "string" && value.toLocaleLowerCase("tr-TR").includes(searchTerm);
}

async function findServiceMatches(searchTerm: string) {
  const matches = new Map<string, string>();
  try {
    const snap = await getDocs(query(collectionGroup(getDb(), "services"), where("isActive", "==", true), limit(400)));
    snap.docs.forEach((serviceDoc) => {
      const data = serviceDoc.data();
      if (data.isBookableOnline === false) return;
      if (![data.name, data.description, data.category].some((value) => includesSearch(value, searchTerm))) return;
      const businessId = serviceDoc.ref.parent.parent?.id;
      if (businessId && !matches.has(businessId)) matches.set(businessId, typeof data.name === "string" ? data.name : "Eşleşen hizmet");
    });
  } catch {
    // Some legacy Firebase projects may not yet have the collection-group index.
    // Business name/category search remains available until that index is deployed.
  }
  return matches;
}

export async function searchBusinesses(
  filters: SearchFilters
): Promise<BusinessSearchResult[]> {
  const db = getDb();
  const ref = collection(db, "businesses");
  const categoryValues = filters.category
    ? businessCategoryQueryValues(filters.category)
    : [];
  const categoryFilter = filters.category
    ? categoryValues.length > 1
      ? where("category", "in", categoryValues)
      : where("category", "==", categoryValues[0])
    : null;

  /* Build dynamic query based on filters */
  const q = filters.category && filters.city
    ? query(
        ref,
        where("isPublished", "==", true),
        where("status", "==", "active"),
        categoryFilter!,
        where("city", "==", filters.city),
        limit(Math.max(filters.maxResults ?? 24, 100))
      )
    : filters.category
      ? query(
          ref,
          where("isPublished", "==", true),
          where("status", "==", "active"),
          categoryFilter!,
          limit(Math.max(filters.maxResults ?? 24, 100))
        )
      : filters.city
        ? query(
            ref,
            where("isPublished", "==", true),
            where("status", "==", "active"),
            where("city", "==", filters.city),
            limit(Math.max(filters.maxResults ?? 24, 100))
          )
        : query(
            ref,
            where("isPublished", "==", true),
            where("status", "==", "active"),
            limit(Math.max(filters.maxResults ?? 24, 100))
          );

  const snap = await getDocs(q);

  let results = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Business, "id">),
  })).filter(isPublicReadyBusiness);

  if (filters.searchText) {
    const searchTerm = filters.searchText.toLocaleLowerCase("tr-TR").trim();
    const serviceMatches = await findServiceMatches(searchTerm);
    const knownIds = new Set(results.map((business) => business.id));
    const missingIds = [...serviceMatches.keys()].filter((id) => !knownIds.has(id));
    if (missingIds.length) {
      const missing = await Promise.all(missingIds.map(async (id) => {
        const snapshot = await getDoc(doc(db, "businesses", id));
        return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as Omit<Business, "id">) } : null;
      }));
      results.push(...missing.filter((business): business is Business => Boolean(business && isPublicActiveBusiness(business))));
    }
    results = results
      .filter((business) => {
        const categoryMatches = !filters.category || canonicalBusinessCategory(business.category) === canonicalBusinessCategory(filters.category);
        const cityMatches = !filters.city || business.city === filters.city;
        const districtMatches = !filters.district || business.district === filters.district;
        const textMatches = [business.name, business.description, business.category].some((value) => includesSearch(value, searchTerm));
        return categoryMatches && cityMatches && districtMatches && (textMatches || serviceMatches.has(business.id));
      })
      .map((business) => ({ ...business, matchedServiceName: serviceMatches.get(business.id) }));
  }

  // Sort by rating locally to avoid filtering out docs without the 'rating' field
  results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return results.slice(0, filters.maxResults ?? 24);
}

export async function getPopularBusinesses(
  limitCount = 8
): Promise<Business[]> {
  const db = getDb();
  const ref = collection(db, "businesses");
  const snap = await getDocs(
    query(
      ref,
      where("isPublished", "==", true),
      where("status", "==", "active"),
      limit(50) // Fetch up to 50 active businesses
    )
  );

  const results = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Business, "id">),
  })).filter(isPublicReadyBusiness);
  
  // Sort by reviewCount locally to avoid filtering out docs without the field
  results.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  
  return results.slice(0, limitCount);
}

export async function getBusinessCities(): Promise<string[]> {
  const facets = await getDiscoveryFacets();
  return facets.cities;
}

/**
 * Returns only filters that can lead to a complete, public business profile.
 * Keeping this in the repository prevents empty categories and cities from
 * leaking into the discovery UI when an unfinished business document exists.
 */
export async function getDiscoveryFacets(): Promise<DiscoveryFacets> {
  const db = getDb();
  const ref = collection(db, "businesses");
  const snap = await getDocs(
    query(ref, where("isPublished", "==", true), where("status", "==", "active"))
  );

  const cities = new Set<string>();
  const categoryCounts: Record<string, number> = {};
  const categoryCovers: Record<string, string> = {};
  const businesses = snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Business, "id">) }))
    .filter(isPublicReadyBusiness);

  businesses.forEach((business) => {
    cities.add(business.city.trim());
    const category = canonicalBusinessCategory(business.category);
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    if (!categoryCovers[category] && typeof business.coverUrl === "string" && business.coverUrl.trim()) {
      categoryCovers[category] = business.coverUrl.trim();
    }
  });

  return {
    categoryCounts,
    categoryCovers,
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b, "tr")),
    totalBusinesses: businesses.length,
  };
}
