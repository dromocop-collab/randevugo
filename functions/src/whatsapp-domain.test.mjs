import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { buildTemplateMessage, extractStatuses, parseWhatsAppConfig, toWhatsAppPhone, verifyWebhookSignature } from "../lib/whatsapp-domain.js";

const base = { enabled: true, phoneNumberId: "123456789012345", accessToken: "EAAG" + "x".repeat(40), appSecret: "secret", verifyToken: "verify" };

test("config needs enabled flag and credentials; template names validated", () => {
  assert.equal(parseWhatsAppConfig(null), null);
  assert.equal(parseWhatsAppConfig({ ...base, enabled: false }), null);
  assert.equal(parseWhatsAppConfig({ ...base, phoneNumberId: "abc" }), null);
  assert.equal(parseWhatsAppConfig({ ...base, accessToken: "short" }), null);
  const config = parseWhatsAppConfig({ ...base, templates: { reminder: "sr_hatirlatma", confirmation: "Bad Name!" } });
  assert.equal(config.templates.reminder, "sr_hatirlatma");
  assert.equal(config.templates.confirmation, "randevu_onay");
  assert.equal(config.language, "tr");
  assert.equal(config.apiVersion, "v21.0");
});

test("Turkish mobile numbers normalise to E.164 digits", () => {
  assert.equal(toWhatsAppPhone("+90 555 111 22 33"), "905551112233");
  assert.equal(toWhatsAppPhone("0555 111 22 33"), "905551112233");
  assert.equal(toWhatsAppPhone("5551112233"), "905551112233");
  assert.equal(toWhatsAppPhone("0090 555 111 2233"), "905551112233");
  assert.equal(toWhatsAppPhone("0212 111 22 33"), null);
  assert.equal(toWhatsAppPhone(""), null);
});

test("template payload: 4 params, cancellation without link, no newlines", () => {
  const config = parseWhatsAppConfig(base);
  const params = { businessName: "Erdem\nKuaför", serviceName: "Saç kesimi", dateText: "14 Eki 15:00", detailsUrl: "https://seninrandevun.com/randevu/abc" };
  const reminder = buildTemplateMessage("reminder", "905551112233", params, config);
  assert.equal(reminder.template.name, "randevu_hatirlatma");
  assert.equal(reminder.template.language.code, "tr");
  assert.deepEqual(reminder.template.components[0].parameters.map((p) => p.text), ["Erdem Kuaför", "Saç kesimi", "14 Eki 15:00", "https://seninrandevun.com/randevu/abc"]);
  const cancel = buildTemplateMessage("cancellation", "905551112233", { ...params, serviceName: "" }, config);
  assert.equal(cancel.template.components[0].parameters.length, 3);
  assert.equal(cancel.template.components[0].parameters[1].text, "Randevu");
});

test("webhook signature", () => {
  const raw = Buffer.from('{"entry":[]}');
  const header = "sha256=" + createHmac("sha256", "secret").update(raw).digest("hex");
  assert.equal(verifyWebhookSignature(raw, header, "secret"), true);
  assert.equal(verifyWebhookSignature(raw, header, "other"), false);
  assert.equal(verifyWebhookSignature(raw, "sha256=00", "secret"), false);
  assert.equal(verifyWebhookSignature(raw, undefined, "secret"), false);
});

test("statuses are extracted from webhook body", () => {
  const body = { entry: [{ changes: [{ value: { statuses: [
    { id: "wamid.A", status: "delivered" },
    { id: "wamid.B", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] },
    { status: "sent" },
  ] } }] }] };
  assert.deepEqual(extractStatuses(body), [
    { messageId: "wamid.A", status: "delivered", errorCode: null, errorTitle: null },
    { messageId: "wamid.B", status: "failed", errorCode: 131026, errorTitle: "Message undeliverable" },
  ]);
  assert.deepEqual(extractStatuses({}), []);
});
