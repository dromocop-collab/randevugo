import assert from "node:assert/strict";
import test from "node:test";
import { emailSearchPrefix, isStaleSupportTicket, statusAfterUnsuspend, statusBeforeSuspending } from "./admin-ops.ts";

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
