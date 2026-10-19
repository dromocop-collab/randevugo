import { HelpCenter } from "@/components/marketing/help-center";
import { BusinessPage } from "@/components/marketing/business-shell";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({ title: t("İşletme Randevu Sistemi Yardım Merkezi"), description: t("SeninRandevun işletme kurulumu, online randevu takvimi, çalışan, müşteri, paket, kasa, şube ve abonelik rehberlerine ulaşın."), pathname: "/isletmeler/yardim", keywords: [t("randevu sistemi yardım"), t("işletme paneli rehberi"), t("randevu programı destek"), t("SeninRandevun işletme")], locale: await getLocale() });
}

export default function Page() { return <BusinessPage><HelpCenter mode="business" /></BusinessPage>; }
