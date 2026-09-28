export type SubscriptionAccessInput = {
  status: string;
  accessMode?: string | null;
  isLifetime?: boolean;
  endsAtMillis?: number | null;
};

export type SubscriptionAccessDecision = {
  allowed: boolean;
  shouldExpire: boolean;
};

export function evaluateSubscriptionAccess(
  input: SubscriptionAccessInput,
  nowMillis = Date.now()
): SubscriptionAccessDecision {
  if (input.isLifetime === true || input.accessMode === "lifetime") {
    return { allowed: true, shouldExpire: false };
  }

  const hasValidEnd = typeof input.endsAtMillis === "number" && Number.isFinite(input.endsAtMillis);
  const periodExpired = hasValidEnd && input.endsAtMillis! <= nowMillis;
  const timedStatus = input.status === "trialing" || input.status === "active";
  return {
    // Timed access always fails closed when its end date is missing or malformed.
    allowed: timedStatus && hasValidEnd && !periodExpired,
    shouldExpire: timedStatus && (!hasValidEnd || periodExpired),
  };
}

export function legacyTrialWindow(
  createdAtMillis: number | null,
  nowMillis = Date.now(),
  trialDays = 90
): { status: "trialing" | "expired"; trialStartedAt: string | null; trialEndsAt: string | null } {
  if (createdAtMillis === null || !Number.isFinite(createdAtMillis) || createdAtMillis <= 0) {
    return { status: "expired", trialStartedAt: null, trialEndsAt: null };
  }
  const endMillis = createdAtMillis + trialDays * 86_400_000;
  return {
    status: endMillis > nowMillis ? "trialing" : "expired",
    trialStartedAt: new Date(createdAtMillis).toISOString(),
    trialEndsAt: new Date(endMillis).toISOString(),
  };
}
