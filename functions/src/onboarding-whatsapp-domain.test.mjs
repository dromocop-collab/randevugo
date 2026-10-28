import test from "node:test";
import assert from "node:assert/strict";
import {
  ONBOARDING_STEPS, ONBOARDING_TEMPLATE_DEFINITIONS, buildOnboardingMessage, decideStep, greetingName, joinTurkish,
  missingSetupItems, nextDueAt, onboardingTemplateValues, optCommand, parseOnboardingSettings, planOnboarding,
  renderOnboardingText, templateCreatePayload,
} from "../lib/onboarding-whatsapp-domain.js";

const NOW = Date.parse("2026-10-28T12:00:00+03:00");
const DAY = 86_400_000;
const base = {
  exists: true, suspended: false, isPublished: true, approvalStatus: "approved", serviceCount: 3, staffCount: 1,
  hasWorkingHours: true, hasLogo: true, appointmentCount: 0, subscriptionStatus: "trialing", isLifetime: false,
  trialEndsAtMs: NOW + 5 * DAY,
};
const params = { name: "Ayşe", businessName: "Ayşe Güzellik", slug: "ayse-guzellik", missing: "hizmetlerini eklemek", daysLeft: 5 };

test("ayarlar varsayılan kapalı, adımlar varsayılan açık", () => {
  const settings = parseOnboardingSettings(undefined);
  assert.equal(settings.enabled, false);
  assert.deepEqual(Object.values(settings.steps), [true, true, true, true]);
  assert.equal(parseOnboardingSettings({ enabled: true, steps: { setup: false } }).steps.setup, false);
});

test("plan: deneme bitişinden 5 gün önce son adım", () => {
  const plan = planOnboarding(NOW, NOW + 30 * DAY);
  assert.equal(plan.welcome, NOW + 2 * 60_000);
  assert.equal(plan.setup, NOW + DAY);
  assert.equal(plan.trial_ending, NOW + 25 * DAY);
  assert.equal(planOnboarding(NOW, null).trial_ending, NOW + 25 * DAY);
});

test("eksik kurulum maddeleri ve Türkçe birleştirme", () => {
  assert.deepEqual(missingSetupItems({ serviceCount: 0, staffCount: 0, hasWorkingHours: false, hasLogo: true }),
    ["hizmetlerini eklemek", "çalışma saatlerini girmek", "çalışan eklemek"]);
  assert.equal(joinTurkish(["a", "b", "c"]), "a, b ve c");
  assert.equal(joinTurkish(["a"]), "a");
});

test("adım kararları", () => {
  assert.deepEqual(decideStep("welcome", base, NOW, NOW), { send: true });
  assert.deepEqual(decideStep("setup", base, NOW, NOW), { send: false, reason: "setup_complete" });
  assert.deepEqual(decideStep("setup", { ...base, serviceCount: 0 }, NOW, NOW), { send: true });
  assert.deepEqual(decideStep("first_booking", { ...base, appointmentCount: 2 }, NOW, NOW), { send: false, reason: "has_appointments" });
  assert.deepEqual(decideStep("first_booking", { ...base, isPublished: false }, NOW, NOW), { send: false, reason: "not_published" });
  assert.deepEqual(decideStep("first_booking", base, NOW, NOW), { send: true });
  assert.deepEqual(decideStep("trial_ending", { ...base, subscriptionStatus: "active" }, NOW, NOW), { send: false, reason: "not_trialing" });
  assert.deepEqual(decideStep("trial_ending", base, NOW, NOW), { send: true });
  assert.deepEqual(decideStep("welcome", { ...base, suspended: true }, NOW, NOW), { send: false, reason: "suspended" });
  assert.deepEqual(decideStep("welcome", base, NOW, NOW - 3 * DAY), { send: false, reason: "expired" });
});

test("şablon değişkenleri tanımlarla aynı sayıda", () => {
  for (const definition of ONBOARDING_TEMPLATE_DEFINITIONS) {
    const count = new Set(definition.body.match(/\{\{\d+\}\}/g)).size;
    assert.equal(definition.bodyExample.length, count, definition.name);
    assert.equal(onboardingTemplateValues(definition.step, params).body.length, count, definition.name);
    const step = ONBOARDING_STEPS.find((item) => item.key === definition.step);
    assert.equal(step.template, definition.name);
    const dynamicUrl = definition.buttons.some((button) => button.type === "URL" && button.url.includes("{{1}}"));
    assert.equal(Boolean(onboardingTemplateValues(definition.step, params).urlButton), dynamicUrl, definition.name);
    // Meta: gövde değişkenle başlayamaz/bitemez.
    assert.ok(!/^\{\{/.test(definition.body) && !/\}\}$/.test(definition.body.trim()), definition.name);
  }
});

test("mesaj gövdesi ve dinamik düğme", () => {
  const message = buildOnboardingMessage("first_booking", "905321234567", params, "tr");
  assert.equal(message.template.name, "sr_ilk_randevu");
  assert.equal(message.template.components[0].parameters[2].text, "seninrandevun.com/isletme/ayse-guzellik");
  assert.deepEqual(message.template.components[1], { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "ayse-guzellik" }] });
  assert.equal(buildOnboardingMessage("welcome", "905321234567", params, "tr").template.components.length, 1);
  assert.match(renderOnboardingText("welcome", params), /^Merhaba Ayşe, Senin Randevun'a hoş geldin/);
  // Değişkende satır sonu olamaz.
  const multi = buildOnboardingMessage("welcome", "905321234567", { ...params, businessName: "A\nB" }, "tr");
  assert.equal(multi.template.components[0].parameters[1].text, "A B");
});

test("Meta şablon oluşturma gövdesi", () => {
  const payload = templateCreatePayload(ONBOARDING_TEMPLATE_DEFINITIONS[2], "tr");
  assert.equal(payload.category, "UTILITY");
  assert.deepEqual(payload.components[0].example.body_text[0].length, 3);
  assert.deepEqual(payload.components[1].buttons[0].example, ["https://seninrandevun.com/isletme/ayse-guzellik"]);
});

test("isim, DUR/BAŞLAT ve sonraki zaman", () => {
  assert.equal(greetingName("Ayşe Kaya", "Salon"), "Ayşe");
  assert.equal(greetingName("", "Salon"), "Salon");
  assert.equal(optCommand(" DUR "), "out");
  assert.equal(optCommand("Stop."), "out");
  assert.equal(optCommand("BAŞLAT"), "in");
  assert.equal(optCommand("durum nedir"), null);
  assert.equal(nextDueAt({ a: { status: "sent", dueAt: 1 }, b: { status: "pending", dueAt: 9 }, c: { status: "pending", dueAt: 5 } }), 5);
  assert.equal(nextDueAt({ a: { status: "sent", dueAt: 1 } }), null);
});

test("karşılama SMS'i: ad, işletme, panel linki ve iletişim numarası", async () => {
  const { welcomeSmsText, PLATFORM_CONTACT_PHONE } = await import("../lib/onboarding-whatsapp-domain.js");
  const text = welcomeSmsText({ name: "Ayşe", businessName: "Ayşe Güzellik" });
  assert.match(text, /^Merhaba Ayşe, Senin Randevun'a hoş geldin!/);
  assert.match(text, /Ayşe Güzellik hesabın oluşturuldu/);
  assert.ok(text.includes("seninrandevun.com/dashboard"));
  assert.ok(text.includes(PLATFORM_CONTACT_PHONE));
  assert.ok(text.length < 460, `SMS çok uzun: ${text.length}`);
});
