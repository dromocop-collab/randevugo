// İşletmenin tek dokunuşla ekleyebileceği hazır alanlar ve kategoriye göre öneriler.
import type { CustomBookingField } from "./booking-fields-domain";
import { tk, type TFunction } from "../../i18n/config.ts";

export type BookingFieldTemplate = {
  key: string;
  /** Kart üzerinde kısa açıklama. */
  hint: string;
  emoji: string;
  field: Omit<CustomBookingField, "id">;
};

export const BLANK_TEMPLATE_KEY = "bos";

export const BOOKING_FIELD_TEMPLATES: BookingFieldTemplate[] = [
  { key: "kisi_sayisi", emoji: "👥", hint: tk("Grup / çift randevuları"), field: { label: tk("Kişi sayısı"), type: "number", required: true, min: 1, max: 10, helpText: tk("Randevuya kaç kişi geleceğini seçin.") } },
  { key: "evcil_hayvan_turu", emoji: "🐾", hint: tk("Veteriner, pet kuaför"), field: { label: tk("Evcil hayvan türü"), type: "select", required: true, options: [tk("Kedi"), tk("Köpek"), tk("Kuş"), tk("Diğer")] } },
  { key: "hayvanin_kilosu", emoji: "⚖️", hint: tk("Doz ve bakım planı için"), field: { label: tk("Hayvanın kilosu"), type: "number", required: false, min: 1, max: 100, helpText: tk("Yaklaşık kilo (kg).") } },
  { key: "arac_plakasi", emoji: "🚗", hint: tk("Servis, yıkama, bakım"), field: { label: tk("Araç plakası"), type: "text", required: true, placeholder: "34 ABC 123", maxLength: 12 } },
  { key: "arac_modeli", emoji: "🔧", hint: tk("Marka / model / yıl"), field: { label: tk("Araç modeli"), type: "text", required: false, placeholder: tk("Örn. Renault Clio 2019"), maxLength: 60 } },
  { key: "sac_uzunlugu", emoji: "💇", hint: tk("Süre ve fiyat tahmini"), field: { label: tk("Saç uzunluğu"), type: "select", required: false, options: [tk("Kısa"), tk("Orta"), tk("Uzun")] } },
  { key: "alerji", emoji: "🌿", hint: tk("Ürün ve sağlık güvenliği"), field: { label: tk("Alerji / hassasiyet"), type: "textarea", required: false, placeholder: tk("Varsa alerjilerinizi veya hassasiyetlerinizi yazın"), maxLength: 300 } },
  { key: "ilk_ziyaret", emoji: "✨", hint: tk("Yeni müşteriye özel ilgi"), field: { label: tk("İlk ziyaretim"), type: "checkbox", required: false, helpText: tk("İşletmeye ilk kez geliyorsanız işaretleyin.") } },
  { key: "masaj_tercihi", emoji: "💆", hint: tk("Spa ve masaj salonları"), field: { label: tk("Masaj tercihi"), type: "select", required: false, options: [tk("Klasik"), tk("Derin doku"), tk("Aromaterapi")] } },
  { key: "cift_odasi", emoji: "💞", hint: tk("Çiftlere özel oda"), field: { label: tk("Çift odası istiyorum"), type: "checkbox", required: false } },
  { key: "dogum_gunu", emoji: "🎂", hint: tk("Küçük bir sürpriz hazırlayın"), field: { label: tk("Doğum günü sürprizi"), type: "checkbox", required: false, helpText: tk("Randevu doğum gününüze denk geliyorsa işaretleyin.") } },
];

export const BLANK_TEMPLATE: BookingFieldTemplate = {
  key: BLANK_TEMPLATE_KEY, emoji: "➕", hint: tk("Kendi sorunuzu yazın"),
  field: { label: tk("Yeni alan"), type: "text", required: false, maxLength: 120 },
};

/** Kategori (kanonik slug) → önerilen şablon anahtarları. */
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  spa: ["kisi_sayisi", "masaj_tercihi", "cift_odasi", "alerji"],
  guzellik: ["alerji", "ilk_ziyaret", "kisi_sayisi"],
  kuafor: ["sac_uzunlugu", "alerji", "ilk_ziyaret"],
  berber: ["sac_uzunlugu", "ilk_ziyaret"],
  nail: ["alerji", "ilk_ziyaret"],
  veteriner: ["evcil_hayvan_turu", "hayvanin_kilosu", "ilk_ziyaret"],
  servis: ["arac_plakasi", "arac_modeli"],
  spor: ["kisi_sayisi", "ilk_ziyaret"],
  saglik: ["alerji", "ilk_ziyaret"],
  danismanlik: ["ilk_ziyaret"],
  egitim: ["kisi_sayisi", "ilk_ziyaret"],
  restoran: ["kisi_sayisi", "dogum_gunu", "alerji"],
  kafe: ["kisi_sayisi", "dogum_gunu"],
};

const DEFAULT_SUGGESTIONS = ["kisi_sayisi", "ilk_ziyaret", "dogum_gunu"];

export function suggestedTemplates(category: string | null | undefined): BookingFieldTemplate[] {
  const keys = CATEGORY_SUGGESTIONS[String(category ?? "")] ?? DEFAULT_SUGGESTIONS;
  return keys.map((key) => BOOKING_FIELD_TEMPLATES.find((template) => template.key === key)).filter((item): item is BookingFieldTemplate => Boolean(item));
}

/**
 * Şablon metinlerini (etiket, açıklama, örnek, seçenekler) arayüz diline çevirir.
 * İşletme şablonu eklediğinde bu metinler onun verisi olur; sonra serbestçe düzenleyebilir.
 */
export function localizeTemplateField(field: Omit<CustomBookingField, "id">, t: TFunction): Omit<CustomBookingField, "id"> {
  const next = { ...field, label: t(field.label) };
  if (field.helpText) next.helpText = t(field.helpText);
  if (field.placeholder) next.placeholder = t(field.placeholder);
  if (field.options) next.options = field.options.map((option) => t(option));
  return next;
}
