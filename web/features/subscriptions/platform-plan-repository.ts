import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

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
    };
  });
}

export async function savePlatformPlan(plan: PlatformPlan): Promise<void> {
  const planRef = doc(getDb(), "platformPlans", plan.id.toUpperCase());
  const existing = await getDoc(planRef);
  await setDoc(planRef, {
    ...plan,
    id: plan.id.toUpperCase(),
    updatedAt: serverTimestamp(),
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });
}

export async function removePlatformPlan(planId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "platformPlans", planId));
}
