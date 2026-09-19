import test from "node:test";
import assert from "node:assert/strict";
import { waitEstimateLabel } from "./wait-estimate.ts";

const estimate = { status: "waiting", minWaitMinutes: 12, maxWaitMinutes: 19,
  estimatedServiceStart: "2026-09-20T15:12:00.000Z", peopleAhead: 2,
  eligibleStaffCount: 2, reason: "SCHEDULED_CAPACITY", calculatedAt: "2026-09-20T15:00:00.000Z" };

test("customer wait copy uses ranges and avoids fake precision when unavailable", () => {
  assert.equal(waitEstimateLabel(estimate), "Tahmini bekleme: 12–19 dk");
  assert.equal(waitEstimateLabel({ ...estimate, status: "available_now", minWaitMinutes: 0, maxWaitMinutes: 0 }), "Şimdi müsait");
  assert.equal(waitEstimateLabel({ ...estimate, status: "insufficient_data", minWaitMinutes: null, maxWaitMinutes: null }),
    "Bekleme süresi şu anda hesaplanamıyor");
});
