// Ön bilgilendirme formu, mesafeli satış sözleşmesi ve iptal/iade sayfalarındaki satıcı bilgileri.
// Gerçek kişi tacirin ticari unvanı ad-soyadını içermelidir (TTK m.40).
// Saf modül (istemci de içe aktarır): çeviri fonksiyonu parametre olarak gelir; ad/adres gibi kimlik verisi çevrilmez.
import { interpolate, tk, type TFunction } from "@/i18n/config";

export const SELLER = {
  title: "Muhammet Cihat Erdem – Senin Randevun",
  owner: "Muhammet Cihat Erdem",
  brand: "SeninRandevun",
  address: "Akarca Mah. Yunus Nadi Cad. No: 8, Fethiye / Muğla", // i18n-ignore
  taxOffice: "Fethiye",
  taxNumber: "",      // BİLEREK BOŞ: şahıs şirketinde VKN = TCKN, herkese açık sayfada yayımlanmaz (faturada yer alır)
  mersis: "",
  phone: "0530 478 82 98",
  email: "info@seninrandevun.com",
  website: "https://seninrandevun.com",
} as const;

/** Sözleşme sürümü: metin esaslı değiştiğinde güncellenir, ödeme kaydına yazılır (delil). */
export const TERMS_VERSION = "2026-10-12";
/** Gösterirken t(TERMS_DATE_LABEL) ile çevrilir. */
export const TERMS_DATE_LABEL = tk("12 EKİM 2026");

export function sellerLines(t: TFunction = interpolate): string[] {
  return [
    t("Ticari unvan: {value}", { value: SELLER.title }),
    t("İşletme sahibi: {value}", { value: SELLER.owner }),
    SELLER.address && t("Adres: {value}", { value: SELLER.address }),
    SELLER.taxNumber
      ? t("Vergi dairesi / no: {value}", { value: [SELLER.taxOffice, SELLER.taxNumber].filter(Boolean).join(" / ") })
      : t("Vergi dairesi: {value}", { value: SELLER.taxOffice }),
    SELLER.mersis && t("MERSİS: {value}", { value: SELLER.mersis }),
    t("Telefon: {value}", { value: SELLER.phone }),
    t("E-posta: {value}", { value: SELLER.email }),
    t("İnternet sitesi: {value}", { value: SELLER.website }),
  ].filter((line): line is string => Boolean(line));
}
