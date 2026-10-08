import test from "node:test";
import assert from "node:assert/strict";
import {
  activePlatformPlans, defaultPlatformPlan, featuredPlanId, normalizePlatformPlan, plansFromRestList, publicPlatformPlans, sortPlatformPlans,
} from "./platform-plan-domain.ts";

test("web süper admin belgesi olduğu gibi okunur", () => {
  const plan = normalizePlatformPlan("TAM", {
    label: "Tam Kontrol", monthlyPrice: 1499, yearlyPrice: 15000, isActive: true, isRecommended: true,
    features: ["Online randevu"], entitlements: ["appointments", "bogus"], maxStores: 10, maxStaff: 250, trialDays: 0,
  });
  assert.equal(plan.label, "Tam Kontrol");
  assert.equal(plan.monthlyPrice, 1499);
  assert.equal(plan.yearlyPrice, 15000);
  assert.equal(plan.isActive, true);
  assert.deepEqual(plan.entitlements, ["appointments"]);
  assert.equal(plan.sortOrder, null);
});

test("iOS/eski alan adları (name, price, active, status, highlighted) eşlenir", () => {
  const plan = normalizePlatformPlan("PRO", { name: "Pro", price: "199,5", highlighted: true, order: 2 });
  assert.equal(plan.label, "Pro");
  assert.equal(plan.monthlyPrice, 199.5);
  assert.equal(plan.yearlyPrice, 199.5 * 12);
  assert.equal(plan.isRecommended, true);
  assert.equal(plan.sortOrder, 2);
  assert.equal(plan.isActive, true, "alan yoksa satışta sayılır");
  assert.equal(normalizePlatformPlan("X", { active: false }).isActive, false);
  assert.equal(normalizePlatformPlan("X", { status: "draft" }).isActive, false);
  assert.equal(normalizePlatformPlan("X", { status: "active" }).isActive, true);
  assert.equal(normalizePlatformPlan("X", { isActive: true, isPublic: false }).isActive, false);
  assert.equal(normalizePlatformPlan("X", { yearlyPrice: 1200 }).monthlyPrice, 100);
});

test("sıralama: sortOrder → fiyat → ad", () => {
  const plans = [
    normalizePlatformPlan("C", { label: "C", monthlyPrice: 50 }),
    normalizePlatformPlan("B", { label: "B", monthlyPrice: 500, sortOrder: 1 }),
    normalizePlatformPlan("A", { label: "A", monthlyPrice: 100 }),
  ];
  assert.deepEqual(sortPlatformPlans(plans).map((p) => p.id), ["B", "C", "A"]);
});

test("herkese açık liste: yalnızca satıştakiler, tek vurgulu paket", () => {
  const plans = [
    normalizePlatformPlan("RANDEVUGO", { label: "SeninRandevun", monthlyPrice: 149, isActive: true, isRecommended: true }),
    normalizePlatformPlan("BASLANGIC", { label: "İleri Adım", monthlyPrice: 200, isActive: false, isRecommended: true }),
    normalizePlatformPlan("TAM", { label: "Tam Kontrol", monthlyPrice: 1499, isActive: true, isRecommended: true }),
  ];
  const result = publicPlatformPlans(plans);
  assert.deepEqual(result.map((p) => p.id), ["RANDEVUGO", "TAM"]);
  assert.deepEqual(result.map((p) => p.isRecommended), [true, false]);
  assert.deepEqual(activePlatformPlans(plans).map((p) => p.id), ["RANDEVUGO", "TAM"]);
});

test("işaretli paket yoksa ortadaki vurgulanır; satışta paket yoksa varsayılan döner", () => {
  const three = ["A", "B", "C"].map((id, index) => normalizePlatformPlan(id, { monthlyPrice: index * 10 }));
  assert.equal(featuredPlanId(three), "B");
  assert.equal(featuredPlanId([]), null);
  const fallback = publicPlatformPlans([normalizePlatformPlan("X", { isActive: false })]);
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].id, defaultPlatformPlan().id);
  assert.equal(fallback[0].isRecommended, true);
});

test("Firestore REST yanıtı çözülür", () => {
  const plans = plansFromRestList({
    documents: [{
      name: "projects/p/databases/(default)/documents/platformPlans/TAM",
      fields: {
        label: { stringValue: "Tam Kontrol" }, monthlyPrice: { integerValue: "1499" }, yearlyPrice: { doubleValue: 15000 },
        isActive: { booleanValue: true }, features: { arrayValue: { values: [{ stringValue: "Online randevu" }] } },
        updatedAt: { timestampValue: "2026-10-07T22:56:53.535Z" },
      },
    }],
  });
  assert.equal(plans.length, 1);
  assert.equal(plans[0].id, "TAM");
  assert.equal(plans[0].monthlyPrice, 1499);
  assert.equal(plans[0].yearlyPrice, 15000);
  assert.deepEqual(plans[0].features, ["Online randevu"]);
  assert.deepEqual(plansFromRestList({}), []);
});
