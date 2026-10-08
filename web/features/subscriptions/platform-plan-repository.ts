import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";
import { ALL_SUBSCRIPTION_ENTITLEMENTS } from "@/constants/subscription-entitlements";
import { PLAN_LABEL } from "@/constants/plans";
import {
  DEFAULT_PLATFORM_PLAN_ID, defaultPlatformPlan, normalizePlatformPlan, sortPlatformPlans, type PlatformPlan,
} from "@/features/subscriptions/platform-plan-domain";

export { DEFAULT_PLATFORM_PLAN_ID, defaultPlatformPlan, type PlatformPlan };
export { activePlatformPlans, featuredPlanId, publicPlatformPlans, sortPlatformPlans } from "@/features/subscriptions/platform-plan-domain";

/** Eski (tek plan öncesi) paket kodları; tüm özellikler açık kalır, RANDEVUGO'ya taşınabilir. */
export const LEGACY_PLAN_IDS = ["FREE", "PRO", "BUSINESS"] as const;

export function isLegacyPlanId(planId: string): boolean {
  return (LEGACY_PLAN_IDS as readonly string[]).includes(planId.toUpperCase());
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
  return sortPlatformPlans(snapshot.docs.map((item) => normalizePlatformPlan(item.id, item.data())));
}

/**
 * Herkese açık fiyat sayfalarını (/fiyatlar, /isletmeler, /) hemen tazeler.
 * Hata yutulur: en kötü durumda sayfalar kısa ISR süresi (60 sn) sonunda kendiliğinden yenilenir.
 */
export async function refreshPublicPricingPages(): Promise<boolean> {
  try {
    const token = await getAuth(getFirebaseApp()).currentUser?.getIdToken();
    if (!token) return false;
    const response = await fetch("/api/platform-plans/revalidate", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    return response.ok;
  } catch {
    return false;
  }
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
  const { isFallback, sortOrder, ...plan } = input;
  const planId = plan.id.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(planId)) throw new Error("Paket kodu geçersiz.");
  const entitlements = [...new Set(plan.entitlements)].filter((key) => ALL_SUBSCRIPTION_ENTITLEMENTS.includes(key));
  if (entitlements.length === 0) throw new Error("Pakete en az bir özellik seçin.");
  const label = plan.label.trim();
  const monthlyPrice = Math.max(0, Number(plan.monthlyPrice) || 0);
  const db = getDb();
  const planRef = doc(db, "platformPlans", planId);
  const existing = await getDoc(planRef);
  await setDoc(planRef, {
    ...plan,
    id: planId,
    label,
    monthlyPrice,
    yearlyPrice: Math.max(0, Number(plan.yearlyPrice) || 0),
    // iOS süper admin "name"/"price" alanlarını da okur/yazar; iki istemci aynı değeri görsün.
    name: label,
    price: monthlyPrice,
    features: plan.features.map((item) => item.trim()).filter(Boolean),
    sortOrder: sortOrder !== null && Number.isFinite(sortOrder) ? Math.round(sortOrder) : null,
    entitlements,
    updatedAt: serverTimestamp(),
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });

  // "Önerilen" rozeti tek pakette olur: bu paket önerilen yapıldıysa diğerlerinden kaldırılır.
  if (plan.isRecommended) {
    const others = (await getDocs(collection(db, "platformPlans"))).docs.filter((item) => item.id !== planId && item.data().isRecommended === true);
    if (others.length) {
      const batch = writeBatch(db);
      others.forEach((item) => batch.update(item.ref, { isRecommended: false, updatedAt: serverTimestamp() }));
      await batch.commit();
    }
  }
  await refreshPublicPricingPages();
}

export async function removePlatformPlan(planId: string): Promise<void> {
  await deleteDoc(doc(getDb(), "platformPlans", planId));
  await refreshPublicPricingPages();
}
