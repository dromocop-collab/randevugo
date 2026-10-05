import test from "node:test";
import assert from "node:assert/strict";
import { fieldIdFromLabel, sanitizeCustomFields, validateCustomFieldValues, FieldValidationError } from "../lib/booking-fields-domain.js";

test("field ids are derived from Turkish labels", () => {
  assert.equal(fieldIdFromLabel("Kişi sayısı"), "kisi_sayisi");
  assert.equal(fieldIdFromLabel("Evcil hayvan türü"), "evcil_hayvan_turu");
});

test("sanitize keeps a safe schema and rejects bad definitions", () => {
  const [people, pet] = sanitizeCustomFields([
    { label: "Kişi sayısı", type: "number", required: true, min: 1, max: 4, evil: "<script>" },
    { label: "Evcil hayvan", type: "select", options: ["Kedi", "Köpek", "Kedi", ""] },
  ]);
  assert.deepEqual(people, { id: "kisi_sayisi", label: "Kişi sayısı", type: "number", required: true, min: 1, max: 4 });
  assert.deepEqual(pet.options, ["Kedi", "Köpek"]);
  assert.throws(() => sanitizeCustomFields([{ label: "Telefon", type: "text" }]), FieldValidationError);
  assert.throws(() => sanitizeCustomFields([{ label: "Tek", type: "select", options: ["A"] }]), FieldValidationError);
  assert.throws(() => sanitizeCustomFields([{ label: "Aynı", type: "text" }, { label: "aynı", type: "text" }]), FieldValidationError);
  assert.throws(() => sanitizeCustomFields(Array.from({ length: 7 }, (_, i) => ({ label: `Alan ${i}`, type: "text" }))), FieldValidationError);
  assert.throws(() => sanitizeCustomFields([{ label: "Ters", type: "number", min: 5, max: 2 }]), FieldValidationError);
});

test("values are validated per type, service and requirement", () => {
  const fields = sanitizeCustomFields([
    { label: "Kişi sayısı", type: "number", required: true, min: 1, max: 4 },
    { label: "Paket", type: "select", options: ["Klasik", "VIP"], serviceIds: ["spa"] },
    { label: "KVKK özel onay", type: "checkbox", required: true },
  ]);
  assert.deepEqual(
    validateCustomFieldValues(fields, "spa", { kisi_sayisi: "2", paket: "VIP", kvkk_ozel_onay: true }, true).map((item) => item.value),
    [2, "VIP", true]
  );
  // Hizmete uymayan alan yok sayılır.
  assert.equal(validateCustomFieldValues(fields, "kuafor", { kisi_sayisi: 1, paket: "VIP", kvkk_ozel_onay: true }, true).length, 2);
  assert.throws(() => validateCustomFieldValues(fields, "spa", { kisi_sayisi: 9, kvkk_ozel_onay: true }, true), /1–4/);
  assert.throws(() => validateCustomFieldValues(fields, "spa", { kisi_sayisi: 2, paket: "Yok", kvkk_ozel_onay: true }, true), FieldValidationError);
  assert.throws(() => validateCustomFieldValues(fields, "spa", { kisi_sayisi: 2 }, true), /onaylanmalıdır/);
  // Eski istemciler: zorunlu alan eksikse engellenmez.
  assert.deepEqual(validateCustomFieldValues(fields, "spa", undefined, false), []);
});
