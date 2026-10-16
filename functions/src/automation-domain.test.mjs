import test from "node:test";
import assert from "node:assert/strict";
import { appointmentTransitionTriggers, automationRuleMatches, automationVariables, parseAutomationRule, renderAutomationText } from "../lib/automation-domain.js";

test("parse: legacy rule keeps working, unknown trigger rejected, ids sanitised", () => {
  assert.equal(parseAutomationRule({ trigger: "bogus" }), null);
  const legacy = parseAutomationRule({ trigger: "appointment_created", title: "T", message: "M" });
  assert.deepEqual(legacy.channels, { panel: true, teamPush: false, customerPush: false });
  assert.deepEqual(legacy.serviceIds, []);
  assert.equal(legacy.cancelledBy, "any");
  const rule = parseAutomationRule({ trigger: "waitlist_created", channels: { teamPush: true, customerPush: true }, conditions: { serviceIds: ["s1", "s1", "bad id!", 3], cancelledBy: "x" } });
  assert.deepEqual(rule.serviceIds, ["s1"]);
  assert.equal(rule.channels.customerPush, false, "bekleme talebinde müşteri bildirimi yok");
  assert.equal(rule.channels.teamPush, true);
});

test("transition triggers", () => {
  assert.deepEqual(appointmentTransitionTriggers({ status: "pending", startMs: 1 }, { status: "confirmed", startMs: 1 }), ["appointment_confirmed"]);
  assert.deepEqual(appointmentTransitionTriggers({ status: "confirmed", startMs: 1 }, { status: "no_show", startMs: 1 }), ["appointment_no_show"]);
  assert.deepEqual(appointmentTransitionTriggers({ status: "confirmed", startMs: 1 }, { status: "cancelled", startMs: 1 }), ["appointment_cancelled"]);
  assert.deepEqual(appointmentTransitionTriggers({ status: "confirmed", startMs: 1 }, { status: "confirmed", startMs: 2 }), ["appointment_rescheduled"]);
  assert.deepEqual(appointmentTransitionTriggers({ status: "confirmed", startMs: 1 }, { status: "cancelled", startMs: 2 }), ["appointment_cancelled"]);
  assert.deepEqual(appointmentTransitionTriggers({ status: "confirmed", startMs: 1 }, { status: "confirmed", startMs: 1 }), []);
});

test("conditions: services, staff, who cancelled", () => {
  const rule = parseAutomationRule({ trigger: "appointment_cancelled", conditions: { serviceIds: ["s1"], staffIds: ["p1"], cancelledBy: "customer" } });
  const payload = { serviceId: "s1", staffId: "p1", cancelledBy: "customer" };
  assert.equal(automationRuleMatches(rule, "appointment_cancelled", payload), true);
  assert.equal(automationRuleMatches(rule, "appointment_created", payload), false);
  assert.equal(automationRuleMatches(rule, "appointment_cancelled", { ...payload, serviceId: "s2" }), false);
  assert.equal(automationRuleMatches(rule, "appointment_cancelled", { ...payload, serviceId: "s2", serviceIds: ["s1"] }), true);
  assert.equal(automationRuleMatches(rule, "appointment_cancelled", { ...payload, staffId: "p2" }), false);
  assert.equal(automationRuleMatches(rule, "appointment_cancelled", { ...payload, cancelledBy: "business" }), false);
  const any = parseAutomationRule({ trigger: "appointment_cancelled" });
  assert.equal(automationRuleMatches(any, "appointment_cancelled", {}), true);
});

test("variables and rendering", () => {
  const vars = automationVariables({ customerName: " Ayşe ", serviceName: "Saç kesimi", servicePrice: 450, startMs: Date.UTC(2026, 9, 14, 12, 30), preferredDate: "2026-10-20", timeZone: "Europe/Istanbul" });
  assert.equal(vars.customerName, "Ayşe");
  assert.equal(vars.time, "15:30");
  assert.match(vars.date, /14 Ekim/);
  assert.equal(vars.price, "450 ₺");
  assert.match(vars.preferredDate, /20 Ekim/);
  assert.equal(vars.businessName, "İşletme");
  assert.equal(renderAutomationText("Merhaba {{ customerName }}, {{time}} {{staffName}} {{yok}}", vars), "Merhaba Ayşe, 15:30 — —");
  assert.equal(renderAutomationText("x".repeat(600), vars).length, 500);
});
