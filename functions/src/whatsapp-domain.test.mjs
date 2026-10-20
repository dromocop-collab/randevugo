import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { buildTemplateMessage, extractStatuses, parseWhatsAppConfig, parseWhatsAppWebhookSecrets, summarizeWhatsAppMessages, whatsappReadiness, toWhatsAppPhone, verifyWebhookSignature } from "../lib/whatsapp-domain.js";

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
  assert.equal(reminder.template.name, "randevu_hatirlatma_v2");
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

test("webhook secrets work while the channel is disabled", () => {
  assert.deepEqual(parseWhatsAppWebhookSecrets({ enabled: false, verifyToken: " v ", appSecret: "s" }), { verifyToken: "v", appSecret: "s" });
  assert.deepEqual(parseWhatsAppWebhookSecrets(undefined), { verifyToken: "", appSecret: "" });
});

test("readiness: blocking checks gate the channel, display name does not", () => {
  const settings = { phoneNumberId: "1358994567304129", accessToken: "EAA" + "x".repeat(50), appSecret: "a".repeat(32), verifyToken: "v".repeat(48) };
  const required = ["randevu_onay", "randevu_iptal"];
  const templates = [{ name: "randevu_onay", status: "APPROVED", language: "tr" }, { name: "randevu_iptal", status: "PENDING", language: "tr" }];
  let r = whatsappReadiness({ settings, phone: { status: "CONNECTED", name_status: "PENDING_REVIEW" }, templates, requiredTemplates: required, language: "tr" });
  assert.equal(r.ready, false);
  assert.match(r.checks.find((c) => c.key === "templates").detail, /randevu_iptal/);
  templates[1].status = "APPROVED";
  r = whatsappReadiness({ settings, phone: { status: "CONNECTED", name_status: "PENDING_REVIEW" }, templates, requiredTemplates: required, language: "tr" });
  assert.equal(r.ready, true, "görünen ad bekliyor olsa da hazır");
  assert.equal(r.checks.find((c) => c.key === "displayName").ok, false);
  r = whatsappReadiness({ settings: { ...settings, appSecret: "123456" }, phone: { status: "CONNECTED" }, templates, requiredTemplates: required, language: "tr" });
  assert.equal(r.ready, false);
  r = whatsappReadiness({ settings, phone: null, templates, requiredTemplates: required, language: "tr" });
  assert.equal(r.ready, false);
  // Yalnız onay şablonu şartsa: diğerleri onay bekliyorken kanal açılır, uyarı engellemez.
  templates[1].status = "PENDING";
  r = whatsappReadiness({ settings, phone: { status: "CONNECTED" }, templates, requiredTemplates: required, essentialTemplates: ["randevu_onay"], language: "tr" });
  assert.equal(r.ready, true);
  assert.match(r.checks.find((c) => c.key === "templatesOptional").detail, /randevu_iptal.*SMS/);
  r = whatsappReadiness({ settings, phone: { status: "CONNECTED" }, templates: templates.map((t) => ({ ...t, status: "PENDING" })), requiredTemplates: required, essentialTemplates: ["randevu_onay"], language: "tr" });
  assert.equal(r.ready, false, "onay şablonu onaysızsa kanal açılmaz");
  templates[1].status = "APPROVED";
  // Başka dilde onaylı şablon sayılmaz.
  r = whatsappReadiness({ settings, phone: { status: "CONNECTED" }, templates: templates.map((t) => ({ ...t, language: "en" })), requiredTemplates: required, language: "tr" });
  assert.equal(r.ready, false);
});

test("message summary", () => {
  const sum = summarizeWhatsAppMessages([
    { status: "read", type: "reminder" }, { status: "delivered", type: "confirmation" }, { status: "failed", type: "reminder", errorCode: 131026 },
    { status: "accepted", type: "confirmation" },
  ]);
  assert.equal(sum.total, 4);
  assert.equal(sum.byStatus.failed, 1);
  assert.equal(sum.deliveryRate, 66.7);
  assert.equal(sum.readRate, 50);
  assert.deepEqual(sum.errors, { 131026: 1 });
  assert.equal(summarizeWhatsAppMessages([]).deliveryRate, null);
});

test("button templates: date/time split body, url buttons carry the token (cancel: business slug)", async () => {
  const { buildTemplateMessage, buttonTemplateReady, BUTTON_TEMPLATES } = await import("../lib/whatsapp-domain.js");
  const config = { templates: BUTTON_TEMPLATES, language: "tr" };
  const params = { businessName: "Erdem Kuaför", serviceName: "Saç Kesimi", dateText: "22.10.2026 13:00", detailsUrl: "x", dayText: "22.10.2026", timeText: "13:00", publicToken: "tok123", businessSlug: "erdem-kuafor" };
  const confirm = buildTemplateMessage("confirmation", "905301234567", params, config);
  assert.equal(confirm.template.name, "sr_randevu_onay");
  assert.deepEqual(confirm.template.components[0].parameters.map((p) => p.text), ["Erdem Kuaför", "Saç Kesimi", "22.10.2026", "13:00"]);
  assert.deepEqual(confirm.template.components.slice(1).map((c) => [c.sub_type, c.index, c.parameters[0].text]), [["url", "0", "tok123"], ["url", "1", "tok123"]]);
  const cancel = buildTemplateMessage("cancellation", "905301234567", params, config);
  assert.deepEqual(cancel.template.components.slice(1).map((c) => c.parameters[0].text), ["erdem-kuafor"]);
  assert.equal(buttonTemplateReady("reminder", { ...params, publicToken: "" }), false);
  assert.equal(buttonTemplateReady("cancellation", { ...params, publicToken: "" }), true);
  // Klasik şablonlar değişmedi.
  const classic = buildTemplateMessage("reminder", "905301234567", params, { templates: { ...BUTTON_TEMPLATES, reminder: "randevu_hatirlatma_v2" }, language: "tr" });
  assert.equal(classic.template.components.length, 1);
  assert.equal(classic.template.components[0].parameters.length, 4);
});
