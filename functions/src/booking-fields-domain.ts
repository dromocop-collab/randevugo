// İşletmeye özel randevu formu alanları: tanım temizleme ve müşteri değeri doğrulama (saf fonksiyonlar).

export const CUSTOM_FIELD_TYPES = ["number", "select", "text", "textarea", "checkbox"] as const;
export type CustomFieldType = typeof CUSTOM_FIELD_TYPES[number];

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

export type CustomFieldValue = { id: string; label: string; type: CustomFieldType; value: string | number | boolean };

export const MAX_CUSTOM_FIELDS = 6;
export const RESERVED_FIELD_IDS = ["ad", "adsoyad", "isim", "telefon", "phone", "eposta", "email", "not", "notes"];

export class FieldValidationError extends Error {}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };

export function fieldIdFromLabel(label: string): string {
  return label.toLocaleLowerCase("tr").replace(/[çğıİöşü]/g, (char) => TR_MAP[char] ?? char)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "alan";
}

function cleanInt(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

/** İşletmenin gönderdiği alan listesini güvenli, sınırlı bir şemaya indirger; geçersizse hata atar. */
export function sanitizeCustomFields(input: unknown): CustomBookingField[] {
  if (!Array.isArray(input)) throw new FieldValidationError("Alan listesi geçersiz.");
  if (input.length > MAX_CUSTOM_FIELDS) throw new FieldValidationError(`En fazla ${MAX_CUSTOM_FIELDS} ek alan eklenebilir.`);
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  return input.map((raw, index) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const label = cleanText(item.label, 40);
    if (label.length < 2) throw new FieldValidationError(`${index + 1}. alanın adı en az 2 karakter olmalı.`);
    const type = CUSTOM_FIELD_TYPES.includes(item.type as CustomFieldType) ? item.type as CustomFieldType : null;
    if (!type) throw new FieldValidationError(`"${label}" alanının türü geçersiz.`);
    const id = fieldIdFromLabel(cleanText(item.id, 32) || label);
    if (RESERVED_FIELD_IDS.includes(id.replace(/_/g, ""))) throw new FieldValidationError(`"${label}" zaten standart formda var.`);
    const labelKey = label.toLocaleLowerCase("tr");
    if (seenIds.has(id) || seenLabels.has(labelKey)) throw new FieldValidationError(`"${label}" alanı birden fazla kez eklenmiş.`);
    seenIds.add(id);
    seenLabels.add(labelKey);

    const field: CustomBookingField = { id, label, type, required: item.required === true };
    const helpText = cleanText(item.helpText, 120);
    if (helpText) field.helpText = helpText;
    const placeholder = cleanText(item.placeholder, 60);
    if (placeholder && type !== "checkbox" && type !== "select") field.placeholder = placeholder;

    if (type === "select") {
      const options = Array.isArray(item.options)
        ? [...new Set(item.options.map((option) => cleanText(option, 40)).filter((option) => option.length > 0))].slice(0, 12)
        : [];
      if (options.length < 2) throw new FieldValidationError(`"${label}" seçim alanı için en az 2 seçenek gerekli.`);
      field.options = options;
    }
    if (type === "number") {
      const min = Math.max(0, Math.min(100_000, cleanInt(item.min) ?? 1));
      const max = Math.max(0, Math.min(100_000, cleanInt(item.max) ?? 10));
      if (min > max) throw new FieldValidationError(`"${label}" için en küçük değer en büyükten büyük olamaz.`);
      field.min = min;
      field.max = max;
    }
    if (type === "text" || type === "textarea") {
      const limit = type === "text" ? 120 : 500;
      field.maxLength = Math.max(1, Math.min(limit, cleanInt(item.maxLength) ?? limit));
    }
    if (Array.isArray(item.serviceIds)) {
      const serviceIds = [...new Set(item.serviceIds.map((value) => cleanText(value, 128)).filter(Boolean))].slice(0, 100);
      if (serviceIds.length > 0) field.serviceIds = serviceIds;
    }
    return field;
  });
}

/** Alan bu hizmette gösterilir mi? (serviceIds boşsa tüm hizmetler) */
export function fieldAppliesToService(field: CustomBookingField, serviceId: string): boolean {
  return !field.serviceIds || field.serviceIds.length === 0 || field.serviceIds.includes(serviceId);
}

/**
 * Müşterinin gönderdiği değerleri onaylı alanlara göre doğrular.
 * enforceRequired=false: alanları bilmeyen eski mobil sürümler zorunlu alan yüzünden engellenmesin.
 */
export function validateCustomFieldValues(
  fields: CustomBookingField[],
  serviceId: string,
  input: unknown,
  enforceRequired: boolean
): CustomFieldValue[] {
  const values = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  const result: CustomFieldValue[] = [];
  for (const field of fields.filter((item) => fieldAppliesToService(item, serviceId))) {
    const raw = values[field.id];
    const empty = raw === undefined || raw === null || raw === "" || (field.type === "checkbox" && raw !== true);
    if (empty) {
      if (field.required && enforceRequired) {
        throw new FieldValidationError(field.type === "checkbox" ? `"${field.label}" onaylanmalıdır.` : `"${field.label}" alanı zorunludur.`);
      }
      continue;
    }
    if (field.type === "number") {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed)) throw new FieldValidationError(`"${field.label}" tam sayı olmalıdır.`);
      if (parsed < (field.min ?? 0) || parsed > (field.max ?? 100_000)) {
        throw new FieldValidationError(`"${field.label}" ${field.min}–${field.max} arasında olmalıdır.`);
      }
      result.push({ id: field.id, label: field.label, type: field.type, value: parsed });
    } else if (field.type === "select") {
      const choice = typeof raw === "string" ? raw.trim() : "";
      if (!field.options?.includes(choice)) throw new FieldValidationError(`"${field.label}" için geçerli bir seçenek seçin.`);
      result.push({ id: field.id, label: field.label, type: field.type, value: choice });
    } else if (field.type === "checkbox") {
      result.push({ id: field.id, label: field.label, type: field.type, value: true });
    } else {
      const text = typeof raw === "string" ? raw.trim() : "";
      if (text.length > (field.maxLength ?? 120)) throw new FieldValidationError(`"${field.label}" en fazla ${field.maxLength} karakter olabilir.`);
      if (text) result.push({ id: field.id, label: field.label, type: field.type, value: text });
    }
  }
  return result;
}
