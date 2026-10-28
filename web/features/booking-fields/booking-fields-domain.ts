// İşletmeye özel randevu alanları — functions/src/booking-fields-domain.ts şemasının istemci aynası.
// Saf fonksiyonlar (Firebase'e bağımlı değil). Birim testleri: booking-fields-domain.test.mjs
// Metin döndüren fonksiyonlar isteğe bağlı `t` alır (varsayılan: Türkçe); işletmenin yazdığı etiketler veri olarak kalır.
import { interpolate, tk, type TFunction } from "../../i18n/config.ts";

export const CUSTOM_FIELD_TYPES = ["number", "select", "text", "textarea", "checkbox"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type CustomBookingField = {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
  serviceIds?: string[];
};

/** Randevuya kaydedilen değer (appointment.customFields). */
export type CustomFieldValue = { id: string; label: string; type: CustomFieldType; value: string | number | boolean };

/** Müşteri formundaki ham değerler (alan id → değer). */
export type CustomFieldInputValues = Record<string, string | number | boolean>;

export const MAX_CUSTOM_FIELDS = 6;
export const LABEL_MIN = 2;
export const LABEL_MAX = 40;
export const HELP_MAX = 120;
export const PLACEHOLDER_MAX = 60;
export const OPTION_MAX = 40;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 12;
export const NUMBER_LIMIT = 100_000;
export const TEXT_LIMIT = 120;
export const TEXTAREA_LIMIT = 500;
export const RESERVED_FIELD_IDS = ["ad", "adsoyad", "isim", "telefon", "phone", "eposta", "email", "not", "notes"];

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  number: tk("Sayı"),
  select: tk("Seçenek"),
  text: tk("Kısa metin"),
  textarea: tk("Uzun metin"),
  checkbox: tk("Onay kutusu"),
};

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" }; // i18n-ignore

/** Sunucudaki fieldIdFromLabel ile birebir aynı. */
export function fieldIdFromLabel(label: string): string {
  return label.toLocaleLowerCase("tr").replace(/[çğıİöşü]/g, (char) => TR_MAP[char] ?? char) // i18n-ignore
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "alan";
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/**
 * Alan bu hizmette gösterilir mi? (serviceIds boşsa tüm hizmetler). Birden fazla hizmetli randevuda
 * hizmetlerden herhangi birine bağlı alan sorulur.
 */
export function fieldAppliesToService(field: CustomBookingField, serviceId: string | readonly string[]): boolean {
  const scoped = field.serviceIds;
  if (!scoped || scoped.length === 0) return true;
  const ids = typeof serviceId === "string" ? [serviceId] : serviceId;
  return ids.some((id) => scoped.includes(id));
}

export function fieldsForService(fields: CustomBookingField[], serviceId: string | readonly string[]): CustomBookingField[] {
  return fields.filter((field) => fieldAppliesToService(field, serviceId));
}

/** Firestore/callable'dan gelen bilinmeyen veriyi güvenli alan listesine çevirir (geçersiz öğeler atlanır). */
export function parseCustomFields(input: unknown): CustomBookingField[] {
  if (!Array.isArray(input)) return [];
  const result: CustomBookingField[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const type = CUSTOM_FIELD_TYPES.includes(item.type as CustomFieldType) ? item.type as CustomFieldType : null;
    const label = cleanText(item.label, LABEL_MAX);
    const id = typeof item.id === "string" && item.id ? item.id : fieldIdFromLabel(label);
    if (!type || !label) continue;
    const field: CustomBookingField = { id, label, type, required: item.required === true };
    if (typeof item.helpText === "string" && item.helpText) field.helpText = item.helpText;
    if (typeof item.placeholder === "string" && item.placeholder) field.placeholder = item.placeholder;
    if (Array.isArray(item.options)) field.options = item.options.filter((option): option is string => typeof option === "string");
    if (typeof item.min === "number") field.min = item.min;
    if (typeof item.max === "number") field.max = item.max;
    if (typeof item.maxLength === "number") field.maxLength = item.maxLength;
    if (Array.isArray(item.serviceIds)) {
      const ids = item.serviceIds.filter((value): value is string => typeof value === "string" && value.length > 0);
      if (ids.length) field.serviceIds = ids;
    }
    result.push(field);
  }
  return result;
}

export function parseCustomFieldValues(input: unknown): CustomFieldValue[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const value = item.value;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return [];
    const type = CUSTOM_FIELD_TYPES.includes(item.type as CustomFieldType) ? item.type as CustomFieldType : "text";
    return [{ id: String(item.id ?? ""), label: String(item.label ?? tk("Ek bilgi")), type, value }];
  });
}

/** "Evet" / sayı / metin. */
export function formatCustomFieldValue(value: CustomFieldValue["value"], type?: CustomFieldType, t: TFunction = interpolate, locale = "tr-TR"): string {
  if (type === "checkbox" || typeof value === "boolean") return value ? t("Evet") : t("Hayır");
  if (typeof value === "number") return value.toLocaleString(locale);
  return value;
}

/** Yeni boş alan için tür varsayılanları. */
export function withTypeDefaults(field: CustomBookingField, type: CustomFieldType, t: TFunction = interpolate): CustomBookingField {
  const next: CustomBookingField = { id: field.id, label: field.label, type, required: field.required };
  if (field.helpText) next.helpText = field.helpText;
  if (field.serviceIds?.length) next.serviceIds = field.serviceIds;
  if (type !== "select" && type !== "checkbox" && field.placeholder) next.placeholder = field.placeholder;
  if (type === "select") next.options = field.options?.length ? field.options : [t("Seçenek {number}", { number: 1 }), t("Seçenek {number}", { number: 2 })];
  if (type === "number") { next.min = field.min ?? 1; next.max = field.max ?? 10; }
  if (type === "text") next.maxLength = Math.min(field.maxLength ?? TEXT_LIMIT, TEXT_LIMIT);
  if (type === "textarea") next.maxLength = Math.min(field.maxLength ?? 300, TEXTAREA_LIMIT);
  return next;
}

/** Benzersiz id üretir (etiketten; çakışırsa _2, _3…). */
export function uniqueFieldId(label: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = fieldIdFromLabel(label).slice(0, 29);
  if (!used.has(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}_${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}_${Date.now() % 1000}`;
}

/**
 * İşletmenin alan setini sunucuya göndermeden önce denetler (sanitizeCustomFields kurallarıyla aynı).
 * Dönüş: alan index'i → hata mesajı listesi; genel hatalar "-1" anahtarında.
 */
export function validateFieldDefinitions(fields: CustomBookingField[], t: TFunction = interpolate, locale = "tr-TR"): Record<number, string[]> {
  const errors: Record<number, string[]> = {};
  const push = (index: number, message: string) => { (errors[index] ??= []).push(message); };
  if (fields.length > MAX_CUSTOM_FIELDS) push(-1, t("En fazla {count} ek alan eklenebilir.", { count: MAX_CUSTOM_FIELDS }));
  const seenIds = new Map<string, number>();
  const seenLabels = new Map<string, number>();
  fields.forEach((field, index) => {
    const label = cleanText(field.label, LABEL_MAX);
    if (label.length < LABEL_MIN) push(index, t("Alan adı en az 2 karakter olmalı."));
    const id = fieldIdFromLabel(cleanText(field.id, 32) || label);
    const labelId = fieldIdFromLabel(label).replace(/_/g, "");
    if (RESERVED_FIELD_IDS.includes(id.replace(/_/g, "")) || RESERVED_FIELD_IDS.includes(labelId)) {
      push(index, t("Bu bilgi standart formda zaten var (ad, telefon, e-posta, not)."));
    }
    const labelKey = label.toLocaleLowerCase("tr");
    if (label && (seenIds.has(id) || seenLabels.has(labelKey))) push(index, t("Aynı alan birden fazla kez eklenmiş."));
    seenIds.set(id, index);
    if (label) seenLabels.set(labelKey, index);
    if ((field.helpText ?? "").length > HELP_MAX) push(index, t("Açıklama en fazla {count} karakter olabilir.", { count: HELP_MAX }));
    if (field.type === "select") {
      const options = [...new Set((field.options ?? []).map((option) => cleanText(option, OPTION_MAX)).filter(Boolean))];
      if (options.length < OPTIONS_MIN) push(index, t("Seçim alanı için en az 2 farklı seçenek gerekli."));
      if ((field.options ?? []).length > OPTIONS_MAX) push(index, t("En fazla {count} seçenek eklenebilir.", { count: OPTIONS_MAX }));
    }
    if (field.type === "number") {
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > NUMBER_LIMIT) push(index, t("En küçük/en büyük 0–{limit} arası tam sayı olmalı.", { limit: NUMBER_LIMIT.toLocaleString(locale) }));
      else if (min > max) push(index, t("En küçük değer en büyükten büyük olamaz."));
    }
  });
  return errors;
}

/** Sunucuya gidecek temiz liste (boş/ilgisiz özellikler çıkarılır). */
export function normalizeFieldsForSubmit(fields: CustomBookingField[]): CustomBookingField[] {
  return fields.map((field) => {
    const label = cleanText(field.label, LABEL_MAX);
    const next: CustomBookingField = { id: field.id || fieldIdFromLabel(label), label, type: field.type, required: field.required === true };
    const helpText = cleanText(field.helpText, HELP_MAX);
    if (helpText) next.helpText = helpText;
    const placeholder = cleanText(field.placeholder, PLACEHOLDER_MAX);
    if (placeholder && field.type !== "select" && field.type !== "checkbox") next.placeholder = placeholder;
    if (field.type === "select") next.options = [...new Set((field.options ?? []).map((option) => cleanText(option, OPTION_MAX)).filter(Boolean))].slice(0, OPTIONS_MAX);
    if (field.type === "number") { next.min = field.min ?? 1; next.max = field.max ?? 10; }
    if (field.type === "text" || field.type === "textarea") {
      const limit = field.type === "text" ? TEXT_LIMIT : TEXTAREA_LIMIT;
      next.maxLength = Math.max(1, Math.min(limit, field.maxLength ?? limit));
    }
    if (field.serviceIds?.length) next.serviceIds = [...new Set(field.serviceIds)];
    return next;
  });
}

/** Müşterinin girdiği değeri denetler; hata yoksa null. */
export function validateFieldValue(field: CustomBookingField, raw: CustomFieldInputValues[string] | undefined, t: TFunction = interpolate): string | null {
  const empty = raw === undefined || raw === null || raw === "" || (field.type === "checkbox" && raw !== true);
  if (empty) {
    if (!field.required) return null;
    return field.type === "checkbox" ? t("Devam etmek için onaylayın.") : field.type === "select" ? t("Bir seçenek seçin.") : t("Bu alan zorunlu.");
  }
  if (field.type === "number") {
    const value = Number(raw);
    if (!Number.isInteger(value)) return t("Tam sayı girin.");
    const min = field.min ?? 0;
    const max = field.max ?? NUMBER_LIMIT;
    if (value < min || value > max) return t("{min}–{max} arasında olmalı.", { min, max });
  }
  if (field.type === "select" && !field.options?.includes(String(raw))) return t("Geçerli bir seçenek seçin.");
  if ((field.type === "text" || field.type === "textarea") && String(raw).trim().length > (field.maxLength ?? TEXT_LIMIT)) {
    return t("En fazla {count} karakter.", { count: field.maxLength });
  }
  return null;
}

/** Sunucuya gidecek değer nesnesi: yalnızca bu hizmete uygulanan, dolu alanlar. */
export function buildCustomFieldPayload(fields: CustomBookingField[], serviceId: string | readonly string[], values: CustomFieldInputValues): CustomFieldInputValues {
  const payload: CustomFieldInputValues = {};
  for (const field of fieldsForService(fields, serviceId)) {
    const raw = values[field.id];
    if (raw === undefined || raw === "") continue;
    if (field.type === "checkbox") { if (raw === true) payload[field.id] = true; continue; }
    if (field.type === "number") { payload[field.id] = Number(raw); continue; }
    payload[field.id] = typeof raw === "string" ? raw.trim() : raw;
  }
  return payload;
}

/** Müşteri özetinde gösterilecek satırlar. */
export function summarizeFieldValues(fields: CustomBookingField[], serviceId: string | readonly string[], values: CustomFieldInputValues, t: TFunction = interpolate, locale = "tr-TR"): Array<{ id: string; label: string; value: string }> {
  return fieldsForService(fields, serviceId).flatMap((field) => {
    const raw = values[field.id];
    if (raw === undefined || raw === "" || (field.type === "checkbox" && raw !== true)) return [];
    return [{ id: field.id, label: field.label, value: formatCustomFieldValue(field.type === "number" ? Number(raw) : raw, field.type, t, locale) }];
  });
}

export type FieldDiff = {
  added: CustomBookingField[];
  removed: CustomBookingField[];
  changed: Array<{ before: CustomBookingField; after: CustomBookingField; changes: string[] }>;
  reordered: boolean;
};

function sameList(a?: unknown[], b?: unknown[]) {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

/** Mevcut yayındaki alanlar ile talep edilenleri karşılaştırır (id üzerinden). */
export function diffFields(current: CustomBookingField[], next: CustomBookingField[], t: TFunction = interpolate): FieldDiff {
  const currentById = new Map(current.map((field) => [field.id, field]));
  const nextById = new Map(next.map((field) => [field.id, field]));
  const added = next.filter((field) => !currentById.has(field.id));
  const removed = current.filter((field) => !nextById.has(field.id));
  const changed: FieldDiff["changed"] = [];
  for (const after of next) {
    const before = currentById.get(after.id);
    if (!before) continue;
    const changes: string[] = [];
    if (before.label !== after.label) changes.push(t("Ad: \"{before}\" → \"{after}\"", { before: before.label, after: after.label }));
    if (before.type !== after.type) changes.push(t("Tür: {before} → {after}", { before: t(FIELD_TYPE_LABELS[before.type]), after: t(FIELD_TYPE_LABELS[after.type]) }));
    if (before.required !== after.required) changes.push(after.required ? t("Zorunlu yapıldı") : t("İsteğe bağlı yapıldı"));
    if ((before.helpText ?? "") !== (after.helpText ?? "")) changes.push(t("Açıklama değişti"));
    if ((before.placeholder ?? "") !== (after.placeholder ?? "")) changes.push(t("Örnek metin değişti"));
    if (!sameList(before.options, after.options)) changes.push(t("Seçenekler: {options}", { options: (after.options ?? []).join(", ") }));
    if (before.min !== after.min || before.max !== after.max) changes.push(t("Aralık: {before} → {after}", { before: `${before.min ?? "–"}–${before.max ?? "–"}`, after: `${after.min ?? "–"}–${after.max ?? "–"}` }));
    if (before.maxLength !== after.maxLength) changes.push(t("Karakter sınırı: {count}", { count: after.maxLength ?? "–" }));
    if (!sameList(before.serviceIds, after.serviceIds)) changes.push(after.serviceIds?.length ? t("{count} hizmete özel", { count: after.serviceIds.length }) : t("Tüm hizmetlerde"));
    if (changes.length) changed.push({ before, after, changes });
  }
  const keptCurrent = current.filter((field) => nextById.has(field.id)).map((field) => field.id);
  const keptNext = next.filter((field) => currentById.has(field.id)).map((field) => field.id);
  return { added, removed, changed, reordered: !sameList(keptCurrent, keptNext) };
}

export function sameFields(a: CustomBookingField[], b: CustomBookingField[]): boolean {
  return JSON.stringify(normalizeFieldsForSubmit(a)) === JSON.stringify(normalizeFieldsForSubmit(b));
}
