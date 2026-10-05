import test from "node:test";
import assert from "node:assert/strict";
import { displayPlace, locative, locativeAdjective, fitDescription, composeDescription, joinTurkish, seoSlug, shortPersonName, rankByFrequency, buildAreaIntro, buildAreaFaq } from "./text.ts";
import { schemaTypeForCategory, categoryDisplayName, isSeoCategory } from "./categories.ts";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, openingHoursJsonLd, priceRangeText, storefrontJsonLd, serializeJsonLd, websiteJsonLd } from "./schema.ts";
import { absoluteUrl, businessPath } from "./site.ts";

test("Türkçe bulunma eki ünlü uyumu ve sert ünsüze uyar", () => {
  assert.equal(locative("Muğla"), "Muğla'da");
  assert.equal(locative("İzmir"), "İzmir'de");
  assert.equal(locative("Fethiye"), "Fethiye'de");
  assert.equal(locative("İstanbul"), "İstanbul'da");
  assert.equal(locative("Uşak"), "Uşak'ta");
  assert.equal(locative("Siirt"), "Siirt'te");
  assert.equal(locative("Kahramanmaraş"), "Kahramanmaraş'ta");
  assert.equal(locativeAdjective("Bursa"), "Bursa'daki");
});

test("açıklama 160 karakteri aşmaz ve kelime sınırından kesilir", () => {
  const long = "kelime ".repeat(60);
  const out = fitDescription(long, 160);
  assert.ok(out.length <= 160);
  assert.ok(out.endsWith("…"));
  assert.equal(fitDescription("  kısa   metin "), "kısa metin");
  const composed = composeDescription(["Birinci cümle burada.", "İkinci cümle biraz daha uzun ve açıklayıcı olabilir.", "Üçüncü cümle de var ve devam ediyor uzun uzun.", "Dördüncü."]);
  assert.ok(composed.length <= 160);
  assert.ok(composed.startsWith("Birinci cümle"));
});

test("yardımcı metin fonksiyonları", () => {
  assert.equal(joinTurkish(["a", "b", "c"]), "a, b ve c");
  assert.equal(joinTurkish(["a"]), "a");
  assert.equal(seoSlug("Kuşadası Merkez"), "kusadasi-merkez");
  assert.equal(seoSlug("Muğla"), "mugla");
  assert.equal(seoSlug("İzmir"), "izmir");
  assert.equal(shortPersonName("Ayşe Nur Kaya"), "Ayşe K.");
  assert.equal(shortPersonName(""), "Müşteri");
  assert.deepEqual(rankByFrequency(["Fethiye", "Bodrum", "Fethiye", "", null]), [{ name: "Fethiye", count: 2 }, { name: "Bodrum", count: 1 }]);
});

test("kategori → schema.org türü eşlemesi", () => {
  assert.equal(schemaTypeForCategory("kuafor"), "HairSalon");
  assert.equal(schemaTypeForCategory("berber"), "HairSalon");
  assert.equal(schemaTypeForCategory("guzellik"), "BeautySalon");
  assert.equal(schemaTypeForCategory("nail"), "NailSalon");
  assert.equal(schemaTypeForCategory("spa"), "DaySpa");
  assert.equal(schemaTypeForCategory("spor"), "ExerciseGym");
  assert.equal(schemaTypeForCategory("saglik"), "MedicalClinic");
  assert.equal(schemaTypeForCategory("veteriner"), "VeterinaryCare");
  assert.equal(schemaTypeForCategory("danismanlik"), "ProfessionalService");
  assert.equal(schemaTypeForCategory("dis-klinigi"), "Dentist");
  assert.equal(schemaTypeForCategory("cilt-bakim"), "HealthAndBeautyBusiness");
  assert.equal(schemaTypeForCategory("bilinmeyen"), "LocalBusiness");
  assert.equal(schemaTypeForCategory(undefined), "LocalBusiness");
  assert.equal(categoryDisplayName("guzellik"), "Güzellik Merkezi");
  assert.equal(categoryDisplayName("pet-otel"), "Pet otel");
  assert.ok(isSeoCategory("kuafor") && !isSeoCategory("toString"));
});

test("çalışma saatleri gruplanır, öğle arası ikiye bölünür, geçersizler atlanır", () => {
  const hours = [
    { day: 1, isOpen: true, start: "09:00", end: "18:00" },
    { day: 2, isOpen: true, start: "09:00", end: "18:00" },
    { day: 6, isOpen: true, start: "10:00", end: "16:00", breakStart: "12:00", breakEnd: "13:00" },
    { day: 0, isOpen: false, start: "09:00", end: "18:00" },
    { day: 3, isOpen: true, start: "25:00", end: "18:00" },
  ];
  const specs = openingHoursJsonLd(hours);
  assert.deepEqual(specs[0], { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday"], opens: "09:00", closes: "18:00" });
  assert.equal(specs.length, 3);
  assert.deepEqual(specs.map((s) => `${s.opens}-${s.closes}`), ["09:00-18:00", "10:00-12:00", "13:00-16:00"]);
});

test("fiyat aralığı", () => {
  assert.equal(priceRangeText([]), undefined);
  assert.equal(priceRangeText([0, 250]), "250 TRY");
  assert.equal(priceRangeText([1500, 250, 400]), "250-1.500 TRY");
});

const base = {
  slug: "erdem-kuafor", path: "/isletme/erdem-kuafor", name: "Erdem Kuaför", category: "kuafor",
  phone: "+905551112233", address: "Atatürk Cd. 1", city: "Muğla", district: "Fethiye",
  hours: [{ day: 1, isOpen: true, start: "09:00", end: "19:00" }],
  services: [{ name: "Saç kesimi", price: 400, durationMinutes: 45 }, { name: "Fön", price: 0 }],
  reviews: [],
};

test("vitrin LocalBusiness: tür, adres, teklif, rezervasyon", () => {
  const node = storefrontJsonLd({ ...base, rating: 0, reviewCount: 0 });
  assert.equal(node["@type"], "HairSalon");
  assert.equal(node.url, "https://seninrandevun.com/isletme/erdem-kuafor");
  assert.deepEqual(node.address, { "@type": "PostalAddress", streetAddress: "Atatürk Cd. 1", addressLocality: "Fethiye", addressRegion: "Muğla", addressCountry: "TR" });
  assert.equal(node.priceRange, "400 TRY");
  const offers = node.hasOfferCatalog.itemListElement;
  assert.equal(offers.length, 2);
  assert.equal(offers[0].price, 400);
  assert.equal(offers[0].priceCurrency, "TRY");
  assert.equal(offers[0].itemOffered.duration, "PT45M");
  assert.equal(offers[1].price, undefined);
  assert.equal(node.potentialAction["@type"], "ReserveAction");
  assert.equal(node.potentialAction.target.urlTemplate, "https://seninrandevun.com/isletme/erdem-kuafor/randevu");
  // Gerçek yorum yoksa puan ve yorum asla yazılmaz.
  assert.equal(node.aggregateRating, undefined);
  assert.equal(node.review, undefined);
});

test("vitrin: yalnızca yayınlanmış yorumlarla puan ve yorum", () => {
  const node = storefrontJsonLd({
    ...base, rating: 4.76, reviewCount: 12,
    reviews: [
      { customerName: "Ayşe Kaya", rating: 5, comment: "Harika", createdAt: "2026-09-01T10:00:00Z", isVisible: true, status: "approved" },
      { customerName: "Gizli Kişi", rating: 1, comment: "Gizlenmiş", isVisible: false, status: "approved" },
      { customerName: "Bekleyen", rating: 2, comment: "Onaysız", isVisible: true, status: "pending" },
      { customerName: "Yorumsuz", rating: 4, comment: "", isVisible: true, status: "approved" },
    ],
  });
  assert.deepEqual(node.aggregateRating, { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 12, bestRating: 5, worstRating: 1 });
  assert.equal(node.review.length, 1);
  assert.equal(node.review[0].author.name, "Ayşe K.");
  assert.equal(node.review[0].datePublished, "2026-09-01");
  assert.equal(storefrontJsonLd({ ...base, rating: 7, reviewCount: 3 }).aggregateRating, undefined);
  assert.equal(storefrontJsonLd({ ...base, allowOnlineBooking: false }).potentialAction, undefined);
});

test("liste, sayfa yolu, SSS ve site düğümleri", () => {
  const crumbs = breadcrumbJsonLd([{ name: "Ana Sayfa", path: "/" }, { name: "Muğla", path: "/sehir/mugla" }]);
  assert.equal(crumbs.itemListElement[0].item, "https://seninrandevun.com");
  assert.equal(crumbs.itemListElement[1].position, 2);
  const list = itemListJsonLd([{ name: "A", path: "/isletme/a" }]);
  assert.equal(list.numberOfItems, 1);
  assert.equal(list.itemListElement[0].url, "https://seninrandevun.com/isletme/a");
  assert.equal(faqJsonLd([]), null);
  assert.equal(faqJsonLd([{ question: "S?", answer: "C." }]).mainEntity[0].acceptedAnswer.text, "C.");
  assert.equal(websiteJsonLd().potentialAction.target.urlTemplate, "https://seninrandevun.com/kesfet?q={search_term_string}");
});

test("JSON-LD güvenli serileştirme: </script> kaçışlanır ve geri ayrıştırılabilir", () => {
  const text = serializeJsonLd({ name: "</script><b>x " });
  assert.ok(!text.includes("</script>"));
  assert.deepEqual(JSON.parse(text), { name: "</script><b>x " });
});

test("adres yardımcıları", () => {
  assert.equal(absoluteUrl("/"), "https://seninrandevun.com");
  assert.equal(absoluteUrl("kesfet"), "https://seninrandevun.com/kesfet");
  assert.equal(businessPath("çiçek kuaför"), "/isletme/%C3%A7i%C3%A7ek%20kuaf%C3%B6r");
  assert.equal(businessPath("%C3%A7icek"), "/isletme/%C3%A7icek");
});

test("şehir/kategori giriş metni ve SSS yalnızca veriyle desteklenen cümleler içerir", () => {
  const facts = { place: "Muğla", noun: "kuaför", businessCount: 3, districts: [{ name: "Fethiye", count: 2 }, { name: "Bodrum", count: 1 }], verifiedCount: 0 };
  const intro = buildAreaIntro(facts);
  assert.match(intro[0], /Muğla'da SeninRandevun üzerinden online randevu alabileceğin 3 kuaför işletmesi yayında/);
  assert.match(intro[0], /Fethiye \(2\) ve Bodrum \(1\)/);
  assert.equal(intro.length, 1, "fiyat/puan yokken ikinci paragraf yazılmaz");
  const faq = buildAreaFaq(facts);
  assert.ok(!faq.some((f) => /fiyat/.test(f.question)));
  assert.ok(!faq.some((f) => /puanlı/.test(f.question)));
  const rich = buildAreaFaq({ ...facts, minPrice: 200, maxPrice: 900, topRated: { name: "Erdem Kuaför", rating: 4.9, reviewCount: 20 } });
  assert.ok(rich.some((f) => /200 ₺ ile 900 ₺/.test(f.answer)));
  assert.ok(rich.some((f) => /Erdem Kuaför/.test(f.answer)));
});

test("büyük harfli yer adları düzeltilir, karışık yazım korunur", () => {
  assert.equal(displayPlace("FETHİYE"), "Fethiye");
  assert.equal(displayPlace("  KUŞADASI  MERKEZ "), "Kuşadası Merkez");
  assert.equal(displayPlace("Muğla"), "Muğla");
  assert.equal(displayPlace("iZmir"), "iZmir");
  assert.equal(displayPlace(undefined), "");
});
