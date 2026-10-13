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

/** Yeni işletmenin (ilk mağaza) 30 günlük denemesi bu pakette geçer: her şeyi denesin, sonra seçsin. */
export const TRIAL_PLAN_ID = "TAM";

/**
 * Önerilen paket yapısı (süper admin › Paketler › "Önerilen ayarları uygula").
 * Fiyatlara dokunmaz (yalnız belgede fiyat yoksa yazar). Sınırlar yalnız YENİ şube/çalışan eklemede uygulanır;
 * mevcut fazlalıklar korunur.
 */
export const RECOMMENDED_PLATFORM_PLANS = [
  {
    id: "RANDEVUGO",
    label: "SeninRandevun",
    monthlyPrice: 490,
    yearlyPrice: 4990,
    sortOrder: 1,
    isRecommended: false,
    maxStores: 1,
    maxStaff: 5,
    smsMonthlyQuota: 150,
    description: "Tek şubeli, küçük ekipli işletmeler için randevu, müşteri ve kasa.",
    entitlements: ["appointments", "staff", "services", "customers", "reviews", "waitlist", "checkout", "packages", "finance"],
  },
  {
    id: "TAM",
    label: "Tam Kontrol",
    monthlyPrice: 1499,
    yearlyPrice: 15000,
    sortOrder: 2,
    isRecommended: true,
    maxStores: 10,
    maxStaff: 250,
    smsMonthlyQuota: 750,
    description: "Çok şubeli ve büyüyen işletmeler: canlı sıra, analiz, prim raporu, otomasyon ve Rovi asistan.",
    entitlements: ["appointments", "branches", "staff", "services", "customers", "reviews", "waitlist", "live_queue", "checkout", "packages", "finance", "analytics", "automations", "assistant"],
  },
] as const;

/** Mevcut paket belgesine uygulanacak alanlar: fiyat/para birimi yalnız eksikse yazılır. */
export function recommendedPlanPatch(plan: (typeof RECOMMENDED_PLATFORM_PLANS)[number], existing: Record<string, unknown> | undefined) {
  const hasPrice = (key: string) => Number.isFinite(Number(existing?.[key])) && Number(existing?.[key]) > 0;
  return {
    label: typeof existing?.label === "string" && existing.label ? existing.label : plan.label,
    ...(hasPrice("monthlyPrice") ? {} : { monthlyPrice: plan.monthlyPrice, price: plan.monthlyPrice }),
    ...(hasPrice("yearlyPrice") ? {} : { yearlyPrice: plan.yearlyPrice }),
    currency: typeof existing?.currency === "string" && existing.currency ? existing.currency : "TRY",
    isActive: true,
    sortOrder: plan.sortOrder,
    isRecommended: plan.isRecommended,
    maxStores: plan.maxStores,
    maxStaff: plan.maxStaff,
    smsMonthlyQuota: plan.smsMonthlyQuota,
    description: plan.description,
    // Eski kopyalanmış özellik metinleri temizlenir; kartlar gerçek yetkilerden çizilir.
    features: [],
    entitlements: [...plan.entitlements],
  };
}
