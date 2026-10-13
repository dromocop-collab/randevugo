// İşletme başına aylık SMS kotası + satın alınmış ek SMS kredisi.
// Belge: smsUsage/{businessId} { periodKey: "2026-10", used, extraBalance, notified: { low?, exhausted? } }
// Önce aylık kota harcanır, bitince ek kredi. Ek kredi ay sonunda silinmez.

export type SmsUsageState = {
  periodKey: string;
  used: number;
  extraBalance: number;
};

/** Paket kotası: sayı yoksa (eski paketler) sınırsız = null. */
export function planSmsQuota(planData: Record<string, unknown> | undefined | null): number | null {
  const raw = planData?.smsMonthlyQuota;
  if (raw === undefined || raw === null || raw === "") return null;
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** İstanbul saatine göre ay anahtarı (YYYY-MM). */
export function smsPeriodKey(nowMillis = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).formatToParts(new Date(nowMillis));
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function normalizeSmsUsage(data: Record<string, unknown> | undefined | null, periodKey: string): SmsUsageState {
  const extraBalance = Math.max(0, Math.floor(Number(data?.extraBalance ?? 0)) || 0);
  // Yeni ayda kullanılan sıfırlanır, ek kredi kalır.
  const used = data?.periodKey === periodKey ? Math.max(0, Math.floor(Number(data?.used ?? 0)) || 0) : 0;
  return { periodKey, used, extraBalance };
}

export function smsAllowance(state: SmsUsageState, quota: number | null) {
  if (quota === null) return { unlimited: true, monthlyRemaining: Infinity, extraBalance: state.extraBalance, canSend: true };
  const monthlyRemaining = Math.max(0, quota - state.used);
  return { unlimited: false, monthlyRemaining, extraBalance: state.extraBalance, canSend: monthlyRemaining + state.extraBalance > 0 };
}

/** Gönderilen SMS'in kredisini düşer: önce aylık kota, taşan kısım ek krediden (en fazla bakiye kadar). */
export function consumeSms(state: SmsUsageState, credits: number, quota: number | null): SmsUsageState {
  const amount = Math.max(1, Math.floor(credits) || 1);
  if (quota === null) return { ...state, used: state.used + amount };
  const fromMonthly = Math.min(amount, Math.max(0, quota - state.used));
  const fromExtra = Math.min(amount - fromMonthly, state.extraBalance);
  // Kota bittikten sonra eşzamanlı gönderimle taşan kısım "used" üzerinde kalır (raporda görünür).
  return { ...state, used: state.used + fromMonthly + (amount - fromMonthly - fromExtra), extraBalance: state.extraBalance - fromExtra };
}

/** Uyarı eşiği: aylık kotanın %80'i (ek kredi yokken). */
export function smsQuotaWarning(state: SmsUsageState, quota: number | null): "low" | "exhausted" | null {
  if (quota === null || quota === 0) return quota === 0 && state.extraBalance <= 0 ? "exhausted" : null;
  if (state.used >= quota && state.extraBalance <= 0) return "exhausted";
  if (state.used >= Math.ceil(quota * 0.8) && state.extraBalance <= 0) return "low";
  return null;
}

/** Web'den satılan ek SMS paketleri (KDV dahil TL). */
export const SMS_PACKS = [
  { id: "SMS250", count: 250, price: 149 },
  { id: "SMS1000", count: 1000, price: 449 },
] as const;

export function findSmsPack(id: unknown) {
  return SMS_PACKS.find((pack) => pack.id === String(id ?? "").toUpperCase()) ?? null;
}
