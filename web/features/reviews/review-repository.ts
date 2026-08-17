import {
  addDoc,
  collection,
  collectionGroup,
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
  const snap = await getDocs(
    query(
      collectionGroup(db, "reviews"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(maxCount)
    )
  );
  return snap.docs.map((d) => mapDoc<Review>(d));
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
 * Create a new review for a business. No authentication required — anyone can
 * leave a review with just a display name. Reviews start as "pending" and only
 * become publicly visible once the business owner (or platform admin) approves them.
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
  const db = getDb();

  // Firestore rejects `undefined` field values — strip them so optional
  // fields (serviceName, staffId, comment, ...) don't break the write.
  const cleanInput = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );

  const reviewRef = await addDoc(
    collection(db, "businesses", businessId, "reviews"),
    {
      ...cleanInput,
      businessId,
      status: "pending",
      isVisible: false,
      isModerated: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return reviewRef.id;
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
  const db = getDb();
  const reviewRef = doc(db, "businesses", businessId, "reviews", reviewId);
  const businessRef = doc(db, "businesses", businessId);

  await runTransaction(db, async (txn) => {
    const reviewSnap = await txn.get(reviewRef);
    if (!reviewSnap.exists()) return;
    const reviewData = reviewSnap.data();
    const previousStatus = String(reviewData.status ?? "pending");

    txn.update(reviewRef, {
      status,
      isVisible: status === "approved",
      isModerated: true,
      moderationNote: moderationNote ?? null,
      updatedAt: serverTimestamp(),
    });

    // Only adjust the aggregate rating on the pending -> approved transition
    // (and reverse it if a previously approved review gets rejected later).
    if (status === "approved" && previousStatus !== "approved") {
      const bizSnap = await txn.get(businessRef);
      if (!bizSnap.exists()) return;
      const data = bizSnap.data();
      const currentRating = data.rating ?? 0;
      const currentCount = data.reviewCount ?? 0;
      const newCount = currentCount + 1;
      const newRating = (currentRating * currentCount + reviewData.rating) / newCount;
      txn.update(businessRef, {
        rating: Math.round(newRating * 100) / 100,
        reviewCount: newCount,
      });
    } else if (status !== "approved" && previousStatus === "approved") {
      const bizSnap = await txn.get(businessRef);
      if (!bizSnap.exists()) return;
      const data = bizSnap.data();
      const currentRating = data.rating ?? 0;
      const currentCount = data.reviewCount ?? 0;
      const newCount = Math.max(currentCount - 1, 0);
      const newRating =
        newCount === 0 ? 0 : Math.max((currentRating * currentCount - reviewData.rating) / newCount, 0);
      txn.update(businessRef, {
        rating: Math.round(newRating * 100) / 100,
        reviewCount: newCount,
      });
    }
  });
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
