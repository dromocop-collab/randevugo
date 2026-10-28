import test from "node:test";
import assert from "node:assert/strict";
import { combinePriceParts, combinedPriceLabel, extraLinePriceLabel, servicePricePart } from "./multi-service.ts";

const t = (source, vars = {}) => source.replace(/\{(\w+)\}/g, (_, key) => String(vars[key]));
const money = (value) => `${value} ₺`;

test("birleşik fiyat: sunucuyla aynı kurallar", () => {
  const fixed = (price) => ({ price, priceType: "fixed" });
  assert.deepEqual(combinePriceParts([fixed(300), fixed(150.5)]), { servicePrice: 450.5, servicePriceType: "fixed" });
  assert.deepEqual(combinePriceParts([fixed(300), { price: 200, priceType: "range", priceMax: 400 }]), { servicePrice: 500, servicePriceType: "range", servicePriceMax: 700 });
  assert.deepEqual(combinePriceParts([fixed(300), { price: 200, priceType: "from" }]), { servicePrice: 500, servicePriceType: "from" });
  assert.deepEqual(combinePriceParts([fixed(300), { price: 999, priceType: "quote" }]), { servicePrice: 300, servicePriceType: "from" });
  assert.deepEqual(combinePriceParts([{ price: 0, priceType: "quote" }, { price: 5, priceType: "quote" }]), { servicePrice: 0, servicePriceType: "quote" });
});

test("fiyat parçası ve etiketler", () => {
  assert.deepEqual(servicePricePart({ price: 500, priceType: "from" }, { id: "u", name: "Uzun", price: 900, durationMinutes: 60 }), { price: 900, priceType: "from", priceMax: null });
  assert.deepEqual(servicePricePart({ price: 500, priceType: "range", priceMax: 800 }), { price: 500, priceType: "range", priceMax: 800 });
  assert.deepEqual(servicePricePart({ price: 500 }), { price: 500, priceType: "fixed", priceMax: null });
  assert.equal(combinedPriceLabel({ servicePrice: 450, servicePriceType: "fixed" }, t, money), "450 ₺");
  assert.equal(combinedPriceLabel({ servicePrice: 450, servicePriceType: "from" }, t, money), "450 ₺'den başlayan");
  assert.equal(combinedPriceLabel({ servicePrice: 450, servicePriceType: "range", servicePriceMax: 700 }, t, money), "450 ₺ – 700 ₺");
  assert.equal(extraLinePriceLabel({ price: 150 }, t, money), "150 ₺");
  assert.equal(extraLinePriceLabel({ price: 0, priceType: "quote" }, t, money), "Fiyat görüşmede");
});
