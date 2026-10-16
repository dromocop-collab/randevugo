import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardRows, moveItem } from "./layout-domain.ts";

const sizes = { kpis: "full", profile: "full", operations: "wide", command: "side", insights: "side" };
const size = (id) => sizes[id];

test("default order: full, then wide+sides side by side, then full", () => {
  assert.deepEqual(buildDashboardRows(["kpis", "operations", "command", "insights", "profile"], size), [
    { kind: "full", id: "kpis", index: 0 },
    { kind: "split", left: ["operations"], right: ["command", "insights"], index: 1 },
    { kind: "full", id: "profile", index: 4 },
  ]);
});

test("column modules gather in one block at the first one's position, even across full rows", () => {
  assert.deepEqual(buildDashboardRows(["command", "insights", "operations", "kpis"], size), [
    { kind: "split", left: ["operations"], right: ["command", "insights"], index: 0 },
    { kind: "full", id: "kpis", index: 3 },
  ]);
  assert.deepEqual(buildDashboardRows(["operations", "kpis", "command", "profile", "insights"], size), [
    { kind: "split", left: ["operations"], right: ["command", "insights"], index: 0 },
    { kind: "full", id: "kpis", index: 1 },
    { kind: "full", id: "profile", index: 3 },
  ]);
  assert.deepEqual(buildDashboardRows(["kpis", "command"], size), [
    { kind: "full", id: "kpis", index: 0 },
    { kind: "full", id: "command", index: 1 },
  ]);
});

test("only side modules alternate columns", () => {
  assert.deepEqual(buildDashboardRows(["command", "insights"], size), [{ kind: "split", left: ["command"], right: ["insights"], index: 0 }]);
});

test("moveItem", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b"], 1, 1), ["a", "b"]);
});
