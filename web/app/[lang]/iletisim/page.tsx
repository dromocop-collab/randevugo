import { MarketingPage } from "@/components/marketing/marketing-shell";
import { ContactPage } from "@/components/marketing-pages/contact-page";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({title:t("İletişim ve Destek"),description:t("SeninRandevun işletme kurulumu, özellikler, abonelik, randevu sorunları ve müşteri desteği için e-posta ve telefon iletişim kanallarımıza kolayca ulaşın."),pathname:"/iletisim",keywords:[t("SeninRandevun iletişim"),t("randevu sistemi destek"),t("işletme kurulum desteği")],locale:await getLocale()});
}

export default function Page() {
  return <MarketingPage><ContactPage /></MarketingPage>;
}
