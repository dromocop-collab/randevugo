import test from "node:test";
import assert from "node:assert/strict";
import { apnsPresentation } from "../lib/push-domain.js";

test("push threads group by audience and business", () => {
  assert.equal(apnsPresentation({ kind: "appointment_created", route: "appointment", audience: "business", businessId: "b1" }).threadId, "appointments-business-b1");
  assert.equal(apnsPresentation({ kind: "appointment_reminder", audience: "customer", businessId: "b1" }).threadId, "appointments-customer-b1");
  assert.equal(apnsPresentation({ audience: "admin", route: "admin_support" }).threadId, "admin-admin_support");
  assert.equal(apnsPresentation({ kind: "live_queue", entryId: "e9", businessId: "b1" }).threadId, "queue-e9");
  assert.equal(apnsPresentation({ kind: "platform_campaign" }).threadId, "platform");
  assert.equal(apnsPresentation({ kind: "business_announcement", businessId: "b/../x" }).threadId, "business_announcement-bx");
});

test("only queue calls and availability are time-sensitive", () => {
  assert.equal(apnsPresentation({ kind: "live_queue", eventKind: "called" }).interruptionLevel, "time-sensitive");
  assert.equal(apnsPresentation({ kind: "live_queue", eventKind: "expired" }).interruptionLevel, "active");
  assert.equal(apnsPresentation({ kind: "availability_alert" }).interruptionLevel, "time-sensitive");
  assert.equal(apnsPresentation({ kind: "appointment_created" }).interruptionLevel, "active");
});
