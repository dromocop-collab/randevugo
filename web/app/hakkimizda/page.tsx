import { Compass, HeartHandshake, MapPin, Sparkles, Target, Zap } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { EditorialPage } from "@/components/marketing-pages/editorial-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata=createPublicMetadata({title:"Hakkımızda",description:"SeninRandevun'un Türkiye'deki hizmet işletmeleri ve randevu alan müşteriler için geliştirdiği sade, güvenli ve erişilebilir platform yaklaşımını keşfedin.",pathname:"/hakkimizda",keywords:["SeninRandevun hakkında","online randevu platformu","Türkiye randevu sistemi"]});

export default function Page() {
  return <MarketingPage>
    <EditorialPage
      crumb="Hakkımızda"
      eyebrow="Biz kimiz"
      eyebrowIcon={<Sparkles size={13} aria-hidden="true" />}
      title={<>İyi işlerin zamanı<br /><em>kaybolmasın diye buradayız.</em></>}
      intro="Türkiye'deki hizmet işletmelerinin teknolojiyle değil, müşterileriyle ilgilenebilmesi için sade ve güçlü araçlar geliştiriyoruz."
      highlights={[
        { icon: <Target size={19} aria-hidden="true" />, title: "Erişilebilir", text: "Profesyonel randevu yönetimi her ölçekte işletmeye." },
        { icon: <Zap size={19} aria-hidden="true" />, title: "Sade ve hızlı", text: "Her ekran bir işi hızlandırmalı." },
        { icon: <MapPin size={19} aria-hidden="true" />, title: "Türkiye için", text: "Yerel alışkanlıklar ve KVKK merkezde." },
      ]}
      tocLabel="Bu sayfada"
      sections={[
        { id: "misyonumuz", icon: <Target size={21} aria-hidden="true" />, title: "Misyonumuz", body: <p>Küçük ve büyüyen işletmeler için profesyonel randevu ve müşteri yönetimini erişilebilir hale getirmek.</p> },
        { id: "nasil-dusunuyoruz", icon: <Compass size={21} aria-hidden="true" />, title: "Nasıl düşünüyoruz", body: <p>Her ekranın bir işi hızlandırması, her otomasyonun gerçek bir yükü ortadan kaldırması ve müşterinin her adımda güvende hissetmesi gerektiğine inanıyoruz.</p> },
        { id: "turkiye-icin-tasarlandi", icon: <HeartHandshake size={21} aria-hidden="true" />, title: "Türkiye için tasarlandı", body: <p>Yerel işletme alışkanlıklarını, mobil kullanım biçimlerini ve KVKK sorumluluklarını merkeze alan bir ürün geliştiriyoruz.</p> },
      ]}
      related={[
        { href: "/ozellikler", label: "Özellikler", text: "İşletme panelinde neler var?" },
        { href: "/guvenlik", label: "Güvenlik", text: "Verilerinizi nasıl koruyoruz?" },
        { href: "/iletisim", label: "İletişim", text: "Bize ulaşın." },
      ]}
      cta={{ title: <>İşletmenizi bugünden<br /><em>daha akıllı yönetin.</em></>, text: "Çalışma alanınızı dakikalar içinde açın; ilk 3 ay bizden.", primary: { href: "/isletmeler/kayit", label: "İlk 3 ay ücretsiz başla" }, secondary: { href: "/kesfet", label: "İşletme keşfet" } }}
    />
  </MarketingPage>;
}
