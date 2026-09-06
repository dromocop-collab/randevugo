import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Apple, ArrowRight, BadgeCheck, BellRing, CalendarCheck2, Heart, MapPin, ShieldCheck, Sparkles, Star, WifiOff } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { AppStoreButton } from "@/components/marketing/app-store-button";
import { IosAppVisual } from "@/components/marketing/ios-app-visual";
import { APP_STORE_URL } from "@/lib/app-store";

const SITE_URL = "https://seninrandevun.com";

export const metadata: Metadata = {
  title: "SeninRandevun iOS Uygulaması | App Store'dan İndir",
  description: "Yakınındaki işletmeleri keşfet, gerçek müsaitlikleri gör, randevularını iPhone ve iPad üzerinden kolayca oluştur ve takip et. SeninRandevun şimdi App Store'da.",
  alternates: { canonical: `${SITE_URL}/mobil-uygulama` },
  keywords: ["SeninRandevun uygulaması", "iOS randevu uygulaması", "iPhone randevu", "App Store randevu uygulaması", "mobil randevu al"],
  openGraph: { title: "SeninRandevun artık App Store'da", description: "İyi hizmetleri keşfet, uygun saati seç ve randevunu mobil uygulamadan yönet.", url: `${SITE_URL}/mobil-uygulama`, type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "SeninRandevun iOS Uygulaması", description: "Randevunun en kolay hâli artık iPhone ve iPad'de.", images: ["/og.png"] },
};

const features = [
  { icon: MapPin, title: "Yakınındakileri keşfet", text: "Şehrindeki doğrulanmış işletmeleri kategori, hizmet ve konuma göre bul." },
  { icon: CalendarCheck2, title: "Gerçek müsaitliği gör", text: "Telefonla saat sormadan hizmeti, uzmanı ve sana uyan zamanı seç." },
  { icon: BellRing, title: "Randevunu kaçırma", text: "Yaklaşan planlarını tek yerde takip et, önemli detaylara anında ulaş." },
  { icon: Heart, title: "Favorilerin yanında", text: "Beğendiğin işletmelere ve daha önce seçtiğin hizmetlere kolayca dön." },
  { icon: Star, title: "Güvenle karar ver", text: "Gerçek değerlendirmeler ve ayrıntılı işletme profilleriyle karşılaştır." },
  { icon: ShieldCheck, title: "Güvenli mobil deneyim", text: "Hesabın ve randevu akışın güvenli altyapıyla tüm cihazlarında senkron." },
];

export default function MobileAppPage() {
  const schema = { "@context":"https://schema.org", "@type":"MobileApplication", name:"SeninRandevun", operatingSystem:"iOS, iPadOS", applicationCategory:"LifestyleApplication", description:"İşletme keşfi ve online randevu yönetimi mobil uygulaması.", url:`${SITE_URL}/mobil-uygulama`, downloadUrl:APP_STORE_URL, image:`${SITE_URL}/icon-512.png`, offers:{"@type":"Offer",price:"0",priceCurrency:"TRY"}, publisher:{"@type":"Organization",name:"SeninRandevun",url:SITE_URL} };
  return <MarketingPage>
    <main className="ios-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
      <section className="ios-page-hero"><div className="ios-page-grid"/><div className="ios-page-copy"><nav><Link href="/">Ana Sayfa</Link><span>/</span><b>iOS Uygulaması</b></nav><span className="ios-launch-badge"><Apple size={14} fill="currentColor"/> APP STORE&apos;DA YAYINDA <i/></span><h1>Randevunun en kolay hâli,<br/><em>artık cebinde.</em></h1><p>Yakınındaki iyi hizmetleri keşfet, canlı müsaitlikleri karşılaştır ve randevularını iPhone veya iPad&apos;inden yönet.</p><div className="ios-page-actions"><AppStoreButton/><Link href="/kesfet">Önce web&apos;de keşfet <ArrowRight size={16}/></Link></div><div className="ios-page-trust"><span><BadgeCheck size={14}/> Apple onaylı</span><span><ShieldCheck size={14}/> Güvenli hesap</span><span><WifiOff size={14}/> Her an yanında</span></div></div><IosAppVisual/></section>
      <section className="ios-proof-line"><span><b>ÜCRETSİZ</b><small>Müşteriler için</small></span><span><b>iPHONE + iPAD</b><small>Tek akıcı deneyim</small></span><span><b>7/24</b><small>Keşif ve randevu</small></span><span><b>CANLI</b><small>Gerçek müsaitlik</small></span></section>
      <section className="ios-feature-section"><header><span><Sparkles size={14}/> MOBİLDE HER ŞEY DAHA YAKIN</span><h2>Planını değil,<br/><em>anını yaşa.</em></h2><p>Keşiften randevu sonrasına kadar ihtiyacın olan bütün adımlar tek, hızlı ve modern deneyimde.</p></header><div>{features.map(({icon:Icon,title,text},index)=><article key={title}><i>0{index+1}</i><span><Icon size={20}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="ios-download-final"><div><Image src="/icon-192.png" alt="SeninRandevun uygulama ikonu" width={86} height={86}/><span><small>iOS · iPadOS</small><b>SeninRandevun</b></span></div><h2>İyi hizmetlere<br/>bir dokunuş daha yakın.</h2><p>Uygulamayı ücretsiz indir, sana uygun işletmeyi keşfet ve ilk randevunu oluştur.</p><AppStoreButton/><small>App Store kullanılabilirliği ülke ve cihazınıza göre değişebilir.</small></section>
    </main>
  </MarketingPage>;
}

