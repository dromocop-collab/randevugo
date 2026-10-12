// Mesafeli satış sözleşmesi ve iptal/iade sayfalarındaki satıcı bilgileri.
// PayTR başvurusu ve yasal zorunluluk için unvan, adres ve vergi bilgileri DOLU olmalı.
export const SELLER = {
  title: "",          // Ticari unvan / şahıs şirketi adı (ör. "Ad Soyad – SeninRandevun")
  address: "",        // Açık adres
  taxOffice: "",      // Vergi dairesi
  taxNumber: "",      // Vergi no / TCKN
  mersis: "",         // Varsa MERSİS no
  phone: "",          // Müşteri hizmetleri telefonu
  email: "info@seninrandevun.com",
} as const;

export function sellerLines(): string[] {
  return [
    SELLER.title && `Unvan: ${SELLER.title}`,
    SELLER.address && `Adres: ${SELLER.address}`,
    (SELLER.taxOffice || SELLER.taxNumber) && `Vergi dairesi / no: ${[SELLER.taxOffice, SELLER.taxNumber].filter(Boolean).join(" / ")}`,
    SELLER.mersis && `MERSİS: ${SELLER.mersis}`,
    SELLER.phone && `Telefon: ${SELLER.phone}`,
    `E-posta: ${SELLER.email}`,
  ].filter((line): line is string => Boolean(line));
}
