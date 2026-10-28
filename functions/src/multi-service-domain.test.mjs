import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_EXTRA_SERVICES, appointmentServiceSummary, combinePriceParts, parseExtraServiceRequests, staffCanProvide,
} from "../lib/multi-service-domain.js";

test("ek hizmet listesi: eski istemci boş, ana hizmet ve tekrarlar atılır", () => {
  assert.deepEqual(parseExtraServiceRequests(undefined, "a"), []);
  assert.deepEqual(parseExtraServiceRequests(null, "a"), []);
  assert.deepEqual(parseExtraServiceRequests(["b", { serviceId: "a" }, { serviceId: "b" }, { serviceId: "c", variantId: "uzun" }], "a"),
    [{ serviceId: "b" }, { serviceId: "c", variantId: "uzun" }]);
});

test("ek hizmet listesi: bozuk öğe ve sınır aşımı hata verir", () => {
  assert.throws(() => parseExtraServiceRequests("b", "a"), /geçersiz/);
  assert.throws(() => parseExtraServiceRequests([{ serviceId: "../x" }], "a"), /geçersiz/);
  assert.throws(() => parseExtraServiceRequests([{}], "a"), /geçersiz/);
  const ids = Array.from({ length: MAX_EXTRA_SERVICES + 1 }, (_, index) => `s${index}`);
  assert.throws(() => parseExtraServiceRequests(ids, "a"), /en fazla 5 hizmet/);
  assert.equal(parseExtraServiceRequests(ids.slice(0, MAX_EXTRA_SERVICES), "a").length, MAX_EXTRA_SERVICES);
});

test("personel uygunluğu: branş ve hizmet listesi", () => {
  assert.equal(staffCanProvide(null, "x", "sac"), true);
  assert.equal(staffCanProvide({}, "x", "sac"), true);
  assert.equal(staffCanProvide({ serviceIds: ["x"] }, "x", "sac"), true);
  assert.equal(staffCanProvide({ serviceIds: ["y"] }, "x", "sac"), false);
  assert.equal(staffCanProvide({ specialtyCategoryIds: ["tirnak"] }, "x", "sac"), false);
  assert.equal(staffCanProvide({ specialtyCategoryIds: ["sac"], serviceIds: [] }, "x", "sac"), true);
});

test("birleşik fiyat tipi", () => {
  const fixed = (price) => ({ price, priceType: "fixed" });
  assert.deepEqual(combinePriceParts([fixed(300), fixed(150.5)]), { servicePrice: 450.5, servicePriceType: "fixed" });
  assert.deepEqual(combinePriceParts([fixed(300), { price: 200, priceType: "range", priceMax: 400 }]),
    { servicePrice: 500, servicePriceType: "range", servicePriceMax: 700 });
  assert.deepEqual(combinePriceParts([fixed(300), { price: 200, priceType: "from" }]), { servicePrice: 500, servicePriceType: "from" });
  assert.deepEqual(combinePriceParts([fixed(300), { price: 999, priceType: "quote" }]), { servicePrice: 300, servicePriceType: "from" });
  assert.deepEqual(combinePriceParts([{ price: 0, priceType: "quote" }, { price: 5, priceType: "quote" }]), { servicePrice: 0, servicePriceType: "quote" });
  assert.deepEqual(combinePriceParts([{ price: 100, priceType: "range", priceMax: 50 }]), { servicePrice: 100, servicePriceType: "range", servicePriceMax: 100 });
});

test("hizmet özeti: kısa, sığmazsa sayı", () => {
  assert.equal(appointmentServiceSummary("Saç kesimi", []), "Saç kesimi");
  assert.equal(appointmentServiceSummary("Saç kesimi", undefined), "Saç kesimi");
  assert.equal(appointmentServiceSummary("Saç kesimi", [{ name: "Sakal" }, { name: " " }, null]), "Saç kesimi + Sakal");
  const long = appointmentServiceSummary("Saç kesimi", [{ name: "Sakal tıraşı ve şekillendirme" }, { name: "Cilt bakımı ve maske" }], 40);
  assert.equal(long, "Saç kesimi +2 hizmet");
  assert.ok(appointmentServiceSummary("A".repeat(80), [{ name: "B" }], 40).length <= 40);
  assert.ok(appointmentServiceSummary("A".repeat(80), [], 40).length <= 40);
  assert.equal(appointmentServiceSummary("", []), "");
});
