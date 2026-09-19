import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionQueue, isActiveQueueStatus, isQueueStatus, isSameActiveJoin,
  liveOperationsGate, liveQueueGate, operatorQueueTransitions, queueIntakeOpen, validateQueueSelection,
} from "../lib/live-queue-domain.js";

const flags = {
  liveFeaturesMaster: true, liveAvailability: false, liveQueue: true,
  lastMinuteSlots: false, availabilityAlerts: false, liveOperations: false,
};
const business = { status: "active", isPublished: true, isSuspended: false };
const service = { isActive: true, isBookableOnline: true, durationMinutes: 30, assignableStaffIds: ["staff-1"], category: "hair" };
const staff = { isActive: true, serviceIds: ["service-1"], specialtyCategoryIds: ["hair"] };

test("global master, module and business opt-in must all be true; partial config fails closed", () => {
  assert.equal(liveQueueGate(flags, true), true);
  assert.equal(liveQueueGate({ ...flags, liveFeaturesMaster: false }, true), false);
  assert.equal(liveQueueGate({ ...flags, liveQueue: false }, true), false);
  assert.equal(liveQueueGate(flags, false), false);
  assert.equal(liveQueueGate({ liveFeaturesMaster: true, liveQueue: true }, true), false);
  assert.equal(liveQueueGate(null, true), false);
  assert.equal(liveOperationsGate({ ...flags, liveOperations: true }), true);
  assert.equal(liveOperationsGate(flags), false);
  assert.equal(queueIntakeOpen({ ...flags, liveOperations: true }, true, true), false);
  assert.equal(queueIntakeOpen({ ...flags, liveOperations: true }, true, false), true);
  assert.equal(queueIntakeOpen(flags, true, false), false);
});

test("business, service and staff selection uses authoritative relationships", () => {
  assert.equal(validateQueueSelection(business, service, staff, "service-1", "staff-1"), null);
  assert.equal(validateQueueSelection(null, service, staff, "service-1", "staff-1"), "business");
  assert.equal(validateQueueSelection(business, null, staff, "service-1", "staff-1"), "service");
  assert.equal(validateQueueSelection(business, service, null, "service-1", "staff-1"), "staff");
  assert.equal(validateQueueSelection(business, service, staff, "service-1", "staff-2"), "staff");
  assert.equal(validateQueueSelection(business, service, { ...staff, serviceIds: ["other"] }, "service-1", "staff-1"), "staff");
  assert.equal(validateQueueSelection({ ...business, isSuspended: true }, service, staff, "service-1", "staff-1"), "business");
});

test("retry of an active join resolves to the same entry; other selections do not", () => {
  const entry = { status: "waiting", customerId: "user-1", serviceId: "service-1", requestedStaffId: null };
  assert.equal(isSameActiveJoin(entry, "user-1", "service-1", null), true);
  assert.equal(isSameActiveJoin(entry, "user-2", "service-1", null), false);
  assert.equal(isSameActiveJoin(entry, "user-1", "service-2", null), false);
  assert.equal(isSameActiveJoin({ ...entry, status: "completed" }, "user-1", "service-1", null), false);
});

test("state machine permits lifecycle transitions and never reactivates terminal entries", () => {
  assert.equal(canTransitionQueue("waiting", "called"), true);
  assert.equal(canTransitionQueue("waiting", "on_the_way"), true);
  assert.equal(canTransitionQueue("called", "in_service"), true);
  assert.equal(canTransitionQueue("in_service", "completed"), true);
  assert.equal(canTransitionQueue("called", "no_show"), true);
  assert.deepEqual(operatorQueueTransitions("waiting"), ["called", "cancelled", "expired"]);
  assert.equal(canTransitionQueue("waiting", "completed"), false);
  for (const terminal of ["completed", "cancelled", "expired", "no_show"]) {
    assert.equal(isActiveQueueStatus(terminal), false);
    assert.equal(canTransitionQueue(terminal, "waiting"), false);
  }
  assert.equal(isQueueStatus("toString"), false);
});
