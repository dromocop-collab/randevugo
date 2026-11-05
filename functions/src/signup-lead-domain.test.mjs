import test from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_REMINDER_DELAY_MS, LEAD_REMINDER_MAX_AGE_MS, LEAD_TEMPLATE_DEFINITION, decideLeadReminder, leadPhone, leadReminderMessage, parseLeadInput,
  parseLeadSettings, renderLeadReminderText,
} from "../lib/signup-lead-domain.js";
import { isSignupIntent } from "../lib/whatsapp-signup-domain.js";

test("lead phone accepts Turkish mobile formats only", () => {
  for (const raw of ["5551234567", "05551234567", "+90 555 123 45 67", "905551234567", "0 (555) 123 45 67"]) assert.equal(leadPhone(raw), "905551234567", raw);
  for (const raw of ["2121234567", "555123456", "15551234567", "", null]) assert.equal(leadPhone(raw), null, String(raw));
});

test("lead input requires a name and a valid mobile, cleans the rest", () => {
  assert.equal(parseLeadInput({ name: "A", phone: "5551234567" }), null);
  assert.equal(parseLeadInput({ name: "Elif Kuaför", phone: "212" }), null);
  const lead = parseLeadInput({
    name: "  Elif\nKuaför  ", phone: "0555 123 45 67", category: "kuafor", city: "Muğla", district: "Fethiye",
    source: "Meta", campaign: "reels_lead", extra: "x",
  });
  assert.deepEqual(lead, { phone: "905551234567", name: "Elif Kuaför", category: "kuafor", city: "Muğla", district: "Fethiye", source: "meta", campaign: "reels_lead" });
  assert.equal(parseLeadInput({ name: "Elif", phone: "5551234567", category: "../x", source: "<script>" }).category, "");
  assert.equal(parseLeadInput({ name: "Elif", phone: "5551234567", source: "<script>" }).source, null);
});

test("reminder goes once, 30 min after the lead, within 20 hours, never to converted/closed/opted-out", () => {
  const created = 1_800_000_000_000;
  const base = { status: "open", createdAtMs: created, reminderSentAtMs: null, optedOut: false };
  assert.deepEqual(decideLeadReminder(base, created + LEAD_REMINDER_DELAY_MS - 1), { send: false, reason: "too_early" });
  assert.deepEqual(decideLeadReminder(base, created + LEAD_REMINDER_DELAY_MS), { send: true });
  assert.deepEqual(decideLeadReminder(base, created + LEAD_REMINDER_MAX_AGE_MS + 1), { send: false, reason: "too_old" });
  assert.deepEqual(decideLeadReminder({ ...base, status: "converted" }, created + LEAD_REMINDER_DELAY_MS), { send: false, reason: "converted" });
  assert.deepEqual(decideLeadReminder({ ...base, status: "closed" }, created + LEAD_REMINDER_DELAY_MS), { send: false, reason: "closed" });
  assert.deepEqual(decideLeadReminder({ ...base, reminderSentAtMs: created }, created + LEAD_REMINDER_DELAY_MS), { send: false, reason: "already_sent" });
  assert.deepEqual(decideLeadReminder({ ...base, optedOut: true }, created + LEAD_REMINDER_DELAY_MS), { send: false, reason: "opted_out" });
});

test("settings default off", () => {
  assert.deepEqual(parseLeadSettings(undefined), { reminderEnabled: false });
  assert.deepEqual(parseLeadSettings({ reminderEnabled: true }), { reminderEnabled: true });
});

test("template payload and quick reply start the WhatsApp signup bot", () => {
  const payload = leadReminderMessage("905551234567", "Elif\nKuaför", "tr");
  assert.equal(payload.template.name, "sr_kayit_yarim");
  assert.deepEqual(payload.template.components[0].parameters, [{ type: "text", text: "Elif Kuaför" }]);
  assert.match(renderLeadReminderText("Elif Kuaför"), /\*Elif Kuaför\* için Senin Randevun kaydına/);
  const quick = LEAD_TEMPLATE_DEFINITION.buttons.find((button) => button.type === "QUICK_REPLY");
  assert.equal(isSignupIntent(quick.text, false), true);
});
