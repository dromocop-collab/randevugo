"use client";

import Link from "@/i18n/link";
import { useLocale, useT } from "@/i18n/client";

/**
 * Ödeme öncesi yasal onay cümlesi. Türkçe metin hukuki metin olduğu için birebir korunur (ek yapısı —
 * "Formu'nu", "Sözleşmesi'ni" — parçalanarak çevrilemez); diğer dillerde aynı anlam çevrilmiş yapıyla verilir.
 */
export function LegalConsentText({ kind }: { kind: "plan" | "sms" }) {
  const locale = useLocale();
  const t = useT();
  if (locale === "tr") {
    // i18n-ignore — hukuki onay metni, değiştirilmeden gösterilir
    return (
      <>
        <Link href="/on-bilgilendirme-formu" target="_blank">Ön Bilgilendirme Formu</Link>&apos;nu,{" "}{/* i18n-ignore */}
        <Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi</Link>&apos;ni ve{" "}{/* i18n-ignore */}
        <Link href="/iptal-ve-iade" target="_blank">İptal ve İade Koşulları</Link>&apos;nı okudum, onaylıyorum.{" "}{/* i18n-ignore */}
        {kind === "plan"
          ? "Hizmetin ödeme anında başlamasını talep ediyorum ve bu nedenle cayma hakkımın bulunmadığını biliyorum." // i18n-ignore
          : "Kredinin ödeme anında tanımlanmasını talep ediyorum ve bu nedenle cayma hakkımın bulunmadığını biliyorum." /* i18n-ignore */}
      </>
    );
  }
  return (
    <>
      {t("Şunları okudum ve onaylıyorum:")}{" "}
      <Link href="/on-bilgilendirme-formu" target="_blank">{t("Ön Bilgilendirme Formu")}</Link>,{" "}
      <Link href="/mesafeli-satis-sozlesmesi" target="_blank">{t("Mesafeli Satış Sözleşmesi")}</Link>,{" "}
      <Link href="/iptal-ve-iade" target="_blank">{t("İptal ve İade Koşulları")}</Link>.{" "}
      {kind === "plan"
        ? t("Hizmetin ödeme anında başlamasını talep ediyorum ve bu nedenle cayma hakkımın bulunmadığını biliyorum.")
        : t("Kredinin ödeme anında tanımlanmasını talep ediyorum ve bu nedenle cayma hakkımın bulunmadığını biliyorum.")}
    </>
  );
}
