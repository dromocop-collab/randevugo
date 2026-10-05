import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCustomFieldPayload, diffFields, fieldIdFromLabel, formatCustomFieldValue, normalizeFieldsForSubmit, parseCustomFieldValues,
  sameFields, summarizeFieldValues, uniqueFieldId, validateFieldDefinitions, validateFieldValue,
} from "./booking-fields-domain.ts";
import { BOOKING_FIELD_TEMPLATES, suggestedTemplates } from "./templates.ts";

const people = { id: "kisi_sayisi", label: "Kişi sayısı", type: "number", required: true, min: 1, max: 10 };
const pet = { id: "evcil_hayvan_turu", label: "Evcil hayvan türü", type: "select", required: false, options: ["Kedi", "Köpek"], serviceIds: ["s2"] };
const first = { id: "ilk_ziyaretim", label: "İlk ziyaretim", type: "checkbox", required: false };

test("fieldIdFromLabel sunucu ile aynı Türkçe dönüşümü yapar", () => {
  assert.equal(fieldIdFromLabel("Kişi sayısı"), "kisi_sayisi");
  assert.equal(fieldIdFromLabel("Çift odası istiyorum"), "cift_odasi_istiyorum");
  assert.equal(fieldIdFromLabel("  !!  "), "alan");
  assert.equal(uniqueFieldId("Kişi sayısı", ["kisi_sayisi"]), "kisi_sayisi_2");
});

test("tanım doğrulama: ayrılmış, yinelenen, seçenek ve aralık hataları", () => {
  assert.deepEqual(validateFieldDefinitions([people, pet, first]), {});
  const errors = validateFieldDefinitions([
    { id: "telefon", label: "Telefon", type: "text", required: false },
    { ...people }, { ...people },
    { id: "secim", label: "Seçim", type: "select", required: false, options: ["Tek", "Tek"] },
    { id: "aralik", label: "Aralık", type: "number", required: false, min: 5, max: 2 },
  ]);
  assert.ok(errors[0]?.length);
  assert.ok(errors[2]?.some((message) => message.includes("birden fazla")));
  assert.ok(errors[3]?.length);
  assert.ok(errors[4]?.length);
  assert.ok(validateFieldDefinitions(Array.from({ length: 7 }, (_, i) => ({ id: `a${i}`, label: `Alan ${i}`, type: "text", required: false })))[-1]);
});

test("müşteri değeri doğrulama ve gönderim yükü", () => {
  assert.equal(validateFieldValue(people, undefined), "Bu alan zorunlu.");
  assert.equal(validateFieldValue(people, 11), "1–10 arasında olmalı.");
  assert.equal(validateFieldValue(people, 2), null);
  assert.equal(validateFieldValue({ ...first, required: true }, false), "Devam etmek için onaylayın.");
  assert.equal(validateFieldValue(pet, "Balık"), "Geçerli bir seçenek seçin.");
  const values = { kisi_sayisi: 2, evcil_hayvan_turu: "Kedi", ilk_ziyaretim: true };
  assert.deepEqual(buildCustomFieldPayload([people, pet, first], "s1", values), { kisi_sayisi: 2, ilk_ziyaretim: true });
  assert.deepEqual(buildCustomFieldPayload([people, pet, first], "s2", values), values);
  assert.deepEqual(buildCustomFieldPayload([], "s1", {}), {});
  assert.deepEqual(summarizeFieldValues([people, first], "s1", values).map((row) => row.value), ["2", "Evet"]);
});

test("normalize, karşılaştırma ve fark", () => {
  const normalized = normalizeFieldsForSubmit([{ ...first, placeholder: "yok sayılır" }, { id: "not_alani", label: " Plaka ", type: "text", required: false }]);
  assert.equal(normalized[0].placeholder, undefined);
  assert.equal(normalized[1].label, "Plaka");
  assert.equal(normalized[1].maxLength, 120);
  assert.ok(sameFields([people], [{ ...people }]));
  const diff = diffFields([people, first], [{ ...people, max: 6 }, pet]);
  assert.deepEqual(diff.added.map((field) => field.id), ["evcil_hayvan_turu"]);
  assert.deepEqual(diff.removed.map((field) => field.id), ["ilk_ziyaretim"]);
  assert.equal(diff.changed.length, 1);
});

test("randevu değerleri biçimlendirme", () => {
  assert.equal(formatCustomFieldValue(true, "checkbox"), "Evet");
  assert.deepEqual(parseCustomFieldValues([{ id: "a", label: "A", type: "number", value: 3 }, { bad: true }, null]).length, 1);
});

test("şablonlar geçerli ve kategoriye göre öneriliyor", () => {
  const fields = BOOKING_FIELD_TEMPLATES.map((template) => ({ ...template.field, id: fieldIdFromLabel(template.field.label) }));
  for (const [index, field] of fields.entries()) assert.deepEqual(validateFieldDefinitions([field]), {}, `${index}: ${field.label}`);
  assert.deepEqual(suggestedTemplates("spa").slice(0, 3).map((template) => template.key), ["kisi_sayisi", "masaj_tercihi", "cift_odasi"]);
  assert.equal(suggestedTemplates("veteriner")[0].key, "evcil_hayvan_turu");
  assert.ok(suggestedTemplates("bilinmeyen").length > 0);
});
