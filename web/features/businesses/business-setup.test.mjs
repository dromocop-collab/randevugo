import test from "node:test";
import assert from "node:assert/strict";
import {
  slugifyBusinessName, finalizeSlug, isValidSlug, suggestSlugAlternatives, normalizeTemplateKey,
  storeUrl, storeDisplayUrl, whatsappShareUrl, formatTry, formatDuration, localPhoneDigits, isValidMobilePhone,
  formatPhoneInput, remainingTimeLabel, createDefaultWorkingHours, validateWorkingHours, summarizeWorkingHours,
  canonicalCity, TR_CITIES,
} from "./setup-helpers.ts";
import {
  STARTER_SERVICE_TEMPLATES, getStarterTemplates, starterCategoryKey, suggestedPrice, defaultStarterSelections,
  buildStarterServicePlan, missingPlanItems, previewServices, serviceTemplateKey,
} from "./service-templates.ts";
import { encodeQr, qrSvgPath } from "./qr-code.ts";

test("slug: Türkçe karakterler ve boşluklar güvenli bağlantıya çevrilir", () => {
  assert.equal(slugifyBusinessName("Şık Saçlar Kuaför"), "sik-saclar-kuafor");
  assert.equal(slugifyBusinessName("  İĞNE & İPLİK Atölyesi "), "igne-iplik-atolyesi");
  assert.equal(slugifyBusinessName("abc-"), "abc-");
  assert.equal(finalizeSlug("abc---"), "abc");
  assert.equal(finalizeSlug("--çağ  "), "cag");
  assert.ok(slugifyBusinessName("a".repeat(80)).length <= 60);
});

test("slug doğrulama sunucu kuralıyla aynı", () => {
  assert.equal(isValidSlug("sik-saclar"), true);
  assert.equal(isValidSlug("ab"), false);
  assert.equal(isValidSlug("sik--saclar"), false);
  assert.equal(isValidSlug("-sik"), false);
  assert.equal(isValidSlug("Sik"), false);
});

test("alınmış adres için ilçe/şehir önerileri", () => {
  const options = suggestSlugAlternatives("sik-saclar", "Kadıköy", "İstanbul");
  assert.deepEqual(options, ["sik-saclar-kadikoy", "sik-saclar-istanbul", "sik-saclar-randevu"]);
  assert.ok(options.every(isValidSlug));
  assert.deepEqual(suggestSlugAlternatives(""), []);
});

test("mağaza linkleri ve paylaşım", () => {
  assert.equal(storeUrl("abc"), "https://seninrandevun.com/isletme/abc");
  assert.equal(storeDisplayUrl(""), "seninrandevun.com/isletme/isletmen");
  const wa = whatsappShareUrl("Şık Saçlar", storeUrl("abc"));
  assert.ok(wa.startsWith("https://wa.me/?text="));
  assert.ok(decodeURIComponent(wa.split("text=")[1]).includes("https://seninrandevun.com/isletme/abc"));
});

test("biçimlendirme yardımcıları", () => {
  assert.equal(formatTry(1250), "₺1.250");
  assert.equal(formatTry(0), "Fiyat sorunuz");
  assert.equal(formatDuration(45), "45 dk");
  assert.equal(formatDuration(90), "1 sa 30 dk");
  assert.equal(formatDuration(120), "2 sa");
});

test("telefon: yerel 10 hane ve biçim", () => {
  assert.equal(localPhoneDigits("+90 532 123 45 67"), "5321234567");
  assert.equal(localPhoneDigits("0532 123 45 67"), "5321234567");
  assert.equal(isValidMobilePhone("0532 123 45 67"), true);
  assert.equal(isValidMobilePhone("0212 123 45 67"), false);
  assert.equal(formatPhoneInput("05321234567"), "532 123 45 67");
  assert.equal(formatPhoneInput("532"), "532");
});

test("kalan süre etiketi", () => {
  const seconds = [15, 35, 10, 45];
  assert.equal(remainingTimeLabel(seconds, 0), "~2 dk kaldı");
  assert.equal(remainingTimeLabel(seconds, 2), "~1 dk kaldı");
  assert.equal(remainingTimeLabel(seconds, 3), "Son adım");
});

test("şehir eşleme", () => {
  assert.equal(TR_CITIES.length, 81);
  assert.equal(canonicalCity("istanbul"), "İstanbul");
  assert.equal(canonicalCity("IZMIR"), "İzmir");
  assert.equal(canonicalCity("Atlantis"), "Atlantis");
});

test("varsayılan çalışma saatleri: Pzt–Cmt 09–19, Pazar kapalı", () => {
  const hours = createDefaultWorkingHours();
  assert.equal(hours.length, 7);
  assert.equal(hours.find((day) => day.day === 0).isOpen, false);
  assert.ok(hours.filter((day) => day.day !== 0).every((day) => day.isOpen && day.start === "09:00" && day.end === "19:00"));
  assert.equal(validateWorkingHours(hours), null);
  assert.equal(summarizeWorkingHours(hours), "Pzt–Cmt 09:00–19:00 · Paz kapalı");
  assert.equal(createDefaultWorkingHours("weekdays").filter((day) => day.isOpen).length, 5);
  assert.equal(createDefaultWorkingHours("everyday").filter((day) => day.isOpen).length, 7);
});

test("çalışma saati doğrulaması", () => {
  const hours = createDefaultWorkingHours();
  assert.match(validateWorkingHours(hours.map((day) => ({ ...day, isOpen: false }))), /En az bir gün/);
  assert.match(validateWorkingHours(hours.map((day) => ({ ...day, start: "20:00" }))), /kapanış/);
  assert.match(validateWorkingHours(hours.map((day) => ({ ...day, breakStart: "13:00" }))), /mola/);
  assert.equal(validateWorkingHours(hours.map((day) => ({ ...day, breakStart: "13:00", breakEnd: "14:00" }))), null);
  assert.match(validateWorkingHours(hours.map((day) => ({ ...day, breakStart: "08:00", breakEnd: "09:30" }))), /içinde/);
});

test("her kategori için gerçekçi başlangıç hizmetleri var", () => {
  for (const key of ["kuafor", "berber", "guzellik", "nail", "spa", "spor", "saglik", "danismanlik", "veteriner", "yazilim", "egitim", "servis", "diger"]) {
    const templates = STARTER_SERVICE_TEMPLATES[key];
    assert.ok(templates && templates.length >= 3, `${key} en az 3 hizmet`);
    assert.ok(templates.some((item) => item.recommended), `${key} önerilen hizmet`);
    const ids = new Set(templates.map((item) => item.id));
    assert.equal(ids.size, templates.length, `${key} kimlikleri benzersiz`);
    for (const item of templates) {
      assert.ok(item.durationMinutes >= 5 && item.durationMinutes <= 600);
      assert.ok(item.priceMin > 0 && item.priceMax >= item.priceMin, `${key}/${item.name} fiyat aralığı`);
      const price = suggestedPrice(item);
      assert.ok(price >= item.priceMin - 50 && price <= item.priceMax, `${key}/${item.name} önerilen fiyat aralıkta`);
      assert.match(item.id, /^[a-z0-9-]+$/);
    }
  }
});

test("kategori takma adları ve bilinmeyen kategori", () => {
  assert.equal(starterCategoryKey("erkek-kuaforu"), "berber");
  assert.equal(starterCategoryKey("pilates"), "spor");
  assert.equal(starterCategoryKey("dovme-studyosu"), "diger");
  assert.equal(getStarterTemplates("").length, STARTER_SERVICE_TEMPLATES.diger.length);
});

test("templateKey panel kütüphanesiyle aynı biçimde", () => {
  assert.equal(normalizeTemplateKey("Saç Hizmetleri"), "saç hizmetleri".normalize("NFD").replace(/[̀-ͯ]/g, ""));
  assert.equal(serviceTemplateKey("Saç Hizmetleri", "Saç Kesimi"), "sac hizmetleri:sac kesimi");
});

test("seçimlerden hizmet planı: yalnız işaretliler, fiyat/süre sınırları", () => {
  const selections = defaultStarterSelections("berber");
  const recommended = getStarterTemplates("berber").filter((item) => item.recommended).length;
  let plan = buildStarterServicePlan("berber", selections);
  assert.equal(plan.length, recommended);
  assert.ok(plan.every((item) => item.price > 0 && item.templateKey.includes(":")));

  const first = getStarterTemplates("berber")[0].id;
  plan = buildStarterServicePlan("berber", { ...selections, [first]: { selected: true, price: 0, durationMinutes: 30 } });
  assert.equal(plan.length, recommended - 1, "fiyatı 0 olan atlanır");

  plan = buildStarterServicePlan("berber", { [first]: { selected: true, price: 5_000_000, durationMinutes: 9999 } });
  assert.equal(plan[0].price, 1_000_000);
  assert.equal(plan[0].durationMinutes, 600);
});

test("idempotent: var olan hizmetler tekrar eklenmez", () => {
  const plan = buildStarterServicePlan("kuafor", defaultStarterSelections("kuafor"));
  assert.ok(plan.length >= 2);
  const existing = [
    { name: "Başka bir şey", templateKey: plan[0].templateKey },
    { name: plan[1].name.toLocaleUpperCase("tr-TR") },
  ];
  const missing = missingPlanItems(plan, existing);
  assert.equal(missing.length, plan.length - 2);
  assert.deepEqual(missingPlanItems(plan, plan.map((item) => ({ name: item.name, templateKey: item.templateKey }))), []);
});

test("önizleme hizmetleri seçimlere göre", () => {
  const preview = previewServices("nail");
  assert.equal(preview.length, 3);
  const selections = defaultStarterSelections("nail");
  Object.values(selections).forEach((choice) => { choice.selected = false; });
  const lastId = getStarterTemplates("nail").at(-1).id;
  selections[lastId] = { selected: true, price: 999, durationMinutes: 75 };
  assert.deepEqual(previewServices("nail", selections).map((item) => item.price), [999]);
});

test("QR: sürüm, boyut, bulucu desenler ve deterministik çıktı", () => {
  const text = "https://seninrandevun.com/isletme/sik-saclar-kuafor";
  const matrix = encodeQr(text);
  assert.equal(matrix.size, matrix.version * 4 + 17);
  assert.ok(matrix.version >= 3 && matrix.version <= 5);
  // Sol üst bulucu: 7x7 dış çerçeve koyu, içteki halka açık.
  for (let i = 0; i < 7; i++) {
    assert.equal(matrix.modules[0][i], true);
    assert.equal(matrix.modules[6][i], true);
  }
  assert.equal(matrix.modules[1][1], false);
  assert.equal(matrix.modules[3][3], true);
  // Koyu modül (8, size-8)
  assert.equal(matrix.modules[matrix.size - 8][8], true);
  assert.deepEqual(encodeQr(text).modules, matrix.modules);
  const path = qrSvgPath(matrix);
  assert.match(path, /^M\d+ \d+h\d+v1h-\d+z/);
  assert.ok(encodeQr("x".repeat(200)).version >= 9);
});
