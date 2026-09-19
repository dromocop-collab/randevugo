import test from "node:test";
import assert from "node:assert/strict";
import { canCustomerLeaveQueue, customerQueueStatusCopy } from "./customer-queue-presentation.ts";

test("every queue lifecycle state has customer copy", () => {
  const statuses = ["waiting", "on_the_way", "called", "in_service", "completed", "cancelled", "expired", "no_show"];
  assert.deepEqual(Object.keys(customerQueueStatusCopy).sort(), [...statuses].sort());
  for (const status of statuses) {
    assert.ok(customerQueueStatusCopy[status].title.length > 0);
    assert.ok(customerQueueStatusCopy[status].detail.length > 0);
  }
  assert.match(customerQueueStatusCopy.called.title, /Sıran geldi/);
});

test("customer leave control is shown while waiting or on the way", () => {
  assert.equal(canCustomerLeaveQueue("waiting"), true);
  assert.equal(canCustomerLeaveQueue("on_the_way"), true);
  for (const status of ["called", "in_service", "completed", "cancelled", "expired", "no_show"]) {
    assert.equal(canCustomerLeaveQueue(status), false);
  }
});
