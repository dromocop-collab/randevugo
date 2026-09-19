import test from "node:test";
import assert from "node:assert/strict";
import { ALERT_COOLDOWN_MINUTES, alertCoversSlot, isNewAlertMatch, liveModuleEnabled } from "../lib/availability-alert-domain.js";

const flags = { liveFeaturesMaster: true, liveAvailability: false, liveQueue: false,
  lastMinuteSlots: true, availabilityAlerts: true, liveOperations: false };

test("live alert modules fail closed under missing, malformed and disabled configuration", () => {
  assert.equal(liveModuleEnabled(null, "availabilityAlerts", true), false);
  assert.equal(liveModuleEnabled({ ...flags, liveQueue: undefined }, "availabilityAlerts", true), false);
  assert.equal(liveModuleEnabled({ ...flags, liveFeaturesMaster: false }, "availabilityAlerts", true), false);
  assert.equal(liveModuleEnabled({ ...flags, availabilityAlerts: false }, "availabilityAlerts", true), false);
  assert.equal(liveModuleEnabled(flags, "availabilityAlerts", false), false);
  assert.equal(liveModuleEnabled(flags, "availabilityAlerts", true), true);
  assert.equal(liveModuleEnabled({ ...flags, lastMinuteSlots: false }, "lastMinuteSlots", true), false);
});

test("alert scope and cooldown reject unrelated or repeated openings", () => {
  const scope = { dateKey: "2026-10-01", startMinute: 900, endMinute: 1140, staffId: "staff-a" };
  assert.equal(alertCoversSlot(scope, "2026-10-01", 900, "staff-a"), true);
  assert.equal(alertCoversSlot(scope, "2026-10-01", 1140, "staff-a"), false);
  assert.equal(alertCoversSlot(scope, "2026-10-02", 900, "staff-a"), false);
  assert.equal(alertCoversSlot(scope, "2026-10-01", 900, "staff-b"), false);
  const now = Date.now();
  assert.equal(isNewAlertMatch(null, null, now + 60_000, now), true);
  assert.equal(isNewAlertMatch(now - 1000, now + 60_000, now + 120_000, now), false);
  assert.equal(isNewAlertMatch(now - (ALERT_COOLDOWN_MINUTES + 1) * 60_000,
    now + 60_000, now + 120_000, now), true);
  assert.equal(isNewAlertMatch(now - (ALERT_COOLDOWN_MINUTES + 1) * 60_000,
    now + 60_000, now + 60_000, now), false);
});
