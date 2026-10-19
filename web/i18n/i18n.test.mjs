import test from "node:test";
import assert from "node:assert/strict";
import { compilePatterns, interpolate, isLocaleBypassPath, localizeHref, splitLocale, translate, translateWithPatterns } from "./config.ts";

test("splitLocale separates the language prefix", () => {
  assert.deepEqual(splitLocale("/en/kesfet"), { locale: "en", path: "/kesfet" });
  assert.deepEqual(splitLocale("/en"), { locale: "en", path: "/" });
  assert.deepEqual(splitLocale("/kesfet"), { locale: "tr", path: "/kesfet" });
  assert.deepEqual(splitLocale("/"), { locale: "tr", path: "/" });
  assert.deepEqual(splitLocale("/english-cafe"), { locale: "tr", path: "/english-cafe" }, "önek kelime ortasında aranmaz");
  assert.deepEqual(splitLocale("/tr/kesfet"), { locale: "tr", path: "/kesfet" });
});

test("localizeHref writes internal paths per language and leaves the rest", () => {
  assert.equal(localizeHref("/kesfet", "en"), "/en/kesfet");
  assert.equal(localizeHref("/", "en"), "/en");
  assert.equal(localizeHref("/kesfet?q=sac#liste", "en"), "/en/kesfet?q=sac#liste");
  assert.equal(localizeHref("/en/kesfet", "tr"), "/kesfet", "dil değiştirirken önek değişir");
  assert.equal(localizeHref("/en/kesfet", "en"), "/en/kesfet", "çift önek olmaz");
  assert.equal(localizeHref("/kesfet", "tr"), "/kesfet");
  assert.equal(localizeHref("https://wa.me/905", "en"), "https://wa.me/905");
  assert.equal(localizeHref("//cdn.example.com/a", "en"), "//cdn.example.com/a");
  assert.equal(localizeHref("#hizmetler", "en"), "#hizmetler");
  assert.equal(localizeHref("?tab=1", "en"), "?tab=1");
  assert.equal(localizeHref("/api/randevu/x/takvim.ics", "en"), "/api/randevu/x/takvim.ics");
  assert.equal(localizeHref("/images/logo.png", "en"), "/images/logo.png");
  assert.equal(localizeHref("/__/auth/handler", "en"), "/__/auth/handler");
});

test("bypass paths", () => {
  for (const p of ["/api/x", "/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/app-sw.js", "/pwa/icon-192.png", "/.well-known/assetlinks.json", "/_next/static/a.js"]) assert.equal(isLocaleBypassPath(p), true, p);
  for (const p of ["/", "/kesfet", "/isletme/erdem-kuafor", "/dashboard/ayarlar"]) assert.equal(isLocaleBypassPath(p), false, p);
});

test("translate: Turkish is the key, missing falls back, variables and plurals", () => {
  const messages = {
    "Randevu al": "Book now",
    "{count} randevu": { one: "{count} appointment", other: "{count} appointments" },
    "Merhaba {ad}": "Hello {ad}",
  };
  assert.equal(translate("tr", messages, "Randevu al"), "Randevu al");
  assert.equal(translate("en", messages, "Randevu al"), "Book now");
  assert.equal(translate("en", messages, "Çevrilmemiş metin"), "Çevrilmemiş metin");
  assert.equal(translate("en", messages, "Merhaba {ad}", { ad: "Ayşe" }), "Hello Ayşe");
  assert.equal(translate("tr", messages, "Merhaba {ad}", { ad: "Ayşe" }), "Merhaba Ayşe");
  assert.equal(translate("en", messages, "{count} randevu", { count: 1 }), "1 appointment");
  assert.equal(translate("en", messages, "{count} randevu", { count: 3 }), "3 appointments");
  assert.equal(translate("en", messages, "{count} randevu"), "{count} appointments", "count yoksa other");
  assert.equal(interpolate("{a} ve {b}", { a: 1 }), "1 ve {b}", "eksik değişken görünür kalır");
});

test("patterns translate server messages with variables", () => {
  const messages = { "Ad Soyad": "Full name", "Kayıt başarılı.": "Saved." };
  const patterns = compilePatterns({
    "Lütfen {n} saniye bekleyin.": { one: "Please wait {n} second.", other: "Please wait {n} seconds." },
    "{field} alanı zorunludur.": "{field} is required.",
    "Yanlış kod. {count} deneme hakkınız kaldı.": { one: "Wrong code. You have {count} attempt left.", other: "Wrong code. You have {count} attempts left." },
    "\"{label}\" {min}–{max} arasında olmalıdır.": "\"{label}\" must be between {min} and {max}.",
  });
  assert.equal(translateWithPatterns("en", messages, patterns, "Lütfen 42 saniye bekleyin."), "Please wait 42 seconds.");
  assert.equal(translateWithPatterns("en", messages, patterns, "Ad Soyad alanı zorunludur."), "Full name is required.", "yakalanan değer de çevrilir");
  assert.equal(translateWithPatterns("en", messages, patterns, "Yanlış kod. 1 deneme hakkınız kaldı."), "Wrong code. You have 1 attempt left.");
  assert.equal(translateWithPatterns("en", messages, patterns, "Yanlış kod. 3 deneme hakkınız kaldı."), "Wrong code. You have 3 attempts left.");
  assert.equal(translateWithPatterns("en", messages, patterns, '"Yaş" 1–99 arasında olmalıdır.'), '"Yaş" must be between 1 and 99.');
  assert.equal(translateWithPatterns("en", messages, patterns, "Kayıt başarılı."), "Saved.", "birebir anahtar önce");
  assert.equal(translateWithPatterns("en", messages, patterns, "Bilinmeyen mesaj."), "Bilinmeyen mesaj.");
  assert.equal(translateWithPatterns("tr", messages, patterns, "Lütfen 42 saniye bekleyin."), "Lütfen 42 saniye bekleyin.");
});

test("context disambiguates the same Turkish word", () => {
  const messages = { "İptal": "Cancel", "durum::İptal": "Canceled" };
  assert.equal(translate("en", messages, "İptal"), "Cancel");
  assert.equal(translate("en", messages, "İptal", { ctx: "durum" }), "Canceled");
  assert.equal(translate("en", messages, "İptal", { ctx: "baska" }), "Cancel", "bağlam karşılığı yoksa düz anahtar");
  assert.equal(translate("tr", messages, "İptal", { ctx: "durum" }), "İptal", "Türkçe etkilenmez");
});
