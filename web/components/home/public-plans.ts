import { defaultPlatformPlan, listPlatformPlans, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";

/**
 * Herkese açık sayfalar için yayındaki paketler (sunucuda, 4 sn zaman aşımıyla).
 * Okunamazsa veya aktif paket yoksa constants/plans'tan türetilen varsayılan paket döner.
 */
export async function loadPublicPlans(): Promise<PlatformPlan[]> {
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4_000));
    const rows = await Promise.race([listPlatformPlans(), timeout]);
    const active = rows.filter((plan) => plan.isActive);
    if (!active.length) return [defaultPlatformPlan()];
    // Önerilen paket önce, sonra fiyata göre.
    return JSON.parse(JSON.stringify(active.sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended) || a.monthlyPrice - b.monthlyPrice))) as PlatformPlan[];
  } catch {
    return [defaultPlatformPlan()];
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
