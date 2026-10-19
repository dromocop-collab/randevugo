import test from "node:test";
import assert from "node:assert/strict";
import {
  appointmentPriceSnapshot, applyServiceVariant, parseTranslationResponse, resolveServiceVariant, serviceDisplayName,
  serviceNameTranslations, servicePriceType, serviceVariants, translationItems,
} from "../lib/service-pricing-domain.js";

const variants = [
  { id: "kisa", name: "Kısa saç", price: 500, durationMinutes: 45 },
  { id: "uzun", name: "Uzun saç", price: 900, durationMinutes: 90 },
];

test("price type defaults to fixed for old services", () => {
  assert.equal(servicePriceType({}), "fixed");
  assert.equal(servicePriceType({ priceType: "range" }), "range");
  assert.equal(servicePriceType({ priceType: "weird" }), "fixed");
});

test("variants are validated and ignored for range/quote prices", () => {
  assert.equal(serviceVariants({ variants }).length, 2);
  assert.equal(serviceVariants({ variants, priceType: "quote" }).length, 0);
  assert.equal(serviceVariants({ variants, priceType: "range" }).length, 0);
  const dirty = serviceVariants({ variants: [...variants, { id: "kisa", name: "dup", price: 1, durationMinutes: 30 }, { id: "x", name: "", price: 1, durationMinutes: 30 }, { id: "y", name: "y", price: -1, durationMinutes: 30 }, { id: "z", name: "z", price: 1, durationMinutes: 2 }] });
  assert.deepEqual(dirty.map((item) => item.id), ["kisa", "uzun"]);
});

test("missing variant id falls back to first option (old clients), invalid id is rejected", () => {
  assert.equal(resolveServiceVariant({ variants }, undefined).variant.id, "kisa");
  assert.equal(resolveServiceVariant({ variants }, "uzun").variant.id, "uzun");
  assert.deepEqual(resolveServiceVariant({ variants }, "nope"), { variant: null, invalid: true });
  assert.deepEqual(resolveServiceVariant({}, "uzun"), { variant: null, invalid: false });
});

test("variant overrides price and duration", () => {
  const service = applyServiceVariant({ price: 500, durationMinutes: 45, name: "Boya" }, variants[1]);
  assert.equal(service.price, 900);
  assert.equal(service.durationMinutes, 90);
  assert.equal(applyServiceVariant({ price: 1 }, null).price, 1);
});

test("appointment snapshot carries price type; quote books at zero", () => {
  assert.deepEqual(appointmentPriceSnapshot({ price: 750 }, null), { servicePrice: 750, servicePriceType: "fixed" });
  assert.deepEqual(appointmentPriceSnapshot({ price: 500, priceType: "range", priceMax: 900 }, null), { servicePrice: 500, servicePriceType: "range", servicePriceMax: 900 });
  assert.equal(appointmentPriceSnapshot({ price: 300, priceType: "quote" }, null).servicePrice, 0);
  assert.deepEqual(appointmentPriceSnapshot({ price: 900, priceType: "from" }, variants[1]), { servicePrice: 900, servicePriceType: "from", serviceVariantId: "uzun", serviceVariantName: "Uzun saç" });
});

test("display name and translations include the option", () => {
  assert.equal(serviceDisplayName("Saç Boyama", variants[1]), "Saç Boyama · Uzun saç");
  assert.equal(serviceDisplayName("Saç Boyama", null), "Saç Boyama");
  const service = { translations: { en: { name: "Hair colouring", variants: { uzun: "Long hair" } }, XX: { name: "bad" } } };
  assert.deepEqual(serviceNameTranslations(service, variants[1]), { en: "Hair colouring · Long hair" });
  assert.deepEqual(serviceNameTranslations(service, variants[0]), { en: "Hair colouring · Kısa saç" });
  assert.deepEqual(serviceNameTranslations({}, null), {});
});

test("translation input and model output are sanitised", () => {
  assert.deepEqual(translationItems([{ key: "s1.name", text: " Kaş " }, { key: "bad key", text: "x" }, { key: "s2", text: "" }]), [{ key: "s1.name", text: "Kaş" }]);
  assert.deepEqual(parseTranslationResponse('```json\n{"s1.name":"Brow","evil":"x","s2":5}\n```', ["s1.name", "s2"]), { "s1.name": "Brow" });
  assert.deepEqual(parseTranslationResponse("no json", ["a"]), {});
});

test("auto translation runs only when source text changes and never overwrites manual edits", async () => {
  const { serviceTranslationSource, categoryTranslationSource, needsAutoTranslation, buildServiceTranslation } = await import("../lib/service-pricing-domain.js");
  const service = { name: "Saç Boyama", description: "Kök boya", price: 500, variants };
  const source = serviceTranslationSource(service);
  assert.deepEqual(source.items.map((item) => item.key), ["name", "description", "v.kisa", "v.uzun"]);
  assert.equal(serviceTranslationSource({ ...service, price: 999, durationMinutes: 10 }).hash, source.hash, "price change must not retranslate");
  assert.notEqual(serviceTranslationSource({ ...service, name: "Saç Boyası" }).hash, source.hash);
  assert.equal(needsAutoTranslation(service, "en", source), true);
  assert.equal(needsAutoTranslation({ ...service, translations: { en: { sourceHash: source.hash } } }, "en", source), false);
  assert.equal(needsAutoTranslation({ ...service, translations: { en: { manual: true, sourceHash: "old" } } }, "en", source), false);
  assert.equal(needsAutoTranslation({ name: "" }, "en", serviceTranslationSource({ name: "" })), false);
  assert.equal(categoryTranslationSource({ name: "Saç" }).items.length, 1);
  assert.deepEqual(buildServiceTranslation({ name: "Hair coloring", "v.uzun": "Long hair" }, "h1"),
    { name: "Hair coloring", variants: { uzun: "Long hair" }, auto: true, sourceHash: "h1" });
});
