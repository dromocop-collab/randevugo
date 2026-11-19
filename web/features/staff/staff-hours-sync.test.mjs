import { test } from "node:test";
import assert from "node:assert/strict";
import { alignStaffHours, staffHoursGaps } from "./staff-hours-sync.ts";

const week = (start, end, extra = {}) => [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, isOpen: day !== 0, start, end, ...extra }));

test("işletme 21:00'e uzatıldı, personel 19:00'da kaldı → fark bulunur", () => {
  const gaps = staffHoursGaps(week("09:00", "21:00"), [{ id: "s1", fullName: "Yavuz", workingHours: week("09:00", "19:00") }]);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].days.length, 6);
  assert.deepEqual(gaps[0].days[0], { day: 1, businessStart: "09:00", businessEnd: "21:00", staffStart: "09:00", staffEnd: "19:00" });
});

test("geç açılış da fark sayılır; izin günü, pasif ve saatsiz personel sayılmaz", () => {
  const business = week("08:00", "19:00");
  const staffHours = week("09:00", "19:00").map((item) => item.day === 3 ? { ...item, isOpen: false } : item);
  const gaps = staffHoursGaps(business, [
    { id: "a", fullName: "A", workingHours: staffHours },
    { id: "b", fullName: "B", isActive: false, workingHours: week("09:00", "12:00") },
    { id: "c", fullName: "C", workingHours: [] },
    { id: "d", fullName: "D", workingHours: week("08:00", "19:00") },
  ]);
  assert.deepEqual(gaps.map((item) => item.staffId), ["a"]);
  assert.equal(gaps[0].days.length, 5);
  assert.ok(!gaps[0].days.some((item) => item.day === 3));
});

test("eşitleme: çalıştığı günler işletme saatine çekilir, izin günü ve uygun mola kalır", () => {
  const staffHours = week("09:00", "19:00", { breakStart: "13:00", breakEnd: "14:00" }).map((item) => item.day === 2 ? { ...item, isOpen: false } : item);
  const aligned = alignStaffHours(staffHours, week("10:35", "23:59"));
  const monday = aligned.find((item) => item.day === 1);
  assert.equal(monday.start, "10:35");
  assert.equal(monday.end, "23:59");
  assert.equal(monday.breakStart, "13:00");
  assert.equal(aligned.find((item) => item.day === 2).isOpen, false);
  assert.equal(aligned.find((item) => item.day === 0).isOpen, false);
});

test("eşitleme: yeni aralığın dışında kalan mola silinir", () => {
  const aligned = alignStaffHours(week("09:00", "19:00", { breakStart: "09:30", breakEnd: "10:00" }), week("12:00", "20:00"));
  assert.equal(aligned[0].breakStart, undefined);
  assert.equal(aligned[0].start, "12:00");
});
