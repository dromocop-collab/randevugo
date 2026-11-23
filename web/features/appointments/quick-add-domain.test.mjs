import test from "node:test";
import assert from "node:assert/strict";
import { customerByPhone, findConflict, formatTrPhone, freeStarts, isMobileKey, matchCustomers, minutesToClock, noShowRisk, phoneDigits, phoneKey } from "./quick-add-domain.ts";

test("telefon biçimi ve anahtarı", () => {
  assert.equal(formatTrPhone("5321234567"), "0532 123 45 67");
  assert.equal(formatTrPhone("+90 (532) 123-45-67"), "0532 123 45 67");
  assert.equal(formatTrPhone("0532"), "0532");
  assert.equal(formatTrPhone("05321234567890"), "0532 123 45 67");
  assert.equal(phoneKey("0532 123 45 67"), "+905321234567");
  assert.equal(phoneKey("00905321234567"), "+905321234567");
  assert.equal(phoneKey("0212 555 11 22"), "+902125551122");
  assert.equal(phoneKey("0532 123 45"), null);
  assert.equal(phoneKey("0832 123 45 67"), null);
  assert.equal(phoneDigits(""), "");
  assert.equal(isMobileKey("+905321234567"), true);
  assert.equal(isMobileKey("+902125551122"), false);
});

const customers = [
  { id: "a", fullName: "Ayşe Yılmaz", phone: "+905321234567", totalAppointments: 8, lastVisitAt: "2026-11-01" },
  { id: "b", fullName: "Ayten Kaya", phone: "+905441112233", totalAppointments: 2 },
  { id: "c", fullName: "Mehmet Ayaz", phone: "+905559998877", totalAppointments: 12, noShowAppointments: 4 },
  { id: "d", fullName: "Telefonsuz", phone: "" },
];

test("müşteri önerisi: isim, telefon, Türkçe harfler", () => {
  assert.deepEqual(matchCustomers(customers, "ay").map((c) => c.id), ["c", "a", "b"]);
  assert.deepEqual(matchCustomers(customers, "AYSE").map((c) => c.id), ["a"]);
  assert.deepEqual(matchCustomers(customers, "yilmaz").map((c) => c.id), ["a"]);
  assert.deepEqual(matchCustomers(customers, "0544").map((c) => c.id), ["b"]);
  assert.deepEqual(matchCustomers(customers, "9988").map((c) => c.id), ["c"]);
  assert.deepEqual(matchCustomers(customers, "a"), []);
  assert.equal(customerByPhone(customers, "+905441112233")?.id, "b");
  assert.equal(customerByPhone(customers, null), undefined);
});

test("gelmeme uyarısı", () => {
  assert.deepEqual(noShowRisk(customers[2]), { count: 4, total: 12 });
  assert.equal(noShowRisk(customers[0]), null);
  assert.equal(noShowRisk({ id: "x", fullName: "", phone: "1", totalAppointments: 20, noShowAppointments: 2 }), null);
});

const rows = [
  { id: "r1", start: 600, end: 660, staffId: "s1", status: "confirmed", label: "Ali" },   // 10:00-11:00
  { id: "r2", start: 690, end: 720, staffId: "s2", status: "pending" },                  // 11:30-12:00
  { id: "r3", start: 780, end: 840, staffId: "s1", status: "cancelled" },                // iptal
];
const hours = { isOpen: true, start: "09:00", end: "13:00", breakStart: "12:00", breakEnd: "12:30" };

test("çakışma: kişiye göre, iptal sayılmaz, düzenlenen hariç", () => {
  assert.equal(findConflict(rows, 630, 690, "s1")?.id, "r1");
  assert.equal(findConflict(rows, 630, 690, "s2"), undefined);
  assert.equal(findConflict(rows, 630, 700)?.id, "r1");
  assert.equal(findConflict(rows, 780, 840, "s1"), undefined);
  assert.equal(findConflict(rows, 600, 660, "s1", "r1"), undefined);
});

test("boş saatler: çalışma saati, mola, geçmiş ve yakınlık", () => {
  const free = freeStarts({ rows, hours, duration: 30, staffId: "s1", step: 30 }).map(minutesToClock);
  assert.deepEqual(free, ["09:00", "09:30", "11:00", "11:30", "12:30"]);
  const notPast = freeStarts({ rows, hours, duration: 30, staffId: "s1", step: 30, notBefore: 9 * 60 + 40 }).map(minutesToClock);
  assert.deepEqual(notPast, ["11:00", "11:30", "12:30"]);
  const near = freeStarts({ rows, hours, duration: 30, staffId: "s1", step: 30, around: 630, limit: 2 }).map(minutesToClock);
  assert.deepEqual(near, ["09:30", "11:00"]);
  assert.deepEqual(freeStarts({ rows, hours: { isOpen: false, start: "09:00", end: "18:00" }, duration: 30 }), []);
  assert.equal(minutesToClock(1500), "01:00");
});
