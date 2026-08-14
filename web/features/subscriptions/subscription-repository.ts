import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { Subscription } from "@/types/subscription";

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

export async function ensureFreePlan(businessId: string): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, "subscriptions", businessId), {
    businessId,
    plan: "FREE",
    status: "active",
    provider: "manual",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
