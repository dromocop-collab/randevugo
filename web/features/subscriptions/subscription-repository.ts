import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { Subscription } from "@/types/subscription";
import { PLAN_PRICE } from "@/constants/plans";

export async function getBusinessSubscription(
  businessId: string
): Promise<Subscription | null> {
  const db = getDb();
  const subscriptionRef = doc(db, "subscriptions", businessId);
  const snap = await getDoc(subscriptionRef);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<Subscription, "id">),
  };
}

/** Create a trial subscription for a new business */
export async function createTrialSubscription(businessId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + PLAN_PRICE.trialDays * 24 * 60 * 60 * 1000);

  await setDoc(
    doc(db, "subscriptions", businessId),
    {
      businessId,
      plan: "RANDEVUGO",
      status: "trialing",
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      renewalEnabled: false,
      paymentProvider: "manual",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * @deprecated Use createTrialSubscription for new businesses
 */
export async function ensureFreePlan(businessId: string): Promise<void> {
  return createTrialSubscription(businessId);
}
