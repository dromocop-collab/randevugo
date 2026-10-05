import { MarketingPage } from "@/components/marketing/marketing-shell";
import { ContactPage } from "@/components/marketing-pages/contact-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata=createPublicMetadata({title:"İletişim ve Destek",description:"SeninRandevun işletme kurulumu, özellikler, abonelik, randevu sorunları ve müşteri desteği için e-posta ve telefon iletişim kanallarımıza kolayca ulaşın.",pathname:"/iletisim",keywords:["SeninRandevun iletişim","randevu sistemi destek","işletme kurulum desteği"]});

export default function Page() {
  return <MarketingPage><ContactPage /></MarketingPage>;
}
