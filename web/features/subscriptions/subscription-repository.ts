import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { Subscription } from "@/types/subscription";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

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

export async function requestSubscriptionPurchase(input: {
  businessId: string;
  planId: string;
  billingCycle: "monthly" | "yearly";
}): Promise<{ status: "completed" | "checkout_ready" | "pending_payment"; requestId: string; checkoutUrl: string | null }> {
  const callable = httpsCallable<typeof input, { status: "completed" | "checkout_ready" | "pending_payment"; requestId: string; checkoutUrl: string | null }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "requestSubscriptionPurchase",
  );
  const result = await callable(input);
  return result.data;
}
