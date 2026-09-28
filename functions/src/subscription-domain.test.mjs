import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSubscriptionAccess, legacyTrialWindow } from "../lib/subscription-domain.js";

const now = Date.UTC(2026, 8, 29, 12);

test("timed subscriptions require a real future end date", () => {
  assert.equal(evaluateSubscriptionAccess({ status: "active", endsAtMillis: now + 1 }, now).allowed, true);
  assert.equal(evaluateSubscriptionAccess({ status: "trialing", endsAtMillis: now + 1 }, now).allowed, true);
  assert.deepEqual(evaluateSubscriptionAccess({ status: "active", endsAtMillis: null }, now), { allowed: false, shouldExpire: true });
  assert.deepEqual(evaluateSubscriptionAccess({ status: "active", endsAtMillis: Number.NaN }, now), { allowed: false, shouldExpire: true });
  assert.deepEqual(evaluateSubscriptionAccess({ status: "trialing", endsAtMillis: now }, now), { allowed: false, shouldExpire: true });
});

test("inactive states are blocked and lifetime access ignores dates", () => {
  for (const status of ["past_due", "cancelled", "expired"]) {
    assert.deepEqual(evaluateSubscriptionAccess({ status, endsAtMillis: now + 86_400_000 }, now), { allowed: false, shouldExpire: false });
  }
  assert.equal(evaluateSubscriptionAccess({ status: "active", accessMode: "lifetime" }, now).allowed, true);
  assert.equal(evaluateSubscriptionAccess({ status: "expired", isLifetime: true }, now).allowed, true);
});

test("legacy trial is derived from the original business creation time", () => {
  const recent = legacyTrialWindow(now - 30 * 86_400_000, now);
  assert.equal(recent.status, "trialing");
  assert.equal(new Date(recent.trialEndsAt).getTime(), now + 60 * 86_400_000);

  const old = legacyTrialWindow(now - 120 * 86_400_000, now);
  assert.equal(old.status, "expired");
  assert.equal(new Date(old.trialEndsAt).getTime(), now - 30 * 86_400_000);

  assert.deepEqual(legacyTrialWindow(null, now), { status: "expired", trialStartedAt: null, trialEndsAt: null });
});
