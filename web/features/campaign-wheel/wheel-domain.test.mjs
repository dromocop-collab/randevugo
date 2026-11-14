import test from "node:test";
import assert from "node:assert/strict";
import { planLanding, easeOutCubic, sliceOdds, previewPick, prizeDiscount, readableInk, wheelIsLive } from "./wheel-domain.ts";

function landedIndex(finalAngle, count) {
  // İşaretçi tepede; işaretçinin altındaki dilim: (−açı) mod 360 içindeki dilim.
  const under = ((-finalAngle % 360) + 360) % 360;
  return Math.floor(under / (360 / count));
}

test("planLanding hedef dilimde durur (her açı, hız, sapma)", () => {
  for (const count of [2, 5, 8, 12]) {
    for (let target = 0; target < count; target++) {
      for (const angle of [0, 37.5, 359, -720, 12345.6]) {
        for (const jitter of [-0.5, 0, 0.49]) {
          const plan = planLanding({ angle, velocity: 900, targetIndex: target, sliceCount: count, jitter });
          assert.equal(landedIndex(angle + plan.distance, count), target, `count=${count} target=${target} angle=${angle} jitter=${jitter}`);
          assert.ok(plan.distance >= 4 * 360);
          assert.ok(plan.durationMs >= 3800 && plan.durationMs <= 9000);
        }
      }
    }
  }
});

test("yavaşlama eğrisi", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.8);
});

test("olasılık ve önizleme", () => {
  const slices = [{ id: "a", weight: 30, stock: null }, { id: "b", weight: 10, stock: 1 }, { id: "c", weight: 60, stock: null }];
  assert.deepEqual(sliceOdds(slices, {}).map(Math.round), [30, 10, 60]);
  assert.deepEqual(sliceOdds(slices, { b: 1 }).map((n) => Math.round(n * 10) / 10), [33.3, 0, 66.7]);
  assert.equal(previewPick(slices, 0.05), 0);
  assert.equal(previewPick(slices, 0.35), 1);
  assert.equal(previewPick(slices, 0.99), 2);
});

test("indirim ve yardımcılar", () => {
  assert.equal(prizeDiscount({ type: "percent", value: 25, serviceId: null }, [], 400), 100);
  assert.equal(prizeDiscount({ type: "free_service", value: 0, serviceId: "x" }, [{ serviceId: "x", price: 120 }], 300), 120);
  assert.equal(readableInk("#d7ff70"), "#10281d");
  assert.equal(readableInk("#0f5132"), "#ffffff");
  assert.equal(wheelIsLive({ startsAt: 10, endsAt: 20 }, 15), true);
  assert.equal(wheelIsLive({ startsAt: 10, endsAt: 20 }, 25), false);
});
