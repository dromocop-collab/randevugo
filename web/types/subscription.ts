import type { AnyPlanType } from "@/constants/plans";
import type { EntityBase } from "@/types/common";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type PaymentProviderKey = "manual" | "iyzico" | "paytr";

export interface Subscription extends EntityBase {
  businessId: string;
  plan: AnyPlanType;
  status: SubscriptionStatus;
  accessMode?: "timed" | "lifetime";
  isLifetime?: boolean;

  /** Trial period */
  trialStartedAt?: string;
  trialEndsAt?: string;

  /** Active subscription period */
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;

  /** Renewal */
  renewalEnabled: boolean;

  /** Payment provider integration */
  paymentProvider: PaymentProviderKey;
  paymentCustomerId?: string;
  paymentSubscriptionId?: string;

  /** @deprecated Legacy fields — backward compat */
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  provider?: string;
}

/** Check if subscription gives active access */
export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.isLifetime === true || sub.accessMode === "lifetime") return true;
  const endValue = sub.status === "trialing" ? sub.trialEndsAt : sub.subscriptionEndsAt;
  const endMillis = endValue ? new Date(endValue).getTime() : null;
  if (sub.status === "trialing") return endMillis !== null && Number.isFinite(endMillis) && endMillis > Date.now();
  if (sub.status !== "active") return false;
  return endMillis !== null && Number.isFinite(endMillis) && endMillis > Date.now();
}

export function subscriptionAccessState(sub: Subscription | null): "loading" | "active" | "expiring" | "expired" {
  if (!sub) return "loading";
  if (!isSubscriptionActive(sub)) return "expired";
  const endValue = sub.status === "trialing" ? sub.trialEndsAt : sub.subscriptionEndsAt;
  if (!endValue) return "active";
  const remaining = new Date(endValue).getTime() - Date.now();
  return remaining <= 7 * 24 * 60 * 60 * 1000 ? "expiring" : "active";
}

/** Check if trial is expiring (within 3 days) */
export function isTrialExpiringSoon(sub: Subscription | null): boolean {
  if (!sub || sub.status !== "trialing" || !sub.trialEndsAt) return false;
  const endsAt = new Date(sub.trialEndsAt).getTime();
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return endsAt - now > 0 && endsAt - now < threeDays;
}
