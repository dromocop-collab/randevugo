import { BusinessPage } from "@/components/marketing/business-shell";
import { FeaturesPage } from "@/components/marketing-pages/features-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata=createPublicMetadata({title:"Randevu Sistemi Özellikleri",description:"Akıllı takvim, müşteri takibi, çalışan yönetimi, paket ve seans, kasa, şube ve online randevu özelliklerini tek işletme panelinde keşfedin.",pathname:"/ozellikler",keywords:["online randevu sistemi özellikleri","randevu takip programı","müşteri takip sistemi","çalışan randevu takvimi","seans paket takibi","işletme yönetim yazılımı"]});

export default function Page() {
  return <BusinessPage><FeaturesPage /></BusinessPage>;
}
