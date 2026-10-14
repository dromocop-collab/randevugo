import test from "node:test";
import assert from "node:assert/strict";
import { isValidTckn, isValidVkn, maskTaxId, normalizeBillingProfile, vatBreakdown, vknCheckDigit } from "../lib/billing-domain.js";

test("TCKN checksum", () => {
  assert.equal(isValidTckn("10000000146"), true);
  assert.equal(isValidTckn("10000000147"), false);
  assert.equal(isValidTckn("01234567890"), false);
  assert.equal(isValidTckn("1234"), false);
});

test("VKN checksum rejects any changed digit", () => {
  const vkn = "123456789" + vknCheckDigit("123456789");
  assert.equal(isValidVkn(vkn), true);
  assert.equal(isValidVkn(vkn.slice(0, 9) + ((Number(vkn[9]) + 1) % 10)), false);
  assert.equal(isValidVkn("12345"), false);
  // Hiçbir 9 hanelik önek için kontrol hanesi 0-9 dışına çıkmaz.
  for (const prefix of ["000000000", "999999999", "480084721"]) assert.ok(vknCheckDigit(prefix) >= 0 && vknCheckDigit(prefix) <= 9);
});

test("billing profile validation", () => {
  const base = { name: "Ali Veli", taxId: "100 000 001 46", address: "Akarca Mah. Yunus Nadi Cad. No 8", city: "Muğla", district: "Fethiye", email: "ALI@Ornek.com" };
  const individual = normalizeBillingProfile({ ...base, type: "individual" });
  assert.equal(individual.taxId, "10000000146");
  assert.equal(individual.email, "ali@ornek.com");
  assert.equal(individual.taxOffice, "");
  assert.throws(() => normalizeBillingProfile({ ...base, taxId: "10000000147" }), /T\.C\./);
  assert.throws(() => normalizeBillingProfile({ ...base, type: "company", taxOffice: "" }), /Vergi dairesi/);
  const company = normalizeBillingProfile({ ...base, type: "company", name: "Erdem Kuaför Ltd. Şti.", taxId: "123456789" + vknCheckDigit("123456789"), taxOffice: "Fethiye" });
  assert.equal(company.type, "company");
  // Şahıs şirketi TCKN ile kurumsal fatura alabilir.
  assert.equal(normalizeBillingProfile({ ...base, type: "company", taxOffice: "Fethiye" }).taxId, "10000000146");
  assert.throws(() => normalizeBillingProfile({ ...base, address: "kısa" }), /adres/);
  assert.throws(() => normalizeBillingProfile({ ...base, email: "x" }), /e-posta/);
});

test("VAT breakdown at 20%", () => {
  assert.deepEqual(vatBreakdown(49000), { grossKurus: 49000, netKurus: 40833, vatKurus: 8167, rate: 20 });
  assert.deepEqual(vatBreakdown(1500000), { grossKurus: 1500000, netKurus: 1250000, vatKurus: 250000, rate: 20 });
});

test("tax id masking", () => {
  assert.equal(maskTaxId("10000000146"), "100******46");
  assert.equal(maskTaxId("1234567890"), "123*****90");
});
