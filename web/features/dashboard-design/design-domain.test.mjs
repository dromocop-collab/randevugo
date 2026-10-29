import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_DESIGN, activeAnnouncement, applyNavDesign, disabledSectionFor, parseDashboardDesign, resolveHomeModules, resolveSkin,
  safeHref, sameVariables, textOverrideMap,
} from "./design-domain.ts";

const SKINS = ["emerald", "midnight", "pearl"];
const MODULES = ["operations", "command", "kpis"];
const parse = (raw) => parseDashboardDesign(raw, SKINS, MODULES);

test("boş/bozuk belge varsayılana düşer", () => {
  assert.deepEqual(parse(undefined).nav, EMPTY_DESIGN.nav);
  const empty = parse("bozuk");
  assert.deepEqual(empty.nav, { items: {}, custom: [], groupLabels: {} });
  assert.equal(empty.announcement.enabled, false);
  assert.equal(empty.home.modules, null);
});

test("güvenli bağlantı süzgeci", () => {
  assert.equal(safeHref("/dashboard/takvim"), "/dashboard/takvim");
  assert.equal(safeHref("https://youtube.com/watch?v=1"), "https://youtube.com/watch?v=1");
  for (const bad of ["javascript:alert(1)", "//evil.com", "/\\evil.com", "http://site.com", "data:text/html,x", "https://user:pw@site.com", "ftp://x.com", "/a b"]) {
    assert.equal(safeHref(bad), null, bad);
  }
});

test("menü öğesi ayarları: kilitli öğe gizlenemez, ad kısaltılır, geçersiz adres atılır", () => {
  const design = parse({ nav: { items: {
    "/dashboard": { hidden: true, label: "Ana" },
    "/dashboard/ayarlar": { disabled: true },
    "/dashboard/otomasyonlar": { hidden: true, disabled: true, group: "merkez", order: 5 },
    "/dashboard/hizmetler": { label: "x".repeat(90), group: "bilinmeyen" },
    "https://evil.com": { label: "kötü" },
  } } });
  assert.deepEqual(design.nav.items["/dashboard"], { label: "Ana" });
  assert.equal(design.nav.items["/dashboard/ayarlar"], undefined);
  assert.deepEqual(design.nav.items["/dashboard/otomasyonlar"], { hidden: true, disabled: true, group: "merkez", order: 5 });
  assert.equal(design.nav.items["/dashboard/hizmetler"].label.length, 40);
  assert.equal(design.nav.items["/dashboard/hizmetler"].group, undefined);
  assert.equal(design.nav.items["https://evil.com"], undefined);
});

test("özel bağlantılar: geçersiz/tekrarlı atılır, dış bağlantı yeni sekme", () => {
  const design = parse({ nav: { custom: [
    { id: "egitim", label: "Eğitim videoları", href: "https://youtube.com/@sr", icon: "video", group: "sistem" },
    { id: "egitim", label: "Tekrar", href: "/dashboard" },
    { id: "kotu", label: "Kötü", href: "javascript:alert(1)" },
    { id: "ic", label: "Kampanyalar", href: "/dashboard/analitik", icon: "yok", newTab: false },
  ] } });
  assert.deepEqual(design.nav.custom.map((link) => [link.id, link.newTab, link.icon]), [["egitim", true, "video"], ["ic", false, "link"]]);
});

test("menüye uygulama: gizleme, ad, grup, sıra ve özel bağlantı", () => {
  const items = [
    { href: "/dashboard", label: "Bugün", group: "merkez" },
    { href: "/dashboard/takvim", label: "Takvim", group: "merkez" },
    { href: "/dashboard/otomasyonlar", label: "Otomasyonlar", group: "buyume" },
    { href: "/dashboard/hizmetler", label: "Hizmetler", group: "yonetim" },
  ];
  const design = parse({ nav: {
    items: { "/dashboard/otomasyonlar": { hidden: true }, "/dashboard/hizmetler": { label: "Menü", group: "merkez", order: 1 } },
    custom: [{ id: "kampanya", label: "Kampanya", href: "/dashboard/analitik", group: "merkez", order: 15 }],
  } });
  const result = applyNavDesign(items, design, (link) => ({ href: link.href, label: link.label, group: link.group }));
  assert.deepEqual(result.map((item) => [item.href, item.customLabel ?? item.label, item.group]), [
    ["/dashboard", "Bugün", "merkez"], ["/dashboard/hizmetler", "Menü", "merkez"], ["/dashboard/takvim", "Takvim", "merkez"], ["/dashboard/analitik", "Kampanya", "merkez"],
  ]);
});

test("kapatılan bölüm alt sayfaları da kapsar", () => {
  const design = parse({ nav: { items: { "/dashboard/otomasyonlar": { disabled: true }, "/dashboard/analitik": { hidden: true } } } });
  assert.equal(disabledSectionFor("/dashboard/otomasyonlar/yeni", design), "/dashboard/otomasyonlar");
  assert.equal(disabledSectionFor("/dashboard/otomasyonlarx", design), null);
  assert.equal(disabledSectionFor("/dashboard/analitik", design), null, "yalnız gizlenen sayfa açık kalır");
});

test("duyuru: tarih aralığı ve hedef kitle", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const base = { enabled: true, title: "Bakım", message: "Gece 02:00", startsAt: now - 1000, endsAt: now + 1000 };
  assert.ok(activeAnnouncement(parse({ announcement: base }), { now, subscriptionStatus: "active" }));
  assert.equal(activeAnnouncement(parse({ announcement: { ...base, startsAt: now + 10 } }), { now, subscriptionStatus: null }), null);
  assert.equal(activeAnnouncement(parse({ announcement: { ...base, endsAt: now } }), { now, subscriptionStatus: null }), null);
  assert.equal(activeAnnouncement(parse({ announcement: { ...base, audience: "trialing" } }), { now, subscriptionStatus: "active" }), null);
  assert.ok(activeAnnouncement(parse({ announcement: { ...base, audience: "expired" } }), { now, subscriptionStatus: "past_due" }));
  assert.equal(parse({ announcement: { enabled: true } }).announcement.enabled, false, "boş duyuru açılmaz");
  assert.equal(parse({ announcement: { ...base, linkHref: "javascript:x", linkLabel: "Tıkla" } }).announcement.linkLabel, "");
  const a = parse({ announcement: base }).announcement.id, b = parse({ announcement: { ...base, message: "Değişti" } }).announcement.id;
  assert.notEqual(a, b, "metin değişince kimlik değişir (kapatma sıfırlanır)");
});

test("metin değişiklikleri: değişken korunur, tekrar ve boş atılır", () => {
  assert.equal(sameVariables("{count} randevu", "{count} kayıt"), true);
  assert.equal(sameVariables("{count} randevu", "randevular"), false);
  const design = parse({ texts: [
    { from: "Bugün", to: "Ana sayfa", toEn: "Home" },
    { from: "Bugün", to: "Tekrar" },
    { from: "{count} randevu", to: "randevular" },
    { from: "{count} randevu", to: "{count} kayıt" },
    { from: "Takvim", to: "" },
  ] });
  assert.deepEqual(design.texts.map((row) => row.from), ["Bugün", "{count} randevu"]);
  assert.equal(textOverrideMap(design, "tr").get("Bugün"), "Ana sayfa");
  assert.equal(textOverrideMap(design, "en").get("Bugün"), "Home");
  assert.equal(textOverrideMap(design, "en").has("{count} randevu"), false);
});

test("ana panel kartları ve tema kararları", () => {
  const normalize = (value) => Array.isArray(value) ? value : [{ id: "operations", enabled: true }];
  const mine = [{ id: "kpis", enabled: true }];
  const designed = parse({ home: { modules: [{ id: "command", enabled: true }, { id: "bilinmeyen" }], locked: false } });
  assert.deepEqual(designed.home.modules, [{ id: "command", enabled: true }]);
  assert.deepEqual(resolveHomeModules(mine, designed, normalize), mine, "kilit yoksa kullanıcının tercihi");
  assert.deepEqual(resolveHomeModules(null, designed, normalize), [{ id: "command", enabled: true }], "tercih yoksa tasarım");
  const locked = parse({ home: { modules: [{ id: "command" }], locked: true } });
  assert.deepEqual(resolveHomeModules(mine, locked, normalize), [{ id: "command", enabled: true }]);
  const forced = parse({ appearance: { defaultSkin: "pearl", forceSkin: true } });
  assert.equal(resolveSkin("midnight", forced, "emerald"), "pearl");
  const allowed = parse({ appearance: { defaultSkin: "pearl", allowedSkins: ["midnight", "yok"] } });
  assert.deepEqual(allowed.appearance.allowedSkins, ["pearl", "midnight"]);
  assert.equal(resolveSkin("emerald", allowed, "emerald"), "pearl");
  assert.equal(resolveSkin("midnight", allowed, "emerald"), "midnight");
  assert.equal(resolveSkin(null, parse({}), "emerald"), "emerald");
  assert.equal(parse({ appearance: { forceSkin: true } }).appearance.forceSkin, false, "tema seçilmeden zorunlu olmaz");
});
