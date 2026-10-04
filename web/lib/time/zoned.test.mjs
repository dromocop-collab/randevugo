import test from "node:test";
import assert from "node:assert/strict";
import { zonedDateTimeToMillis, millisToZonedDateTime } from "./zoned.ts";

test("İstanbul saati UTC+3 olarak çevrilir (tarayıcı saat diliminden bağımsız)", () => {
  assert.equal(zonedDateTimeToMillis("2026-10-05", "09:30"), Date.UTC(2026, 9, 5, 6, 30));
  assert.equal(zonedDateTimeToMillis("2026-01-15", "00:00"), Date.UTC(2026, 0, 14, 21, 0));
  assert.deepEqual(millisToZonedDateTime(Date.UTC(2026, 9, 4, 22, 15)), { date: "2026-10-05", time: "01:15" });
});
test("geçersiz girdi NaN döner", () => {
  assert.ok(Number.isNaN(zonedDateTimeToMillis("2026-13", "9:00")));
});
test("yaz saati olan bölgede de gidiş-dönüş tutarlı", () => {
  const ms = zonedDateTimeToMillis("2026-07-01", "10:00", "Europe/Berlin");
  assert.deepEqual(millisToZonedDateTime(ms, "Europe/Berlin"), { date: "2026-07-01", time: "10:00" });
});
