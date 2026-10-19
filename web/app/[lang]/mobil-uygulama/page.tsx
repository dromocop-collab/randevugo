import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { MobileAppPage as MobileAppContent } from "@/components/marketing-pages/mobile-app-page";
import { APP_STORE_URL, PLAY_STORE_AVAILABLE } from "@/lib/app-store";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";
import { localizeHref } from "@/i18n/config";

const SITE_URL = "https://seninrandevun.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return createPublicMetadata({
    title: t("Mobil Randevu Uygulaması (iPhone ve Android)"),
    description: PLAY_STORE_AVAILABLE
      ? t("Yakınındaki işletmeleri keşfet, gerçek müsaitlikleri gör, randevularını iPhone ve Android telefonundan kolayca oluştur ve takip et. SeninRandevun iPhone için App Store'da, Android için Google Play'de.")
      : t("Yakınındaki işletmeleri keşfet, gerçek müsaitlikleri gör, randevularını iPhone ve Android telefonundan kolayca oluştur ve takip et. SeninRandevun iPhone için App Store'da, Android için Google Play'de çok yakında."),
    pathname: "/mobil-uygulama",
    keywords: [t("SeninRandevun uygulaması"), t("mobil randevu uygulaması"), t("iPhone randevu uygulaması"), t("Android randevu uygulaması"), t("App Store randevu uygulaması"), t("mobil randevu al")],
    imageAlt: t("SeninRandevun iPhone ve Android randevu uygulaması"),
    locale: await getLocale(),
  });
}

export default async function MobileAppPage() {
  const t = await getT();
  const pageUrl = `${SITE_URL}${localizeHref("/mobil-uygulama", await getLocale())}`;
  const schema = { "@context":"https://schema.org", "@type":"MobileApplication", name:"SeninRandevun", operatingSystem:"iOS, iPadOS, Android", applicationCategory:"LifestyleApplication", description:t("İşletme keşfi ve online randevu yönetimi mobil uygulaması."), url:pageUrl, downloadUrl:APP_STORE_URL, image:`${SITE_URL}/icon-512.png`, offers:{"@type":"Offer",price:"0",priceCurrency:"TRY"}, publisher:{"@type":"Organization",name:"SeninRandevun",url:SITE_URL} };
  return <MarketingPage>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
    <MobileAppContent />
  </MarketingPage>;
}
