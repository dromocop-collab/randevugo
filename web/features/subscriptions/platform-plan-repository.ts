import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

export interface PlatformPlan {
  id: string;
  label: string;
  yearlyPrice: number;
  trialDays: number;
  maxStores: number;
  maxStaff: number;
  isActive: boolean;
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
      trialDays: Number(data.trialDays ?? 0),
      maxStores: Number(data.maxStores ?? 3),
      maxStaff: Number(data.maxStaff ?? 250),
      isActive: data.isActive !== false,
      features: Array.isArray(data.features) ? data.features.map(String) : [],
    };
  });
}

export async function savePlatformPlan(plan: PlatformPlan): Promise<void> {
  await setDoc(doc(getDb(), "platformPlans", plan.id.toUpperCase()), {
    ...plan,
    id: plan.id.toUpperCase(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function removePlatformPlan(planId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "platformPlans", planId));
}
