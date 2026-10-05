import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, type SubscriptionEntitlement } from "@/constants/subscription-entitlements";
import { PLAN_FEATURE_LIST, PLAN_FEATURES, PLAN_LABEL, PLAN_PRICE } from "@/constants/plans";

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
  /** true: Firestore'da yok, constants/plans'tan türetilen yerleşik varsayılan paket. */
  isFallback?: boolean;
}

export const DEFAULT_PLATFORM_PLAN_ID = "RANDEVUGO";
/** Eski (tek plan öncesi) paket kodları; tüm özellikler açık kalır, RANDEVUGO'ya taşınabilir. */
export const LEGACY_PLAN_IDS = ["FREE", "PRO", "BUSINESS"] as const;

export function isLegacyPlanId(planId: string): boolean {
  return (LEGACY_PLAN_IDS as readonly string[]).includes(planId.toUpperCase());
}

/** platformPlans boşken kullanılan yerleşik paket (functions ensureDefaultPlatformPlans ile aynı değerler). */
export function defaultPlatformPlan(): PlatformPlan {
  return {
    id: DEFAULT_PLATFORM_PLAN_ID,
    label: PLAN_LABEL,
    monthlyPrice: PLAN_PRICE.monthly,
    yearlyPrice: PLAN_PRICE.yearly,
    currency: PLAN_PRICE.currency,
    trialDays: PLAN_PRICE.trialDays,
    // Paket belgesi yokken backend 10 şubeye izin verir; varsayılan paket bunu korur.
    maxStores: PLAN_FEATURES.maxBranches,
    maxStaff: PLAN_FEATURES.maxStaff,
    isActive: true,
    isRecommended: true,
    description: "Tüm randevu operasyonunu tek merkezden yönetin.",
    features: [...PLAN_FEATURE_LIST],
    entitlements: [...ALL_SUBSCRIPTION_ENTITLEMENTS],
    isFallback: true,
  };
}

/** Paket kodunun okunur adı: tanımlı paket → etiketi, eski kod → "Eski paket: X". */
export function planDisplayLabel(planId: string | undefined, plans: PlatformPlan[]): string {
  const id = String(planId ?? DEFAULT_PLATFORM_PLAN_ID).toUpperCase();
  const plan = plans.find((item) => item.id === id);
  if (plan) return plan.label;
  if (id === DEFAULT_PLATFORM_PLAN_ID) return PLAN_LABEL;
  if (isLegacyPlanId(id)) return `Eski paket: ${id}`;
  return `Tanımsız paket: ${id}`;
}

/** Firestore'daki paketler + koleksiyon boşsa yerleşik varsayılan paket. */
export async function listPlatformPlansWithSource(): Promise<{ plans: PlatformPlan[]; fromFallback: boolean }> {
  const stored = await listStoredPlatformPlans();
  return stored.length ? { plans: stored, fromFallback: false } : { plans: [defaultPlatformPlan()], fromFallback: true };
}

export async function listPlatformPlans(): Promise<PlatformPlan[]> {
  return (await listPlatformPlansWithSource()).plans;
}

async function listStoredPlatformPlans(): Promise<PlatformPlan[]> {
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

/** Yalnızca süper admin: platformPlans/RANDEVUGO yoksa oluşturur (idempotent, audit log'lu). */
export async function ensureDefaultPlatformPlans(): Promise<{ created: boolean; planId: string }> {
  const callable = httpsCallable<Record<string, never>, { success: boolean; created: boolean; planId: string }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "ensureDefaultPlatformPlans",
  );
  const result = await callable({});
  return { created: result.data.created === true, planId: String(result.data.planId ?? DEFAULT_PLATFORM_PLAN_ID) };
}

export async function savePlatformPlan(input: PlatformPlan): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isFallback, ...plan } = input;
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
