import test from "node:test";
import assert from "node:assert/strict";
import { appointmentBlocksWait, calculateLiveQueueWait } from "../lib/live-queue-wait-engine.js";

const now = Date.UTC(2026, 8, 20, 15, 0);
const minute = 60_000;
const interval = (start, end) => ({ start: now + start * minute, end: now + end * minute });
const person = (id, windows = [interval(0, 180)], appointments = [], blocks = []) =>
  ({ id, windows, appointmentBlocks: appointments, blocks });
const service = (id, durationMinutes, eligibleStaffIds) => ({ id, durationMinutes, eligibleStaffIds });
const waiting = (id, joinedAt, serviceId = "cut", staffId = null) => ({
  id, serviceId, status: "waiting", joinedAt: now + joinedAt,
  assignmentMode: staffId ? "specific_staff" : "first_available",
  requestedStaffId: staffId, assignedStaffId: staffId,
});
const base = (overrides = {}) => ({ now, services: [service("cut", 30, ["a"])], staff: [person("a")],
  queue: [], target: { serviceId: "cut" }, bufferAfterMinutes: 0, ...overrides });

test("free single staff is available now; one service ahead creates a 30-minute wait", () => {
  const free = calculateLiveQueueWait(base());
  assert.equal(free.status, "available_now");
  assert.equal(free.minWaitMinutes, 0);
  assert.equal(free.peopleAhead, 0);
  const queued = calculateLiveQueueWait(base({ queue: [waiting("first", 1)] }));
  assert.equal(queued.minWaitMinutes, 30);
  assert.equal(queued.peopleAhead, 1);
  assert.ok(queued.maxWaitMinutes >= queued.minWaitMinutes);
  assert.equal(queued.calculatedAt, new Date(now).toISOString());
});

test("appointment gap accepts a 20-minute service but protects the 15:30 appointment from 40 minutes", () => {
  const staff = [person("a", [interval(0, 180)], [interval(30, 60)])];
  const short = calculateLiveQueueWait(base({ services: [service("cut", 20, ["a"])], staff }));
  assert.equal(short.status, "available_now");
  const long = calculateLiveQueueWait(base({ services: [service("cut", 40, ["a"])], staff }));
  assert.equal(long.minWaitMinutes, 60);
  assert.notEqual(long.status, "available_now");
  const buffered = calculateLiveQueueWait(base({ services: [service("cut", 30, ["a"])], staff,
    bufferAfterMinutes: 5 }));
  assert.equal(buffered.minWaitMinutes, 60);
});

test("two workers serve two earlier customers in parallel", () => {
  const result = calculateLiveQueueWait(base({
    services: [service("cut", 30, ["a", "b"])], staff: [person("a"), person("b")],
    queue: [waiting("first", 1), waiting("second", 2)],
  }));
  assert.equal(result.minWaitMinutes, 30);
  assert.equal(result.eligibleStaffCount, 2);
  assert.equal(result.peopleAhead, 1);
});

test("specific staff waits behind that worker while first available can use another worker", () => {
  const input = base({ services: [service("cut", 30, ["a", "b"])], staff: [person("a"), person("b")],
    queue: [waiting("first", 1, "cut", "a")] });
  assert.equal(calculateLiveQueueWait(input).minWaitMinutes, 0);
  assert.equal(calculateLiveQueueWait({ ...input, target: { serviceId: "cut", staffId: "a" } }).minWaitMinutes, 30);
});

test("only pending and confirmed appointments occupy staff capacity", () => {
  assert.equal(appointmentBlocksWait("pending"), true);
  assert.equal(appointmentBlocksWait("confirmed"), true);
  for (const status of ["cancelled", "completed", "no_show"]) assert.equal(appointmentBlocksWait(status), false);
  const blocked = calculateLiveQueueWait(base({ staff: [person("a", [interval(0, 180)], [interval(0, 60)])] }));
  const cancelled = calculateLiveQueueWait(base());
  assert.equal(blocked.minWaitMinutes, 60);
  assert.equal(cancelled.minWaitMinutes, 0);
});

test("working hours, breaks and absent staff never produce available-now", () => {
  const closed = calculateLiveQueueWait(base({ staff: [person("a", [])] }));
  assert.equal(closed.status, "business_closed");
  const closing = calculateLiveQueueWait(base({ staff: [person("a", [interval(0, 20)])] }));
  assert.equal(closing.minWaitMinutes, null);
  const breakTime = calculateLiveQueueWait(base({ staff: [person("a", [interval(0, 180)], [], [interval(0, 15)])] }));
  assert.equal(breakTime.minWaitMinutes, 15);
  const noStaff = calculateLiveQueueWait(base({ services: [service("cut", 30, [])] }));
  assert.equal(noStaff.status, "no_eligible_staff");
});

test("current service remaining time is clamped and an overrun does not imply availability", () => {
  const running = { ...waiting("current", 1), status: "in_service", assignedStaffId: "a",
    serviceStartedAt: now - 10 * minute };
  assert.equal(calculateLiveQueueWait(base({ queue: [running] })).minWaitMinutes, 20);
  const overdue = { ...running, serviceStartedAt: now - 90 * minute };
  const result = calculateLiveQueueWait(base({ queue: [overdue] }));
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.minWaitMinutes, null);
});

test("cancellation removes an earlier customer and missing duration fails closed", () => {
  const before = calculateLiveQueueWait(base({ queue: [waiting("first", 1)] }));
  const after = calculateLiveQueueWait(base({ queue: [] }));
  assert.equal(before.minWaitMinutes, 30);
  assert.equal(after.minWaitMinutes, 0);
  const malformed = calculateLiveQueueWait(base({ services: [service("cut", undefined, ["a"])] }));
  assert.equal(malformed.status, "insufficient_data");
  assert.equal(malformed.minWaitMinutes, null);
});
