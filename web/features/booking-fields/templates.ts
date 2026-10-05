// İşletmenin tek dokunuşla ekleyebileceği hazır alanlar ve kategoriye göre öneriler.
import type { CustomBookingField } from "./booking-fields-domain";

export type BookingFieldTemplate = {
  key: string;
  /** Kart üzerinde kısa açıklama. */
  hint: string;
  emoji: string;
  field: Omit<CustomBookingField, "id">;
};

export const BLANK_TEMPLATE_KEY = "bos";

export const BOOKING_FIELD_TEMPLATES: BookingFieldTemplate[] = [
  { key: "kisi_sayisi", emoji: "👥", hint: "Grup / çift randevuları", field: { label: "Kişi sayısı", type: "number", required: true, min: 1, max: 10, helpText: "Randevuya kaç kişi geleceğini seçin." } },
  { key: "evcil_hayvan_turu", emoji: "🐾", hint: "Veteriner, pet kuaför", field: { label: "Evcil hayvan türü", type: "select", required: true, options: ["Kedi", "Köpek", "Kuş", "Diğer"] } },
  { key: "hayvanin_kilosu", emoji: "⚖️", hint: "Doz ve bakım planı için", field: { label: "Hayvanın kilosu", type: "number", required: false, min: 1, max: 100, helpText: "Yaklaşık kilo (kg)." } },
  { key: "arac_plakasi", emoji: "🚗", hint: "Servis, yıkama, bakım", field: { label: "Araç plakası", type: "text", required: true, placeholder: "34 ABC 123", maxLength: 12 } },
  { key: "arac_modeli", emoji: "🔧", hint: "Marka / model / yıl", field: { label: "Araç modeli", type: "text", required: false, placeholder: "Örn. Renault Clio 2019", maxLength: 60 } },
  { key: "sac_uzunlugu", emoji: "💇", hint: "Süre ve fiyat tahmini", field: { label: "Saç uzunluğu", type: "select", required: false, options: ["Kısa", "Orta", "Uzun"] } },
  { key: "alerji", emoji: "🌿", hint: "Ürün ve sağlık güvenliği", field: { label: "Alerji / hassasiyet", type: "textarea", required: false, placeholder: "Varsa alerjilerinizi veya hassasiyetlerinizi yazın", maxLength: 300 } },
  { key: "ilk_ziyaret", emoji: "✨", hint: "Yeni müşteriye özel ilgi", field: { label: "İlk ziyaretim", type: "checkbox", required: false, helpText: "İşletmeye ilk kez geliyorsanız işaretleyin." } },
  { key: "masaj_tercihi", emoji: "💆", hint: "Spa ve masaj salonları", field: { label: "Masaj tercihi", type: "select", required: false, options: ["Klasik", "Derin doku", "Aromaterapi"] } },
  { key: "cift_odasi", emoji: "💞", hint: "Çiftlere özel oda", field: { label: "Çift odası istiyorum", type: "checkbox", required: false } },
  { key: "dogum_gunu", emoji: "🎂", hint: "Küçük bir sürpriz hazırlayın", field: { label: "Doğum günü sürprizi", type: "checkbox", required: false, helpText: "Randevu doğum gününüze denk geliyorsa işaretleyin." } },
];

export const BLANK_TEMPLATE: BookingFieldTemplate = {
  key: BLANK_TEMPLATE_KEY, emoji: "➕", hint: "Kendi sorunuzu yazın",
  field: { label: "Yeni alan", type: "text", required: false, maxLength: 120 },
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
