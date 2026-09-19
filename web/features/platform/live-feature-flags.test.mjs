import assert from "node:assert/strict";
import test from "node:test";
import {
  DISABLED_LIVE_FEATURE_FLAGS,
  isBusinessLiveOperationsEnabled,
  loadLiveFeatureAvailability,
  resolveLiveFeatureAvailability,
} from "./live-feature-flags.ts";

const flags = {
  ...DISABLED_LIVE_FEATURE_FLAGS,
  liveFeaturesMaster: true,
  liveQueue: true,
};

test("master and module must both be enabled", () => {
  for (const master of [false, true]) {
    for (const moduleEnabled of [false, true]) {
      const result = resolveLiveFeatureAvailability({
        ...flags,
        liveFeaturesMaster: master,
        liveQueue: moduleEnabled,
      });
      assert.equal(result.isLiveQueueEnabled, master && moduleEnabled);
    }
  }
});

test("business operations require master, queue, operations and business opt-in", () => {
  const enabled = { ...flags, liveOperations: true };
  assert.equal(isBusinessLiveOperationsEnabled(resolveLiveFeatureAvailability(enabled), true), true);
  assert.equal(isBusinessLiveOperationsEnabled(resolveLiveFeatureAvailability(enabled), false), false);
  assert.equal(isBusinessLiveOperationsEnabled(resolveLiveFeatureAvailability({ ...enabled, liveFeaturesMaster: false }), true), false);
  assert.equal(isBusinessLiveOperationsEnabled(resolveLiveFeatureAvailability({ ...enabled, liveQueue: false }), true), false);
  assert.equal(isBusinessLiveOperationsEnabled(resolveLiveFeatureAvailability({ ...enabled, liveOperations: false }), true), false);
});

test("disabling master preserves stored module choices without enabling them", () => {
  const stored = { ...flags, liveFeaturesMaster: false };
  assert.equal(stored.liveQueue, true);
  assert.equal(resolveLiveFeatureAvailability(stored).isLiveQueueEnabled, false);
});

test("missing, partial, and malformed configuration fail closed", () => {
  for (const value of [
    null,
    { liveFeaturesMaster: true, liveQueue: true },
    { ...flags, liveAvailability: "true" },
    { ...flags, liveOperations: null },
  ]) {
    assert.deepEqual(resolveLiveFeatureAvailability(value), resolveLiveFeatureAvailability(null));
  }
});

test("failed configuration load fails closed", async () => {
  const result = await loadLiveFeatureAvailability(async () => {
    throw new Error("Firestore unavailable");
  });
  assert.deepEqual(result, resolveLiveFeatureAvailability(null));
});
