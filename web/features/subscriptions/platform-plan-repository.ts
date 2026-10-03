import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, type SubscriptionEntitlement } from "@/constants/subscription-entitlements";

export interface PlatformPlan {
  id: string;
  label: string;
  yearlyPrice: number;
  monthlyPrice: number;
  currency: string;
  trialDays: number;
  maxStores: number;
  maxStaff: number;
  isActive: boolean;
  isRecommended: boolean;
  description: string;
  features: string[];
  entitlements: SubscriptionEntitlement[];
}

export async function listPlatformPlans(): Promise<PlatformPlan[]> {
  const snapshot = await getDocs(collection(getDb(), "platformPlans"));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      label: String(data.label ?? item.id),
      yearlyPrice: Number(data.yearlyPrice ?? 0),
      monthlyPrice: Number(data.monthlyPrice ?? Math.round(Number(data.yearlyPrice ?? 0) / 12)),
      currency: String(data.currency ?? "TRY"),
      trialDays: Number(data.trialDays ?? 0),
      maxStores: Number(data.maxStores ?? 3),
      maxStaff: Number(data.maxStaff ?? 250),
      isActive: data.isActive !== false,
      isRecommended: data.isRecommended === true,
      description: String(data.description ?? ""),
      features: Array.isArray(data.features) ? data.features.map(String) : [],
      entitlements: Array.isArray(data.entitlements)
        ? data.entitlements.map(String).filter((key): key is SubscriptionEntitlement => ALL_SUBSCRIPTION_ENTITLEMENTS.includes(key as SubscriptionEntitlement))
        : [],
    };
  });
}

export async function savePlatformPlan(plan: PlatformPlan): Promise<void> {
  const planId = plan.id.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(planId)) throw new Error("Paket kodu geçersiz.");
  const entitlements = [...new Set(plan.entitlements)].filter((key) => ALL_SUBSCRIPTION_ENTITLEMENTS.includes(key));
  if (entitlements.length === 0) throw new Error("Pakete en az bir özellik seçin.");
  const planRef = doc(getDb(), "platformPlans", planId);
  const existing = await getDoc(planRef);
  await setDoc(planRef, {
    ...plan,
    id: planId,
    entitlements,
    updatedAt: serverTimestamp(),
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });
}

export async function removePlatformPlan(planId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "platformPlans", planId));
}
