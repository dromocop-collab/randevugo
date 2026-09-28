"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSubscriptionAccess = evaluateSubscriptionAccess;
exports.legacyTrialWindow = legacyTrialWindow;
function evaluateSubscriptionAccess(input, nowMillis = Date.now()) {
    if (input.isLifetime === true || input.accessMode === "lifetime") {
        return { allowed: true, shouldExpire: false };
    }
    const hasValidEnd = typeof input.endsAtMillis === "number" && Number.isFinite(input.endsAtMillis);
    const periodExpired = hasValidEnd && input.endsAtMillis <= nowMillis;
    const timedStatus = input.status === "trialing" || input.status === "active";
    return {
        // Timed access always fails closed when its end date is missing or malformed.
        allowed: timedStatus && hasValidEnd && !periodExpired,
        shouldExpire: timedStatus && (!hasValidEnd || periodExpired),
    };
}
function legacyTrialWindow(createdAtMillis, nowMillis = Date.now(), trialDays = 90) {
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
//# sourceMappingURL=subscription-domain.js.map