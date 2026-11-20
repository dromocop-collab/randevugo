import test from "node:test";
import assert from "node:assert/strict";
import {
  arrivalWindow, normalizeArrivalInput, normalizeBusinessDelay, arrivalPushText, businessDelayPushText, cascadeTargets, computeBusyHours,
} from "../lib/appointment-moments-domain.js";

const START = Date.parse("2026-11-20T12:00:00Z"); // 15:00 İstanbul, Cuma

test("varış penceresi: 3 saat önce açılır, başlangıçtan 30 dk sonra kapanır", () => {
  assert.deepEqual(arrivalWindow("confirmed", START, START - 4 * 3600_000), { open: false, reason: "too_early" });
  assert.deepEqual(arrivalWindow("pending", START, START - 2 * 3600_000), { open: true });
  assert.deepEqual(arrivalWindow("confirmed", START, START + 20 * 60_000), { open: true });
  assert.deepEqual(arrivalWindow("confirmed", START, START + 40 * 60_000), { open: false, reason: "too_late" });
  assert.deepEqual(arrivalWindow("cancelled", START, START), { open: false, reason: "status" });
  assert.deepEqual(arrivalWindow("completed", START, START), { open: false, reason: "status" });
});

test("varış girdisi doğrulanır", () => {
  assert.deepEqual(normalizeArrivalInput({ status: "on_the_way", delayMinutes: 99 }), { status: "on_the_way", delayMinutes: 0 });
  assert.deepEqual(normalizeArrivalInput({ status: "late", delayMinutes: 15 }), { status: "late", delayMinutes: 15 });
  assert.equal(normalizeArrivalInput({ status: "late", delayMinutes: 7 }), null);
  assert.equal(normalizeArrivalInput({ status: "late" }), null);
  assert.equal(normalizeArrivalInput({ status: "arrived" }), null);
  assert.deepEqual(normalizeArrivalInput({ status: "clear" }), { status: "clear", delayMinutes: 0 });
});

test("işletme gecikmesi yalnız izinli değerler", () => {
  assert.equal(normalizeBusinessDelay(0), 0);
  assert.equal(normalizeBusinessDelay("15"), 15);
  assert.equal(normalizeBusinessDelay(12), null);
  assert.equal(normalizeBusinessDelay(120), null);
});

test("bildirim metinleri", () => {
  assert.equal(arrivalPushText({ status: "on_the_way", delayMinutes: 0 }, "Ayşe", "15:00").title, "Müşteri yolda");
  assert.match(arrivalPushText({ status: "late", delayMinutes: 10 }, "", "15:00").body, /^Müşteri yaklaşık 10 dk/);
  assert.equal(arrivalPushText({ status: "clear", delayMinutes: 0 }, "Ayşe", "15:00"), null);
  assert.match(businessDelayPushText(20, "Salon", "15:00").title, /~20 dk/);
  assert.equal(businessDelayPushText(0, "Salon", "15:00").title, "Randevunuz zamanında");
});

test("gecikme yalnız aynı uzmanın sonraki aktif randevularına yayılır", () => {
  const rows = [
    { id: "a", staffId: "s1", status: "confirmed", startMs: START },
    { id: "b", staffId: "s1", status: "confirmed", startMs: START + 3600_000 },
    { id: "c", staffId: "s1", status: "cancelled", startMs: START + 7200_000 },
    { id: "d", staffId: "s2", status: "pending", startMs: START + 3600_000 },
    { id: "e", staffId: "s1", status: "pending", startMs: START - 3600_000 },
    { id: "f", staffId: "s1", status: "pending", startMs: START + 30 * 3600_000 },
  ];
  const ids = cascadeTargets(rows, { id: "a", staffId: "s1", startMs: START }, START + 12 * 3600_000).map((row) => row.id);
  assert.deepEqual(ids, ["b"]);
  assert.deepEqual(cascadeTargets(rows, { id: "a", staffId: "", startMs: START }, START + 12 * 3600_000), []);
});

test("sakin saatler: İstanbul saatine göre gün × saat, iptaller sayılmaz", () => {
  const rows = [];
  for (let week = 0; week < 6; week += 1) {
    const base = START - week * 7 * 86_400_000;
    rows.push({ startMs: base, endMs: base + 60 * 60_000, status: "completed" }); // Cuma 15:00-16:00
    rows.push({ startMs: base + 30 * 60_000, endMs: base + 60 * 60_000, status: "confirmed" }); // Cuma 15:30-16:00
    rows.push({ startMs: base + 2 * 3600_000, endMs: base + 3 * 3600_000, status: "cancelled" });
  }
  const result = computeBusyHours(rows, "Europe/Istanbul");
  assert.equal(result.sample, 12);
  assert.equal(result.enough, true);
  assert.equal(result.grid[5][15], 100);
  assert.equal(result.grid[5][17], 0);
  assert.equal(result.grid.length, 7);
  assert.equal(result.grid[0].length, 24);
  assert.equal(computeBusyHours(rows.slice(0, 3)).enough, false);
  assert.equal(computeBusyHours([]).grid[3][10], 0);
});
