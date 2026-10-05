import assert from "node:assert/strict";
import test from "node:test";
import { emailSearchPrefix, estimateRecurringRevenue, isStaleSupportTicket, statusAfterUnsuspend, statusBeforeSuspending } from "./admin-ops.ts";

const HOUR = 3_600_000;

test("24 saati aşan ve ekip yanıtı bekleyen talep gecikmiş sayılır", () => {
  const now = Date.UTC(2026, 9, 5, 12);
  assert.equal(isStaleSupportTicket("open", now - 25 * HOUR, now), true);
  assert.equal(isStaleSupportTicket("waiting_admin", now - 25 * HOUR, now), true);
  assert.equal(isStaleSupportTicket("waiting_admin", now - 2 * HOUR, now), false);
  assert.equal(isStaleSupportTicket("waiting_user", now - 72 * HOUR, now), false);
  assert.equal(isStaleSupportTicket("resolved", now - 72 * HOUR, now), false);
  assert.equal(isStaleSupportTicket("open", null, now), false);
});

test("askıdan çıkarma önceki durumu geri yükler, bilinmiyorsa onay beklemeye döner", () => {
  assert.equal(statusAfterUnsuspend("active"), "active");
  assert.equal(statusAfterUnsuspend("pending_review"), "pending_review");
  assert.equal(statusAfterUnsuspend("rejected"), "rejected");
  assert.equal(statusAfterUnsuspend(undefined), "pending_review");
  assert.equal(statusAfterUnsuspend("suspended"), "pending_review");
  assert.equal(statusAfterUnsuspend("garip"), "pending_review");
});

test("askıya alırken saklanan önceki durum", () => {
  assert.equal(statusBeforeSuspending("active"), "active");
  assert.equal(statusBeforeSuspending("pending_review"), "pending_review");
  assert.equal(statusBeforeSuspending("suspended"), "pending_review");
  assert.equal(statusBeforeSuspending(undefined), "pending_review");
});

test("e-posta önek araması yalnızca uygun ifadelerde yapılır", () => {
  assert.equal(emailSearchPrefix("Cihat@Gmail"), "cihat@gmail");
  assert.equal(emailSearchPrefix("cihat.erdem"), "cihat.erdem");
  assert.equal(emailSearchPrefix("ci"), null);
  assert.equal(emailSearchPrefix("Cihat Erdem"), null);
  assert.equal(emailSearchPrefix("çağrı"), null);
});

test("gelir tahmini gerçek paket fiyatını kullanır, süresiz/yönetici/şube tekrarını atlar", () => {
  const fallback = { id: "RANDEVUGO", monthlyPrice: 149, yearlyPrice: 1490 };
  const plans = [{ id: "PRO_PLUS", monthlyPrice: 300, yearlyPrice: 2400 }];
  const result = estimateRecurringRevenue([
    { businessId: "a", plan: "PRO_PLUS", status: "active", isLifetime: false },
    { businessId: "b", organizationId: "org1", plan: "RANDEVUGO", status: "active", isLifetime: false, billingCycle: "yearly" },
    { businessId: "c", organizationId: "org1", plan: "RANDEVUGO", status: "active", isLifetime: false },
    { businessId: "d", plan: "RANDEVUGO", status: "active", isLifetime: true },
    { businessId: "e", plan: "RANDEVUGO", status: "active", isLifetime: false, ownerUid: "admin" },
    { businessId: "f", plan: "RANDEVUGO", status: "trialing", isLifetime: false },
  ], plans, fallback, new Set(["admin"]));
  assert.equal(result.payingAccounts, 2);
  assert.equal(result.mrr, Math.round(300 + 1490 / 12));
  assert.equal(result.skippedLifetime, 1);
  assert.equal(result.skippedAdmin, 1);
});
