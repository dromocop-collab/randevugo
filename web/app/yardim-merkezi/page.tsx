import { HelpCenter } from "@/components/marketing/help-center";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({ title: "Online Randevu Yardım Merkezi", description: "İşletme keşfi, online randevu oluşturma, değişiklik, iptal, müşteri hesabı ve güvenlik soruları için SeninRandevun yardım merkezi.", pathname: "/yardim-merkezi", keywords: ["online randevu yardım", "randevu iptali", "randevu değiştirme", "SeninRandevun destek"] });

export default function Page() { return <MarketingPage><HelpCenter mode="customer" /></MarketingPage>; }
