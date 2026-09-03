import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Review, ReviewStatus } from "@/types/review";

/**
 * List approved (publicly visible) reviews for a business, newest first.
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
 * List all reviews (any status) for a business — used by the owner's review management panel.
 */
export async function listBusinessReviewsForOwner(
  businessId: string,
  maxCount = 200
): Promise<Review[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "reviews");
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(maxCount)));
  return snap.docs.map((d) => mapDoc<Review>(d));
}

/**
 * List pending reviews across every business — used by super-admin moderation.
 */
export async function listPendingReviewsAcrossPlatform(maxCount = 200): Promise<Review[]> {
  const db = getDb();
  try {
    const snap = await getDocs(
      query(
        collectionGroup(db, "reviews"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(maxCount)
      )
    );
    return snap.docs.map((d) => mapDoc<Review>(d));
  } catch (error) {
    // Collection-group indexes can take time to become available after deploy.
    // Platform admins still need a working moderation queue, so fall back to
    // business-scoped queries that use only Firestore's automatic indexes.
    console.warn("Review collection-group query unavailable; using scoped fallback.", error);
    const businesses = await getDocs(collection(db, "businesses"));
    const results = await Promise.allSettled(
      businesses.docs.map(async (business) => {
        const snap = await getDocs(
          query(
            collection(db, "businesses", business.id, "reviews"),
            where("status", "==", "pending"),
            limit(maxCount)
          )
        );
        return snap.docs.map((review) => ({
          ...mapDoc<Review>(review),
          businessId: business.id,
        }));
      })
    );
    return results
      .flatMap((result) => result.status === "fulfilled" ? result.value : [])
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, maxCount);
  }
}

/**
 * Check if a reviewer has already reviewed a specific appointment (prevents duplicates).
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
 * Create a verified review for a completed appointment. The callable validates
 * appointment ownership and keeps the review pending until moderation.
 */
export async function createReview(
  businessId: string,
  input: {
    customerId?: string;
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
  const submit = httpsCallable<
    typeof input & { businessId: string },
    { reviewId: string }
  >(getFunctions(getFirebaseApp(), "europe-west1"), "submitReview");
  const result = await submit({ businessId, ...input });
  return result.data.reviewId;
}

/**
 * Approve or reject a review. Approving folds the rating into the business's
 * aggregate rating/reviewCount exactly once; rejecting keeps it hidden.
 */
export async function updateReviewStatus(
  businessId: string,
  reviewId: string,
  status: ReviewStatus,
  moderationNote?: string
): Promise<void> {
  const moderate = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "moderateReview");
  await moderate({ businessId, reviewId, status, moderationNote });
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
