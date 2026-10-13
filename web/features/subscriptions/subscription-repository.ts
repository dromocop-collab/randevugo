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
  termsVersion: string;
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
  billingCycle: "monthly" | "yearly" | null;
  kind?: "plan" | "sms_pack";
  smsCount?: number;
  extraBalanceAfter?: number;
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

/** Ek SMS paketleri — fiyat/adet functions/src/sms-quota-domain.ts SMS_PACKS ile aynı tutulmalı (sunucu kendi değerini kullanır). */
export const SMS_PACKS = [
  { id: "SMS250", count: 250, price: 149 },
  { id: "SMS1000", count: 1000, price: 449 },
] as const;
export type SmsPack = (typeof SMS_PACKS)[number];

export type SmsUsage = { periodKey: string; used: number; extraBalance: number };

/** smsUsage/{businessId}: bu ayın kullanımı (ay değiştiyse 0) ve ek kredi. */
export async function getSmsUsage(businessId: string): Promise<SmsUsage> {
  const snap = await getDoc(doc(getDb(), "smsUsage", businessId));
  const data = snap.data() ?? {};
  const periodKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  return {
    periodKey,
    used: data.periodKey === periodKey ? Math.max(0, Number(data.used ?? 0) || 0) : 0,
    extraBalance: Math.max(0, Number(data.extraBalance ?? 0) || 0),
  };
}

export async function startSmsPackCheckout(input: { businessId: string; packId: string; acceptedTerms: true; termsVersion: string }): Promise<{ merchantOid: string; checkoutUrl: string }> {
  const callable = httpsCallable<typeof input, { merchantOid: string; checkoutUrl: string }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "startSmsPackCheckout",
  );
  return (await callable(input)).data;
}
