import test from "node:test";
import assert from "node:assert/strict";
import { defaultPlatformPlan, statusAfterUnsuspend, statusBeforeSuspending } from "../lib/platform-admin-domain.js";

test("askıdan çıkarma önceki durumu geri yükler, bilinmiyorsa onaya döner", () => {
  assert.equal(statusAfterUnsuspend("active"), "active");
  assert.equal(statusAfterUnsuspend("rejected"), "rejected");
  assert.equal(statusAfterUnsuspend("pending_review"), "pending_review");
  assert.equal(statusAfterUnsuspend("suspended"), "pending_review");
  assert.equal(statusAfterUnsuspend(undefined), "pending_review");
});

test("askıya alırken yalnızca geri yüklenebilir durum saklanır", () => {
  assert.equal(statusBeforeSuspending("active"), "active");
  assert.equal(statusBeforeSuspending("suspended"), "pending_review");
  assert.equal(statusBeforeSuspending(null), "pending_review");
});

test("varsayılan paket tek plan fiyatlarını ve tüm yetkileri taşır", () => {
  const plan = defaultPlatformPlan(["appointments", "branches"]);
  assert.equal(plan.id, "RANDEVUGO");
  assert.equal(plan.monthlyPrice, 500);
  assert.equal(plan.yearlyPrice, 5000);
  assert.equal(plan.maxStores, 10);
  assert.deepEqual(plan.entitlements, ["appointments", "branches"]);
  assert.equal(plan.isActive, true);
});
