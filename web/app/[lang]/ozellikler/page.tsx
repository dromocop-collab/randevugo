import { BusinessPage } from "@/components/marketing/business-shell";
import { FeaturesPage } from "@/components/marketing-pages/features-page";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({title:t("Randevu Sistemi Özellikleri"),description:t("Akıllı takvim, müşteri takibi, çalışan yönetimi, paket ve seans, kasa, şube ve online randevu özelliklerini tek işletme panelinde keşfedin."),pathname:"/ozellikler",keywords:[t("online randevu sistemi özellikleri"),t("randevu takip programı"),t("müşteri takip sistemi"),t("çalışan randevu takvimi"),t("seans paket takibi"),t("işletme yönetim yazılımı")],locale:await getLocale()});
}

export default function Page() {
  return <BusinessPage><FeaturesPage /></BusinessPage>;
}
