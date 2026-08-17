import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Review } from "@/types/review";

/**
 * List visible reviews for a business, newest first.
 */
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
  return snap.docs.map((d) => mapDoc<Review>(d));
}

/**
 * Check if a user has already reviewed a specific appointment.
 */
export async function hasUserReviewed(
  businessId: string,
  appointmentId: string
): Promise<boolean> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "reviews");
  const snap = await getDocs(
    query(ref, where("appointmentId", "==", appointmentId), limit(1))
  );
  return !snap.empty;
}

/**
 * Create a new review for a business.
 * Also updates the business rating/reviewCount via a transaction.
 */
export async function createReview(
  businessId: string,
  input: {
    customerId: string;
    customerName: string;
    appointmentId: string;
    serviceId?: string;
    serviceName?: string;
    staffId?: string;
    staffName?: string;
    rating: number;
    comment?: string;
    imageUrls?: string[];
  }
): Promise<string> {
  const db = getDb();

  // Create the review document
  const reviewRef = await addDoc(
    collection(db, "businesses", businessId, "reviews"),
    {
      ...input,
      businessId,
      isVisible: true,
      isModerated: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  // Update business rating/reviewCount via transaction
  try {
    const businessRef = doc(db, "businesses", businessId);
    await runTransaction(db, async (txn) => {
      const bizSnap = await txn.get(businessRef);
      if (!bizSnap.exists()) return;

      const data = bizSnap.data();
      const currentRating = data.rating ?? 0;
      const currentCount = data.reviewCount ?? 0;
      const newCount = currentCount + 1;
      const newRating =
        (currentRating * currentCount + input.rating) / newCount;

      txn.update(businessRef, {
        rating: Math.round(newRating * 100) / 100,
        reviewCount: newCount,
      });
    });
  } catch {
    // Non-critical: rating update failed, review is still created
  }

  return reviewRef.id;
}

/**
 * Add an owner reply to a review.
 */
export async function addOwnerReply(
  businessId: string,
  reviewId: string,
  reply: string
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "businesses", businessId, "reviews", reviewId), {
    ownerReply: reply,
    ownerReplyAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}
