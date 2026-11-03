import test from "node:test";
import assert from "node:assert/strict";
import {
  SIGNUP_CATEGORIES, advanceSignup, buildInteractivePayload, isSignupIntent, parseLocation, slugFromName, startSignup, titleCaseTr,
} from "../lib/whatsapp-signup-domain.js";

const context = { profileName: "Ayşe Kaya", nameAllowed: (name) => !/siktir/i.test(name) };
const say = (state, text, replyId = null) => advanceSignup(state, { text, replyId }, context);

test("kayıt niyeti: hazır mesaj, anahtar kelime ve reklam", () => {
  assert.equal(isSignupIntent("Merhaba, işletmemi Senin Randevun'a kaydetmek istiyorum", false), true);
  assert.equal(isSignupIntent("KAYDOL", false), true);
  assert.equal(isSignupIntent("ücretsiz başla", false), true);
  assert.equal(isSignupIntent("Merhaba", true), true, "tıkla-WhatsApp reklamı");
  for (const text of ["Merhaba", "Randevumu iptal etmek istiyorum", "Saat kaçta açıksınız?", "DUR", null]) assert.equal(isSignupIntent(text, false), false, String(text));
});

test("il/ilçe ayrıştırma", () => {
  assert.deepEqual(parseLocation("Muğla Fethiye"), { city: "Muğla", district: "Fethiye" });
  assert.deepEqual(parseLocation("fethiye/mugla"), { city: "Muğla", district: "Fethiye" });
  assert.deepEqual(parseLocation("Fethiye, Muğla"), { city: "Muğla", district: "Fethiye" });
  assert.deepEqual(parseLocation("İSTANBUL kadıköy"), { city: "İstanbul", district: "Kadıköy" });
  assert.deepEqual(parseLocation("Ankara"), { city: "Ankara", district: null });
  assert.deepEqual(parseLocation("Urfa Siverek"), { city: "Şanlıurfa", district: "Siverek" });
  assert.deepEqual(parseLocation("Muğla'da Ortaca"), { city: "Muğla", district: "Ortaca" });
  assert.deepEqual(parseLocation("Fethiye ilçesi Muğla ili"), { city: "Muğla", district: "Fethiye" });
  assert.equal(parseLocation("Bilmiyorum"), null);
  assert.equal(titleCaseTr("SEYDİKEMER çarşı"), "Seydikemer Çarşı");
});

test("uçtan uca sohbet: ad → kategori → konum → adres → ad → e-posta → onay", () => {
  let step = startSignup();
  assert.equal(step.state.step, "name");
  assert.equal(step.messages.length, 2);
  step = say(step.state, "a");
  assert.equal(step.state.step, "name", "kısa ad reddedilir");
  step = say(step.state, "S1kt1r Kuaför".replace("1", "i").replace("1", "i"));
  assert.equal(step.state.step, "name", "uygunsuz ad reddedilir");
  step = say(step.state, "  Elif   Güzellik  ");
  assert.equal(step.state.data.name, "Elif Güzellik");
  assert.equal(step.messages[0].kind, "list");
  step = say(step.state, "uydurma");
  assert.equal(step.state.step, "category");
  step = say(step.state, "💅 Güzellik Merkezi", "cat_guzellik");
  assert.equal(step.state.data.category, "guzellik");
  step = say(step.state, "Muğla");
  assert.equal(step.state.step, "district");
  step = say(step.state, "fethiye");
  assert.equal(step.state.data.district, "Fethiye");
  assert.equal(step.state.step, "address");
  step = say(step.state, "Sonra eklerim", "address_skip");
  assert.equal(step.state.data.addressSkipped, true);
  assert.equal(step.messages[0].kind, "buttons", "profil adı düğmesi");
  step = say(step.state, "Ayşe Kaya", "owner_profile");
  assert.equal(step.state.data.ownerName, "Ayşe Kaya");
  step = say(step.state, "yanlış");
  assert.equal(step.state.step, "email");
  step = say(step.state, " Ayse@Gmail.com ");
  assert.equal(step.action, "check_email");
  assert.equal(step.state.step, "confirm");
  assert.equal(step.state.data.email, "ayse@gmail.com");
  assert.match(step.messages[0].text, /Elif Güzellik[\s\S]*Fethiye, Muğla[\s\S]*Adres sonra eklenecek/);
  const done = say(step.state, "✅ Mağazamı aç", "confirm_yes");
  assert.equal(done.action, "create");
});

test("geri, iptal ve baştan yaz", () => {
  let step = say({ step: "email", data: { name: "X Salon", city: "Muğla", district: "Fethiye" } }, "geri");
  assert.equal(step.state.step, "owner");
  step = say(step.state, "İptal");
  assert.equal(step.action, "cancel");
  assert.equal(step.state, null);
  const restart = say({ step: "confirm", data: { name: "X" } }, "Baştan yaz", "confirm_restart");
  assert.equal(restart.state.step, "name");
  assert.deepEqual(restart.state.data, {});
});

test("kategori metinle de seçilebilir; mağaza adresi; Meta gövdeleri", () => {
  assert.equal(say({ step: "category", data: {} }, "berber").state.data.category, "berber");
  assert.equal(say({ step: "category", data: {} }, "tırnak salonu").state.data.category, "nail");
  assert.equal(slugFromName("Şık Saç & Güzellik Ö"), "sik-sac-guzellik-o");
  assert.equal(slugFromName("A"), "isletme-a");
  assert.equal(SIGNUP_CATEGORIES.length, 10, "liste mesajı en fazla 10 satır");
  const list = buildInteractivePayload("905551112233", { kind: "list", text: "Seç", button: "Kategori seç", rows: SIGNUP_CATEGORIES.map((c) => ({ id: `cat_${c.slug}`, title: `${c.emoji} ${c.label}`, description: c.description })) });
  assert.equal(list.interactive.action.sections[0].rows.length, 10);
  assert.ok(list.interactive.action.sections[0].rows.every((row) => row.title.length <= 24 && row.description.length <= 72));
  const buttons = buildInteractivePayload("905551112233", { kind: "buttons", text: "x", buttons: [{ id: "a", title: "Çok uzun bir düğme başlığı burada" }] });
  assert.ok(buttons.interactive.action.buttons[0].reply.title.length <= 20);
});
