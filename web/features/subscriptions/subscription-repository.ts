import { doc, getDoc } from "firebase/firestore";
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
