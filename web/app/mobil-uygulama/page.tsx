import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { MobileAppPage as MobileAppContent } from "@/components/marketing-pages/mobile-app-page";
import { APP_STORE_URL, PLAY_STORE_AVAILABLE } from "@/lib/app-store";
import { createPublicMetadata } from "@/lib/seo/metadata";

const SITE_URL = "https://seninrandevun.com";

export const metadata: Metadata = createPublicMetadata({
  title: "Mobil Randevu Uygulaması (iPhone ve Android)",
  description: `Yakınındaki işletmeleri keşfet, gerçek müsaitlikleri gör, randevularını iPhone ve Android telefonundan kolayca oluştur ve takip et. SeninRandevun iPhone için App Store'da, Android için ${PLAY_STORE_AVAILABLE ? "Google Play'de" : "Google Play'de çok yakında"}.`,
  pathname: "/mobil-uygulama",
  keywords: ["SeninRandevun uygulaması", "mobil randevu uygulaması", "iPhone randevu uygulaması", "Android randevu uygulaması", "App Store randevu uygulaması", "mobil randevu al"],
  imageAlt: "SeninRandevun iPhone ve Android randevu uygulaması",
});

export default function MobileAppPage() {
  const schema = { "@context":"https://schema.org", "@type":"MobileApplication", name:"SeninRandevun", operatingSystem:"iOS, iPadOS, Android", applicationCategory:"LifestyleApplication", description:"İşletme keşfi ve online randevu yönetimi mobil uygulaması.", url:`${SITE_URL}/mobil-uygulama`, downloadUrl:APP_STORE_URL, image:`${SITE_URL}/icon-512.png`, offers:{"@type":"Offer",price:"0",priceCurrency:"TRY"}, publisher:{"@type":"Organization",name:"SeninRandevun",url:SITE_URL} };
  return <MarketingPage>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
    <MobileAppContent />
  </MarketingPage>;
}
