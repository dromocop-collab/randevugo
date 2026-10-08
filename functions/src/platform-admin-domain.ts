// Süper admin callable'ları için saf yardımcılar. Testler: platform-admin-domain.test.mjs

const RESTORABLE_BUSINESS_STATUSES = ["active", "pending_review", "rejected"];

/** Askıdan çıkan işletmenin dönmesi gereken durum; bilinmiyorsa yeniden onaya düşer (asla zorla "active" değil). */
export function statusAfterUnsuspend(statusBeforeSuspension: unknown): string {
  return typeof statusBeforeSuspension === "string" && RESTORABLE_BUSINESS_STATUSES.includes(statusBeforeSuspension)
    ? statusBeforeSuspension
    : "pending_review";
}

/** Askıya alırken saklanacak önceki durum. */
export function statusBeforeSuspending(currentStatus: unknown): string {
  return typeof currentStatus === "string" && RESTORABLE_BUSINESS_STATUSES.includes(currentStatus) ? currentStatus : "pending_review";
}

export const DEFAULT_PLATFORM_PLAN_ID = "RANDEVUGO";

/**
 * platformPlans boşken oluşturulan varsayılan paket. Değerler web/constants/plans.ts ile aynıdır.
 * maxStores 10: paket belgesi yokken backend'in uyguladığı şube sınırıyla aynı (mevcut işletmeler kısıtlanmaz).
 */
export function defaultPlatformPlan(entitlements: readonly string[]) {
  return {
    id: DEFAULT_PLATFORM_PLAN_ID,
    label: "SeninRandevun",
    monthlyPrice: 490,
    yearlyPrice: 4990,
    currency: "TRY",
    trialDays: 30,
    maxStores: 10,
    maxStaff: 250,
    isActive: true,
    isRecommended: true,
    description: "Tüm randevu operasyonunu tek merkezden yönetin.",
    features: [
      "Online randevu", "Sınırsız müşteri", "Çalışan yönetimi", "Hizmet yönetimi", "CRM",
      "Gelişmiş takvim", "İşletme profili", "Raporlama", "Yorum sistemi", "Hatırlatma altyapısı",
      "Çoklu şube altyapısı", "Yetkilendirme", "Keşfet'te görünme", "QR randevu linki", "Destek",
    ],
    entitlements: [...entitlements],
  };
}
