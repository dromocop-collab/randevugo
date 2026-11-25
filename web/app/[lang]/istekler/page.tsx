import { MarketingPage } from "@/components/marketing/marketing-shell";
import { FeatureBoard } from "@/features/feature-requests/feature-board";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

// İstek & öneri panosu (herkese açık). Kullanıcı içeriği olduğu için arama motorlarına kapalı.
export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("İstek & Öneri Panosu"),
    description: t("Senin Randevun'da olmasını istediğin özellikleri yaz, diğer fikirlere oy ver ve yol haritasını takip et."),
    pathname: "/istekler",
    noindex: true,
    locale: await getLocale(),
  });
}

export default function Page() {
  return <MarketingPage><main><FeatureBoard variant="public" /></main></MarketingPage>;
}
