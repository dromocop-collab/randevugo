import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { Business } from "@/types/business";

export interface SearchFilters {
  searchText?: string;
  category?: string;
  city?: string;
  district?: string;
  businessType?: string;
  maxResults?: number;
}

export async function searchBusinesses(
  filters: SearchFilters
): Promise<Business[]> {
  const db = getDb();
  const ref = collection(db, "businesses");

  /* Build dynamic query based on filters */
  const q = filters.category && filters.city
    ? query(
        ref,
        where("isPublished", "==", true),
        where("status", "==", "active"),
        where("category", "==", filters.category),
        where("city", "==", filters.city),
        orderBy("rating", "desc"),
        limit(filters.maxResults ?? 50)
      )
    : filters.category
      ? query(
          ref,
          where("isPublished", "==", true),
          where("status", "==", "active"),
          where("category", "==", filters.category),
          orderBy("rating", "desc"),
          limit(filters.maxResults ?? 50)
        )
      : filters.city
        ? query(
            ref,
            where("isPublished", "==", true),
            where("status", "==", "active"),
            where("city", "==", filters.city),
            orderBy("rating", "desc"),
            limit(filters.maxResults ?? 50)
          )
        : query(
            ref,
            where("isPublished", "==", true),
            where("status", "==", "active"),
            orderBy("rating", "desc"),
            limit(filters.maxResults ?? 50)
          );

  const snap = await getDocs(q);

  let results = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Business, "id">),
  }));

  if (filters.searchText) {
    const searchTerm = filters.searchText.toLowerCase().trim();
    results = results.filter(
      (b) =>
        b.name.toLowerCase().includes(searchTerm) ||
        (b.description ?? "").toLowerCase().includes(searchTerm) ||
        b.category.toLowerCase().includes(searchTerm)
    );
  }

  return results;
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
      orderBy("reviewCount", "desc"),
      limit(limitCount)
    )
  );

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Business, "id">),
  }));
}

export async function getBusinessCities(): Promise<string[]> {
  const db = getDb();
  const ref = collection(db, "businesses");
  const snap = await getDocs(
    query(ref, where("isPublished", "==", true), where("status", "==", "active"))
  );

  const cities = new Set<string>();
  snap.docs.forEach((doc) => {
    const city = doc.data().city;
    if (typeof city === "string" && city.trim()) {
      cities.add(city.trim());
    }
  });

  return Array.from(cities).sort();
}
