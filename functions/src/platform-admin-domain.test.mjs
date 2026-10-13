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
  assert.equal(plan.monthlyPrice, 490);
  assert.equal(plan.yearlyPrice, 4990);
  assert.equal(plan.maxStores, 10);
  assert.deepEqual(plan.entitlements, ["appointments", "branches"]);
  assert.equal(plan.isActive, true);
});

test("recommended plans keep existing prices and set limits", async () => {
  const { RECOMMENDED_PLATFORM_PLANS, recommendedPlanPatch } = await import("../lib/platform-admin-domain.js");
  const [basic, full] = RECOMMENDED_PLATFORM_PLANS;
  const patch = recommendedPlanPatch(basic, { label: "SeninRandevun", monthlyPrice: 490, yearlyPrice: 4990, currency: "TRY" });
  assert.equal("monthlyPrice" in patch, false);
  assert.equal(patch.maxStores, 1);
  assert.equal(patch.smsMonthlyQuota, 150);
  assert.ok(patch.entitlements.includes("customers"));
  assert.ok(!patch.entitlements.includes("branches"));
  const fresh = recommendedPlanPatch(full, undefined);
  assert.equal(fresh.monthlyPrice, 1499);
  assert.equal(fresh.label, "Tam Kontrol");
  assert.ok(fresh.entitlements.includes("branches") && fresh.entitlements.includes("analytics"));
  // Tam paket Temel'in tüm yetkilerini içerir.
  assert.ok(basic.entitlements.every((key) => full.entitlements.includes(key)));
});
