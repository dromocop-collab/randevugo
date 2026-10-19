import test from "node:test";
import assert from "node:assert/strict";
import { bearerWidgetToken, newWidgetToken, widgetAppointments, widgetCustomerName, widgetTodaySummary, widgetTokenId } from "../lib/widget-domain.js";

test("widget token is random, url-safe and stored only as a hash", () => {
  const a = newWidgetToken(); const b = newWidgetToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(widgetTokenId(a).length, 64);
  assert.notEqual(widgetTokenId(a), a);
  assert.equal(bearerWidgetToken(`Bearer ${a}`), a);
  assert.equal(bearerWidgetToken(a), null);
  assert.equal(bearerWidgetToken("Bearer kısa"), null);
  assert.equal(bearerWidgetToken(undefined), null);
});

test("customer names are shortened for the home screen", () => {
  assert.equal(widgetCustomerName("Ayşe Kaya"), "Ayşe K.");
  assert.equal(widgetCustomerName("  Mehmet Ali   işçi "), "Mehmet İ.");
  assert.equal(widgetCustomerName("Cihat"), "Cihat");
  assert.equal(widgetCustomerName(""), "");
  assert.equal(widgetCustomerName(null), "");
});

test("appointments are sorted, canceled/no-show removed, translations kept", () => {
  const ts = (ms) => ({ toMillis: () => ms });
  const rows = [
    { id: "b", data: { status: "confirmed", startAt: ts(2000), endAt: ts(3000), customerName: "Ali Veli", serviceName: "Saç", staffName: "Can" } },
    { id: "x", data: { status: "cancelled", startAt: ts(1500), endAt: ts(1600) } },
    { id: "y", data: { status: "no_show", startAt: ts(1700), endAt: ts(1800) } },
    { id: "a", data: { status: "pending", startAt: ts(1000), customerName: "Zeynep", serviceName: "Boya · Uzun", serviceNameTranslations: { en: "Color · Long", XX: "bad" } } },
    { id: "z", data: { status: "confirmed" } },
  ];
  const items = widgetAppointments(rows);
  assert.deepEqual(items.map((item) => item.id), ["a", "b"]);
  assert.equal(items[0].end, 1000 + 30 * 60_000);
  assert.deepEqual(items[0].serviceTranslations, { en: "Color · Long" });
  assert.equal(items[1].customer, "Ali V.");
  assert.equal("serviceTranslations" in items[1], false);
});

test("today summary counts only the business day", () => {
  const items = [
    { id: "1", start: 100, end: 200, status: "completed" },
    { id: "2", start: 300, end: 400, status: "pending" },
    { id: "3", start: 500, end: 600, status: "confirmed" },
    { id: "4", start: 5000, end: 5100, status: "confirmed" },
  ];
  assert.deepEqual(widgetTodaySummary(items, 0, 1000, 350), { total: 3, pending: 1, completed: 1, remaining: 2 });
});
