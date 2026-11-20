import test from "node:test";
import assert from "node:assert/strict";
import { arrivalPhase, busyHighlights, busyLevel, expectedStartMs, gridHourRange, openHoursOf, visitRhythm } from "./moments-domain.ts";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const H = 3_600_000;
const D = 86_400_000;

test("varış kartı penceresi", () => {
  assert.equal(arrivalPhase("confirmed", NOW + 2 * H, NOW), "open");
  assert.equal(arrivalPhase("confirmed", NOW + 5 * H, NOW), "soon");
  assert.equal(arrivalPhase("confirmed", NOW + 30 * H, NOW), "hidden");
  assert.equal(arrivalPhase("confirmed", NOW - 20 * 60_000, NOW), "open");
  assert.equal(arrivalPhase("confirmed", NOW - 40 * 60_000, NOW), "hidden");
  assert.equal(arrivalPhase("completed", NOW + H, NOW), "hidden");
  assert.equal(expectedStartMs(NOW, { minutes: 15 }), NOW + 15 * 60_000);
  assert.equal(expectedStartMs(NOW, null), NOW);
});

test("açık saatler yarım saatleri dışarıda bırakır", () => {
  assert.deepEqual(openHoursOf({ day: 1, isOpen: true, start: "09:30", end: "13:00" }), [10, 11, 12]);
  assert.deepEqual(openHoursOf({ day: 1, isOpen: false, start: "09:00", end: "18:00" }), []);
  assert.deepEqual(gridHourRange([{ day: 1, isOpen: true, start: "10:00", end: "19:00" }, { day: 6, isOpen: true, start: "09:00", end: "14:00" }]), [9, 19]);
  assert.equal(gridHourRange([]), null);
});

test("en sakin pencereler gün başına bir tane, en yoğun pencere ayrı", () => {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(50));
  grid[2][10] = 0; grid[2][11] = 10; // Salı 10-12 çok sakin
  grid[4][14] = 20; grid[4][15] = 20; // Perşembe 14-16
  grid[5][18] = 100; grid[5][19] = 90; // Cuma akşam yoğun
  const schedule = [1, 2, 3, 4, 5].map((day) => ({ day, isOpen: true, start: "09:00", end: "20:00" }));
  const { calm, peak } = busyHighlights(grid, schedule, 3);
  assert.deepEqual(calm[0], { day: 2, startHour: 10, endHour: 12, load: 5 });
  assert.equal(calm[1].day, 4);
  assert.equal(new Set(calm.map((item) => item.day)).size, calm.length);
  assert.deepEqual(peak, { day: 5, startHour: 18, endHour: 20, load: 95 });
  assert.deepEqual(busyHighlights(grid, []), { calm: [], peak: null });
  assert.equal(busyLevel(0), 0);
  assert.equal(busyLevel(80), 4);
});

const base = { businessId: "b1", businessName: "Salon", businessSlug: "salon", serviceId: "s1", serviceName: "Saç kesimi", staffId: "st1" };

test("ziyaret ritmi: medyan aralık ve sıradaki tarih", () => {
  const rows = [0, 21, 42].map((days) => ({ ...base, startAt: new Date(NOW - 60 * D + days * D).toISOString(), status: "completed" }));
  const [suggestion] = visitRhythm(rows, NOW);
  assert.equal(suggestion.everyDays, 21);
  assert.equal(suggestion.visits, 3);
  assert.equal(suggestion.daysUntil, 3);
  assert.equal(suggestion.staffId, "st1");
});

test("ziyaret ritmi: yaklaşan randevu, tek ziyaret, iptaller ve çok eski ritim öneri üretmez", () => {
  const rows = [0, 21].map((days) => ({ ...base, startAt: new Date(NOW - 30 * D + days * D).toISOString(), status: "completed" }));
  assert.equal(visitRhythm([...rows, { ...base, startAt: new Date(NOW + 2 * D).toISOString(), status: "confirmed" }], NOW).length, 0);
  assert.equal(visitRhythm(rows.slice(0, 1), NOW).length, 0);
  assert.equal(visitRhythm(rows.map((row) => ({ ...row, status: "cancelled" })), NOW).length, 0);
  const old = [0, 10].map((days) => ({ ...base, startAt: new Date(NOW - 200 * D + days * D).toISOString(), status: "completed" }));
  assert.equal(visitRhythm(old, NOW).length, 0);
  const sameDay = [{ ...base, startAt: new Date(NOW - 10 * D).toISOString(), status: "completed" }, { ...base, startAt: new Date(NOW - 10 * D + H).toISOString(), status: "completed" }];
  assert.equal(visitRhythm(sameDay, NOW).length, 0);
});
