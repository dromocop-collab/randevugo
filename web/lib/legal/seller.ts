// Ön bilgilendirme formu, mesafeli satış sözleşmesi ve iptal/iade sayfalarındaki satıcı bilgileri.
// Gerçek kişi tacirin ticari unvanı ad-soyadını içermelidir (TTK m.40).
export const SELLER = {
  title: "Muhammet Cihat Erdem – Senin Randevun",
  owner: "Muhammet Cihat Erdem",
  brand: "SeninRandevun",
  address: "Akarca Mah. Yunus Nadi Cad. No: 8, Fethiye / Muğla",
  taxOffice: "Fethiye",
  taxNumber: "",      // BİLEREK BOŞ: şahıs şirketinde VKN = TCKN, herkese açık sayfada yayımlanmaz (faturada yer alır)
  mersis: "",
  phone: "0530 478 82 98",
  email: "info@seninrandevun.com",
  website: "https://seninrandevun.com",
} as const;

/** Sözleşme sürümü: metin esaslı değiştiğinde güncellenir, ödeme kaydına yazılır (delil). */
export const TERMS_VERSION = "2026-10-12";
export const TERMS_DATE_LABEL = "12 EKİM 2026";

export function sellerLines(): string[] {
  return [
    `Ticari unvan: ${SELLER.title}`,
    `İşletme sahibi: ${SELLER.owner}`,
    SELLER.address && `Adres: ${SELLER.address}`,
    `Vergi dairesi${SELLER.taxNumber ? " / no" : ""}: ${[SELLER.taxOffice, SELLER.taxNumber].filter(Boolean).join(" / ")}`,
    SELLER.mersis && `MERSİS: ${SELLER.mersis}`,
    `Telefon: ${SELLER.phone}`,
    `E-posta: ${SELLER.email}`,
    `İnternet sitesi: ${SELLER.website}`,
  ].filter((line): line is string => Boolean(line));
}
