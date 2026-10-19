import { HelpCenter } from "@/components/marketing/help-center";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({ title: t("Online Randevu Yardım Merkezi"), description: t("İşletme keşfi, online randevu oluşturma, değişiklik, iptal, müşteri hesabı ve güvenlik soruları için SeninRandevun yardım merkezi."), pathname: "/yardim-merkezi", keywords: [t("online randevu yardım"), t("randevu iptali"), t("randevu değiştirme"), t("SeninRandevun destek")], locale: await getLocale() });
}

export default function Page() { return <MarketingPage><HelpCenter mode="customer" /></MarketingPage>; }
