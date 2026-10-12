import { doc, getDoc, onSnapshot } from "firebase/firestore";
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

/** PayTR ödeme sayfasını hazırlar (yalnız web). Online ödeme kapalıysa PAYMENT_NOT_CONFIGURED hatası döner. */
export async function startSubscriptionCheckout(input: {
  businessId: string;
  planId: string;
  billingCycle: "monthly" | "yearly";
  acceptedTerms: true;
}): Promise<{ merchantOid: string; checkoutUrl: string }> {
  const callable = httpsCallable<typeof input, { merchantOid: string; checkoutUrl: string }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "startSubscriptionCheckout",
  );
  return (await callable(input)).data;
}

export type SubscriptionPaymentStatus = "pending" | "paid" | "failed" | "amount_mismatch" | "token_failed";

export type SubscriptionPayment = {
  id: string;
  businessId: string;
  planLabel: string;
  billingCycle: "monthly" | "yearly";
  amountKurus: number;
  status: SubscriptionPaymentStatus;
  periodEnd?: string;
  failedReasonMsg?: string;
  testMode?: boolean;
};

/** Ödeme sonucunu canlı izler; kayıt yoksa/okunamazsa null. */
export function watchSubscriptionPayment(merchantOid: string, onChange: (payment: SubscriptionPayment | null) => void, onError: (error: Error) => void) {
  return onSnapshot(doc(getDb(), "subscriptionPayments", merchantOid), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<SubscriptionPayment, "id">) } : null);
  }, onError);
}
