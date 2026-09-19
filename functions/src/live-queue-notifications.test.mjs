import test from "node:test";
import assert from "node:assert/strict";
import { CALLED_GRACE_MINUTES, isCalledOverdue, isDeclaredEta, noticeCopy, shouldExpirePreviousBusinessDay, shouldSendAlmostReady, statusNotice } from "../lib/live-queue-notifications.js";

const estimate = (ahead, minutes) => ({ peopleAhead: ahead, minWaitMinutes: minutes });

test("only useful state changes create a stable notice kind", () => {
  assert.equal(statusNotice("waiting", "called"), "called");
  assert.equal(statusNotice("called", "called"), null);
  assert.equal(statusNotice("called", "no_show"), "no_show");
  assert.equal(statusNotice("waiting", "cancelled", "customer"), null);
  assert.equal(statusNotice("waiting", "cancelled", "business"), "business_cancelled");
  assert.equal(noticeCopy("called").title, "Sıran geldi");
});

test("almost-ready uses one bounded authoritative wait decision", () => {
  assert.equal(shouldSendAlmostReady("waiting", estimate(1, 12)), true);
  assert.equal(shouldSendAlmostReady("on_the_way", estimate(0, 0)), true);
  assert.equal(shouldSendAlmostReady("waiting", estimate(2, 12)), false);
  assert.equal(shouldSendAlmostReady("waiting", estimate(1, 30)), false);
  assert.equal(shouldSendAlmostReady("called", estimate(0, 0)), false);
  assert.equal(shouldSendAlmostReady("waiting", estimate(null, null)), false);
});

test("ETA and called grace accept only safe values", () => {
  for (const value of [5, 10, 15, 20]) assert.equal(isDeclaredEta(value), true);
  for (const value of [0, 6, 60, "10", null]) assert.equal(isDeclaredEta(value), false);
  const now = 1_000_000;
  assert.equal(isCalledOverdue(now - CALLED_GRACE_MINUTES * 60_000 + 1, now), false);
  assert.equal(isCalledOverdue(now - CALLED_GRACE_MINUTES * 60_000, now), true);
  assert.equal(isCalledOverdue(null, now), false);
  assert.equal(shouldExpirePreviousBusinessDay("called", "2026-09-18", "2026-09-19"), true);
  assert.equal(shouldExpirePreviousBusinessDay("waiting", "2026-09-19", "2026-09-19"), false);
  assert.equal(shouldExpirePreviousBusinessDay("in_service", "2026-09-18", "2026-09-19"), false);
});
