import { getFirebaseConfig } from "@/lib/firebase/config";
import {
  PLATFORM_PLANS_CACHE_TAG, defaultPlatformPlan, plansFromRestList, publicPlatformPlans, type PlatformPlan,
} from "@/features/subscriptions/platform-plan-domain";

/** Fiyat gösteren sayfaların ISR süresi (sn). Süper admin kaydında ayrıca anında tazelenir. */
export const PUBLIC_PLANS_REVALIDATE_SECONDS = 60;

/**
 * Herkese açık sayfalar için satıştaki paketler (sunucuda).
 * Firestore REST ile okunur (kurallar platformPlans'ı herkese açar): istemci SDK'sının sunucudaki
 * soğuk açılış gecikmesi yok ve fetch önbelleği PLATFORM_PLANS_CACHE_TAG ile anında geçersiz kılınabilir.
 *
 * Okuma başarısız olursa: derleme sırasında varsayılan paket döner; çalışma anında hata fırlatılır ki
 * ISR son başarılı sayfayı sunmaya devam etsin (yanlışlıkla "tek paket" sürümü önbelleğe yazılmasın).
 */
export async function loadPublicPlans(): Promise<PlatformPlan[]> {
  try {
    const { projectId, apiKey } = getFirebaseConfig();
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/platformPlans?pageSize=100${apiKey ? `&key=${encodeURIComponent(apiKey)}` : ""}`;
    const response = await fetch(url, {
      next: { revalidate: PUBLIC_PLANS_REVALIDATE_SECONDS, tags: [PLATFORM_PLANS_CACHE_TAG] },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) throw new Error(`platformPlans okunamadı (${response.status})`);
    return publicPlatformPlans(plansFromRestList(await response.json()));
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build" || process.env.NODE_ENV !== "production") {
      console.warn("[public-plans] varsayılan pakete düşüldü:", (error as Error).message);
      return [defaultPlatformPlan()];
    }
    throw error;
  }
}

export function featuredPlan(plans: PlatformPlan[]): PlatformPlan {
  return plans.find((plan) => plan.isRecommended) ?? plans[0] ?? defaultPlatformPlan();
}

export function currencySymbol(currency: string) {
  return currency === "TRY" ? "₺" : currency;
}

export function formatPrice(value: number) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

/** Yıllık ödemede, aylığa göre yüzde kaç tasarruf (yoksa 0). */
export function yearlySavingPercent(plan: PlatformPlan) {
  const fullYear = plan.monthlyPrice * 12;
  if (!fullYear || !plan.yearlyPrice || plan.yearlyPrice >= fullYear) return 0;
  return Math.round(((fullYear - plan.yearlyPrice) / fullYear) * 100);
}
