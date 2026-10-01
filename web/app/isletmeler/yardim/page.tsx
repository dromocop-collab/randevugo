import { HelpCenter } from "@/components/marketing/help-center";
import { BusinessPage } from "@/components/marketing/business-shell";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({ title: "İşletme Randevu Sistemi Yardım Merkezi", description: "SeninRandevun işletme kurulumu, online randevu takvimi, çalışan, müşteri, paket, kasa, şube ve abonelik rehberlerine ulaşın.", pathname: "/isletmeler/yardim", keywords: ["randevu sistemi yardım", "işletme paneli rehberi", "randevu programı destek", "SeninRandevun işletme"] });

export default function Page() { return <BusinessPage><HelpCenter mode="business" /></BusinessPage>; }
