// Süper admin paneli için saf (Firestore'dan bağımsız) yardımcılar. Birim testleri: admin-ops.test.mjs

/** Destek taleplerinin geçerli durumları. "in_progress" artık yazılmaz. */
export const SUPPORT_TICKET_STATUSES = ["open", "waiting_user", "waiting_admin", "resolved"] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

/** Ekip yanıtı bekleyen (aksiyon gerektiren) talepler. */
export const SUPPORT_NEEDS_ADMIN_STATUSES: SupportTicketStatus[] = ["open", "waiting_admin"];
/** Henüz çözülmemiş tüm talepler. */
export const SUPPORT_ACTIVE_STATUSES: SupportTicketStatus[] = ["open", "waiting_admin", "waiting_user"];

export const SUPPORT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Ekip yanıtı bekleyen ve son hareketi 24 saatten eski talep mi? */
export function isStaleSupportTicket(status: string, lastActivityMillis: number | null, now: number): boolean {
  if (!(SUPPORT_NEEDS_ADMIN_STATUSES as string[]).includes(status)) return false;
  if (lastActivityMillis === null || !Number.isFinite(lastActivityMillis)) return false;
  return now - lastActivityMillis > SUPPORT_STALE_AFTER_MS;
}

const RESTORABLE_BUSINESS_STATUSES = ["active", "pending_review", "rejected"];

/**
 * Askıdan çıkarılan işletmenin dönmesi gereken durum. Askı öncesi durum bilinmiyorsa
 * güvenli varsayılan "pending_review"dır; yalnızca önceden "active" olan işletme aktif döner.
 */
export function statusAfterUnsuspend(statusBeforeSuspension: unknown): string {
  return typeof statusBeforeSuspension === "string" && RESTORABLE_BUSINESS_STATUSES.includes(statusBeforeSuspension)
    ? statusBeforeSuspension
    : "pending_review";
}

/** Askıya alırken saklanacak önceki durum (zaten askıdaysa anlamlı bir önceki durum yoktur). */
export function statusBeforeSuspending(currentStatus: unknown): string {
  return typeof currentStatus === "string" && RESTORABLE_BUSINESS_STATUSES.includes(currentStatus) ? currentStatus : "pending_review";
}

/**
 * Kullanıcı aramasının sunucu tarafı e-posta önek sorgusuna uygun olup olmadığı.
 * E-postalar küçük harfle saklandığı için önek küçük harfe çevrilir; boşluk içeren
 * (isim araması gibi) ifadeler yerel filtrelemeye bırakılır.
 */
export function emailSearchPrefix(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.length < 3 || /\s/.test(value)) return null;
  if (value.includes("@") || /^[a-z0-9._%+-]+$/.test(value)) return value;
  return null;
}

export type RevenueSubscriptionInput = {
  businessId: string;
  /** Aynı firmanın şubeleri tek abonelik sayılır. */
  organizationId?: string | null;
  plan: string;
  status: string;
  isLifetime: boolean;
  ownerUid?: string;
  billingCycle?: "monthly" | "yearly";
};
export type RevenuePlanPrice = { id: string; monthlyPrice: number; yearlyPrice: number };

/**
 * Tahmini MRR/ARR: yalnızca aktif, süresiz olmayan ve yönetici hesabına ait olmayan abonelikler;
 * fiyat gerçek paketten (yoksa fallback), yıllık ödemede yıllık/12. Firma başına bir kez sayılır.
 */
export function estimateRecurringRevenue(
  subscriptions: RevenueSubscriptionInput[],
  plans: RevenuePlanPrice[],
  fallback: RevenuePlanPrice,
  adminUids: ReadonlySet<string> = new Set(),
): { mrr: number; arr: number; payingAccounts: number; skippedLifetime: number; skippedAdmin: number } {
  const seen = new Set<string>();
  let monthly = 0, payingAccounts = 0, skippedLifetime = 0, skippedAdmin = 0;
  for (const item of subscriptions) {
    if (item.status !== "active") continue;
    if (item.isLifetime) { skippedLifetime++; continue; }
    if (item.ownerUid && adminUids.has(item.ownerUid)) { skippedAdmin++; continue; }
    const accountKey = item.organizationId ? `org:${item.organizationId}` : `biz:${item.businessId}`;
    if (seen.has(accountKey)) continue;
    seen.add(accountKey);
    const plan = plans.find((candidate) => candidate.id === item.plan.toUpperCase()) ?? fallback;
    monthly += item.billingCycle === "yearly" ? plan.yearlyPrice / 12 : plan.monthlyPrice;
    payingAccounts++;
  }
  const mrr = Math.round(monthly);
  return { mrr, arr: Math.round(monthly * 12), payingAccounts, skippedLifetime, skippedAdmin };
}
