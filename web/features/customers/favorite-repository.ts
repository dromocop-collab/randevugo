import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { Business } from "@/types/business";

export interface FavoriteBusiness {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  category: string;
  city: string;
  district: string;
}

export async function listFavoriteBusinesses(userId: string): Promise<FavoriteBusiness[]> {
  const snapshot = await getDocs(collection(getDb(), "users", userId, "favorites"));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      businessId: String(data.businessId ?? item.id),
      name: String(data.name ?? "İşletme"),
      slug: String(data.slug ?? ""),
      logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : undefined,
      category: String(data.category ?? ""),
      city: String(data.city ?? ""),
      district: String(data.district ?? ""),
    };
  });
}

export async function isFavoriteBusiness(userId: string, businessId: string): Promise<boolean> {
  return (await getDoc(doc(getDb(), "users", userId, "favorites", businessId))).exists();
}

export async function addFavoriteBusiness(userId: string, business: Business): Promise<void> {
  await setDoc(doc(getDb(), "users", userId, "favorites", business.id), {
    businessId: business.id,
    name: business.name,
    slug: business.slug,
    logoUrl: business.logoUrl ?? "",
    category: business.category,
    city: business.city,
    district: business.district,
    addedAt: serverTimestamp(),
  });
}

export async function removeFavoriteBusiness(userId: string, businessId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "users", userId, "favorites", businessId));
}
