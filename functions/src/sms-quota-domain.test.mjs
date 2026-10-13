import test from "node:test";
import assert from "node:assert/strict";
import { consumeSms, findSmsPack, normalizeSmsUsage, planSmsQuota, smsAllowance, smsPeriodKey, smsQuotaWarning } from "../lib/sms-quota-domain.js";

test("plan quota: missing means unlimited, numbers are floored", () => {
  assert.equal(planSmsQuota({}), null);
  assert.equal(planSmsQuota(null), null);
  assert.equal(planSmsQuota({ smsMonthlyQuota: "" }), null);
  assert.equal(planSmsQuota({ smsMonthlyQuota: 150 }), 150);
  assert.equal(planSmsQuota({ smsMonthlyQuota: "750.9" }), 750);
  assert.equal(planSmsQuota({ smsMonthlyQuota: 0 }), 0);
  assert.equal(planSmsQuota({ smsMonthlyQuota: -5 }), null);
});

test("period key follows Istanbul time", () => {
  // 31 Ekim 22:30 UTC = 1 Kasım 01:30 İstanbul
  assert.equal(smsPeriodKey(Date.UTC(2026, 9, 31, 22, 30)), "2026-11");
  assert.equal(smsPeriodKey(Date.UTC(2026, 9, 12, 9)), "2026-10");
});

test("usage resets each month but keeps extra credits", () => {
  assert.deepEqual(normalizeSmsUsage({ periodKey: "2026-09", used: 140, extraBalance: 30 }, "2026-10"), { periodKey: "2026-10", used: 0, extraBalance: 30 });
  assert.deepEqual(normalizeSmsUsage({ periodKey: "2026-10", used: 12, extraBalance: 0 }, "2026-10"), { periodKey: "2026-10", used: 12, extraBalance: 0 });
  assert.deepEqual(normalizeSmsUsage(undefined, "2026-10"), { periodKey: "2026-10", used: 0, extraBalance: 0 });
});

test("allowance uses monthly quota then extra credits", () => {
  const s = { periodKey: "2026-10", used: 150, extraBalance: 0 };
  assert.equal(smsAllowance(s, 150).canSend, false);
  assert.equal(smsAllowance({ ...s, extraBalance: 1 }, 150).canSend, true);
  assert.equal(smsAllowance(s, null).canSend, true);
  assert.equal(smsAllowance({ ...s, used: 10 }, 150).monthlyRemaining, 140);
});

test("consume draws monthly first, then extra", () => {
  assert.deepEqual(consumeSms({ periodKey: "p", used: 149, extraBalance: 10 }, 2, 150), { periodKey: "p", used: 150, extraBalance: 9 });
  assert.deepEqual(consumeSms({ periodKey: "p", used: 150, extraBalance: 10 }, 1, 150), { periodKey: "p", used: 150, extraBalance: 9 });
  assert.deepEqual(consumeSms({ periodKey: "p", used: 0, extraBalance: 0 }, 3, 150), { periodKey: "p", used: 3, extraBalance: 0 });
  assert.deepEqual(consumeSms({ periodKey: "p", used: 5, extraBalance: 0 }, 1, null), { periodKey: "p", used: 6, extraBalance: 0 });
  // Bakiye yetmezse taşan kısım used'a yazılır, bakiye eksiye düşmez.
  assert.deepEqual(consumeSms({ periodKey: "p", used: 150, extraBalance: 1 }, 3, 150), { periodKey: "p", used: 152, extraBalance: 0 });
});

test("warnings at 80% and exhaustion, silenced by extra credits", () => {
  assert.equal(smsQuotaWarning({ periodKey: "p", used: 119, extraBalance: 0 }, 150), null);
  assert.equal(smsQuotaWarning({ periodKey: "p", used: 120, extraBalance: 0 }, 150), "low");
  assert.equal(smsQuotaWarning({ periodKey: "p", used: 150, extraBalance: 0 }, 150), "exhausted");
  assert.equal(smsQuotaWarning({ periodKey: "p", used: 150, extraBalance: 5 }, 150), null);
  assert.equal(smsQuotaWarning({ periodKey: "p", used: 999, extraBalance: 0 }, null), null);
});

test("sms packs are looked up case-insensitively", () => {
  assert.equal(findSmsPack("sms250")?.count, 250);
  assert.equal(findSmsPack("nope"), null);
});
