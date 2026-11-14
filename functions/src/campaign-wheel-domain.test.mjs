import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWheelSettings, publicWheel, wheelIsLive, pickSliceIndex, prizeCode, prizeDiscount,
  prizeAppliesToBooking, prizeText, spinDocumentId, WheelValidationError,
} from "../lib/campaign-wheel-domain.js";

const baseSlices = [
  { id: "a", label: "%20 indirim", type: "percent", value: 20, weight: 30 },
  { id: "b", label: "50 TL", type: "amount", value: 50, weight: 20, stock: 2 },
  { id: "c", label: "Ücretsiz kaş", type: "free_service", serviceId: "kas", serviceName: "Kaş alımı", weight: 10, stock: 1 },
  { id: "d", label: "Bu sefer olmadı", type: "none", weight: 40 },
];

test("ayar normalize edilir, yeni kampanya kimliği atanır", () => {
  const settings = normalizeWheelSettings({ enabled: true, title: "  Kış  çarkı ", slices: baseSlices }, null, () => "k1");
  assert.equal(settings.title, "Kış çarkı");
  assert.equal(settings.campaignId, "k1");
  assert.equal(settings.prizeValidDays, 30);
  assert.equal(settings.slices[1].stock, 2);
  assert.equal(settings.slices[3].value, 0);
  assert.equal(settings.slices[2].serviceName, "Kaş alımı");
});

test("mevcut kampanya korunur, newCampaign ile sıfırlanır", () => {
  const kept = normalizeWheelSettings({ slices: baseSlices }, { campaignId: "eski" }, () => "yeni");
  assert.equal(kept.campaignId, "eski");
  const reset = normalizeWheelSettings({ slices: baseSlices, newCampaign: true }, { campaignId: "eski" }, () => "yeni");
  assert.equal(reset.campaignId, "yeni");
});

test("geçersiz ayarlar anlaşılır mesajla reddedilir", () => {
  assert.throws(() => normalizeWheelSettings({ slices: [baseSlices[0]] }, null, () => "x"), WheelValidationError);
  assert.throws(() => normalizeWheelSettings({ slices: [{ ...baseSlices[0], value: 150 }, baseSlices[3]] }, null, () => "x"), /1 ile 100/);
  assert.throws(() => normalizeWheelSettings({ slices: [{ ...baseSlices[2], serviceId: "" }, baseSlices[3]] }, null, () => "x"), /hizmeti seçin/);
  assert.throws(() => normalizeWheelSettings({ slices: [{ ...baseSlices[0], weight: 0 }, { ...baseSlices[3], weight: 0 }] }, null, () => "x"), /şansı/);
  assert.throws(() => normalizeWheelSettings({ slices: [baseSlices[3], { ...baseSlices[3], id: "e" }] }, null, () => "x"), /ödül dilimi/);
  assert.throws(() => normalizeWheelSettings({ slices: baseSlices, startsAt: 2000, endsAt: 1000 }, null, () => "x"), /Bitiş/);
});

test("aynı dilim kimlikleri tekilleşir", () => {
  const settings = normalizeWheelSettings({ slices: [{ ...baseSlices[0], id: "a" }, { ...baseSlices[3], id: "a" }] }, null, () => "x");
  assert.notEqual(settings.slices[0].id, settings.slices[1].id);
});

test("vitrin sürümü olasılık ve stok içermez; kapalı çark yayınlanmaz", () => {
  const settings = normalizeWheelSettings({ enabled: true, slices: baseSlices }, null, () => "k1");
  const pub = publicWheel(settings);
  assert.ok(pub);
  assert.equal(JSON.stringify(pub).includes("weight"), false);
  assert.equal(JSON.stringify(pub).includes("stock"), false);
  assert.equal(publicWheel({ ...settings, enabled: false }), null);
});

test("tarih aralığı", () => {
  const s = { enabled: true, startsAt: 100, endsAt: 200 };
  assert.equal(wheelIsLive(s, 50), false);
  assert.equal(wheelIsLive(s, 150), true);
  assert.equal(wheelIsLive(s, 200), false);
  assert.equal(wheelIsLive({ ...s, enabled: false }, 150), false);
});

test("ağırlıklı seçim ve stok", () => {
  const settings = normalizeWheelSettings({ slices: baseSlices }, null, () => "x");
  // toplam 100: a [0,30) b [30,50) c [50,60) d [60,100)
  assert.equal(pickSliceIndex(settings.slices, {}, 0.0), 0);
  assert.equal(pickSliceIndex(settings.slices, {}, 0.35), 1);
  assert.equal(pickSliceIndex(settings.slices, {}, 0.55), 2);
  assert.equal(pickSliceIndex(settings.slices, {}, 0.99), 3);
  // b ve c stoğu bitti → a [0,30) d [30,70)
  assert.equal(pickSliceIndex(settings.slices, { b: 2, c: 1 }, 0.5), 3);
  // hiçbir ödül kalmadı, "none" ağırlığı 0 → yine none
  const onlyNoneLeft = settings.slices.map((s) => (s.type === "none" ? { ...s, weight: 0 } : { ...s, stock: 0 }));
  assert.equal(pickSliceIndex(onlyNoneLeft, {}, 0.5), 3);
  // none de yoksa null
  assert.equal(pickSliceIndex(onlyNoneLeft.filter((s) => s.type !== "none"), {}, 0.5), null);
});

test("dağılım ağırlıklara uyar", () => {
  const settings = normalizeWheelSettings({ slices: baseSlices }, null, () => "x");
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 10_000; i++) counts[pickSliceIndex(settings.slices, {}, (i + 0.5) / 10_000)]++;
  assert.deepEqual(counts, [3000, 2000, 1000, 4000]);
});

test("kod biçimi", () => {
  const code = prizeCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]));
  assert.match(code, /^SR-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(/[01OI]/.test(code.slice(3)), false);
});

test("indirim hesabı", () => {
  const lines = [{ serviceId: "sac", price: 400 }, { serviceId: "kas", price: 150 }];
  assert.equal(prizeDiscount({ type: "percent", value: 20, serviceId: null }, lines, 550), 110);
  assert.equal(prizeDiscount({ type: "amount", value: 50, serviceId: null }, lines, 550), 50);
  assert.equal(prizeDiscount({ type: "amount", value: 900, serviceId: null }, lines, 550), 550);
  assert.equal(prizeDiscount({ type: "free_service", value: 0, serviceId: "kas" }, lines, 550), 150);
  assert.equal(prizeDiscount({ type: "free_service", value: 0, serviceId: "boya" }, lines, 550), 0);
  assert.equal(prizeDiscount({ type: "points", value: 100, serviceId: null }, lines, 550), 0);
  assert.equal(prizeDiscount({ type: "percent", value: 10, serviceId: null }, [], 0), 0);
});

test("randevuya uygulanabilirlik ve metin", () => {
  assert.equal(prizeAppliesToBooking({ type: "percent", serviceId: null }, []), true);
  assert.equal(prizeAppliesToBooking({ type: "free_service", serviceId: "kas" }, ["sac"]), false);
  assert.equal(prizeAppliesToBooking({ type: "free_service", serviceId: "kas" }, ["sac", "kas"]), true);
  assert.equal(prizeAppliesToBooking({ type: "points", serviceId: null }, []), false);
  assert.equal(prizeText({ type: "percent", value: 15, label: "x", serviceName: null }), "%15 indirim");
  assert.equal(prizeText({ type: "free_service", value: 0, label: "x", serviceName: "Kaş" }), "Ücretsiz Kaş");
  assert.equal(spinDocumentId("k1", "a".repeat(64)), `k1_${"a".repeat(32)}`);
});
