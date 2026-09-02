/**
 * SeninRandevun — Tek Abonelik Modeli
 *
 * Tek plan: "SeninRandevun" — 1.490 TL/yıl (≈124 TL/ay)
 * Lansman kampanyası: yeni işletmelere 365 gün, kredi kartı gerekmez
 * Tüm özellikler açık — feature kilidi yok
 */

export type PlanType = "RANDEVUGO";

/** @deprecated Eski plan tipleri — backward compat için saklanıyor */
export type LegacyPlanType = "FREE" | "PRO" | "BUSINESS";

/** Gerçek plan veya eski plan tiplerini kabul eder */
export type AnyPlanType = PlanType | LegacyPlanType;

export interface PlanFeatures {
  maxStaff: number;
  maxBranches: number;
  maxAppointmentsPerMonth: number;
  maxNotificationsPerMonth: number;
  canUseDeposits: boolean;
  canUseAdvancedAnalytics: boolean;
  canUseMultiBranch: boolean;
  canUseApi: boolean;
  canUseCRM: boolean;
  canUseBranding: boolean;
  canUseNotifications: boolean;
  canRemoveBranding: boolean;
  canUseReports: boolean;
  canUseReviews: boolean;
  canUseReminders: boolean;
  canUseQR: boolean;
}

/** Tek plan — tüm özellikler açık */
export const PLAN_FEATURES: PlanFeatures = {
  maxStaff: 250,
  maxBranches: 10,
  maxAppointmentsPerMonth: -1, // sınırsız
  maxNotificationsPerMonth: -1,
  canUseDeposits: true,
  canUseAdvancedAnalytics: true,
  canUseMultiBranch: true,
  canUseApi: true,
  canUseCRM: true,
  canUseBranding: true,
  canUseNotifications: true,
  canRemoveBranding: true,
  canUseReports: true,
  canUseReviews: true,
  canUseReminders: true,
  canUseQR: true,
};

/** Backward compat: eski plan kodları aynı özellikleri alır */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getPlanFeatures(_plan?: AnyPlanType): PlanFeatures {
  return PLAN_FEATURES;
}

export const PLAN_PRICE = {
  yearly: 1490,
  monthlyEquivalent: 124,
  currency: "TRY" as const,
  trialDays: 365,
} as const;

export const PLAN_LABEL = "SeninRandevun";

export const PLAN_FEATURE_LIST = [
  "Online randevu",
  "Sınırsız müşteri",
  "Çalışan yönetimi",
  "Hizmet yönetimi",
  "CRM",
  "Gelişmiş takvim",
  "İşletme profili",
  "Raporlama",
  "Yorum sistemi",
  "Hatırlatma altyapısı",
  "Çoklu şube altyapısı",
  "Yetkilendirme",
  "Keşfet'te görünme",
  "QR randevu linki",
  "Destek",
] as const;

/**
 * @deprecated Eski plan fiyat tablosu — yeni kodda PLAN_PRICE kullanın
 */
export const PLAN_PRICES: Record<AnyPlanType, { monthly: number; yearly: number; currency: string }> = {
  RANDEVUGO: { monthly: PLAN_PRICE.monthlyEquivalent, yearly: PLAN_PRICE.yearly, currency: PLAN_PRICE.currency },
  FREE: { monthly: 0, yearly: 0, currency: "TRY" },
  PRO: { monthly: 0, yearly: PLAN_PRICE.yearly, currency: "TRY" },
  BUSINESS: { monthly: 0, yearly: PLAN_PRICE.yearly, currency: "TRY" },
};

/**
 * @deprecated Eski plan label'ları — yeni kodda PLAN_LABEL kullanın
 */
export const PLAN_LABELS: Record<AnyPlanType, string> = {
  RANDEVUGO: "SeninRandevun",
  FREE: "SeninRandevun",
  PRO: "SeninRandevun",
  BUSINESS: "SeninRandevun",
};
