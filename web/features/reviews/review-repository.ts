import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Review } from "@/types/review";

export async function listBusinessReviews(
  businessId: string,
  maxCount = 20
): Promise<Review[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "reviews");
  const snap = await getDocs(
    query(
      ref,
      where("isVisible", "==", true),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    )
  );
  return snap.docs.map((doc) => mapDoc<Review>(doc));
}
