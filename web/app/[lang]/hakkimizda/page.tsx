import { Compass, HeartHandshake, MapPin, Sparkles, Target, Zap } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { EditorialPage } from "@/components/marketing-pages/editorial-page";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({title:t("Hakkımızda"),description:t("SeninRandevun'un Türkiye'deki hizmet işletmeleri ve randevu alan müşteriler için geliştirdiği sade, güvenli ve erişilebilir platform yaklaşımını keşfedin."),pathname:"/hakkimizda",keywords:[t("SeninRandevun hakkında"),t("online randevu platformu"),t("Türkiye randevu sistemi")],locale:await getLocale()});
}

export default async function Page() {
  const t = await getT();
  return <MarketingPage>
    <EditorialPage
      crumb={t("Hakkımızda")}
      eyebrow={t("Biz kimiz")}
      eyebrowIcon={<Sparkles size={13} aria-hidden="true" />}
      title={<>{t("İyi işlerin zamanı")}<br /><em>{t("kaybolmasın diye buradayız.")}</em></>}
      intro={t("Türkiye'deki hizmet işletmelerinin teknolojiyle değil, müşterileriyle ilgilenebilmesi için sade ve güçlü araçlar geliştiriyoruz.")}
      highlights={[
        { icon: <Target size={19} aria-hidden="true" />, title: t("Erişilebilir"), text: t("Profesyonel randevu yönetimi her ölçekte işletmeye.") },
        { icon: <Zap size={19} aria-hidden="true" />, title: t("Sade ve hızlı"), text: t("Her ekran bir işi hızlandırmalı.") },
        { icon: <MapPin size={19} aria-hidden="true" />, title: t("Türkiye için"), text: t("Yerel alışkanlıklar ve KVKK merkezde.") },
      ]}
      tocLabel={t("Bu sayfada")}
      sections={[
        { id: "misyonumuz", icon: <Target size={21} aria-hidden="true" />, title: t("Misyonumuz"), body: <p>{t("Küçük ve büyüyen işletmeler için profesyonel randevu ve müşteri yönetimini erişilebilir hale getirmek.")}</p> },
        { id: "nasil-dusunuyoruz", icon: <Compass size={21} aria-hidden="true" />, title: t("Nasıl düşünüyoruz"), body: <p>{t("Her ekranın bir işi hızlandırması, her otomasyonun gerçek bir yükü ortadan kaldırması ve müşterinin her adımda güvende hissetmesi gerektiğine inanıyoruz.")}</p> },
        { id: "turkiye-icin-tasarlandi", icon: <HeartHandshake size={21} aria-hidden="true" />, title: t("Türkiye için tasarlandı"), body: <p>{t("Yerel işletme alışkanlıklarını, mobil kullanım biçimlerini ve KVKK sorumluluklarını merkeze alan bir ürün geliştiriyoruz.")}</p> },
      ]}
      related={[
        { href: "/ozellikler", label: t("Özellikler"), text: t("İşletme panelinde neler var?") },
        { href: "/guvenlik", label: t("Güvenlik"), text: t("Verilerinizi nasıl koruyoruz?") },
        { href: "/iletisim", label: t("İletişim"), text: t("Bize ulaşın.") },
      ]}
      cta={{ title: <>{t("İşletmenizi bugünden")}<br /><em>{t("daha akıllı yönetin.")}</em></>, text: t("Çalışma alanınızı dakikalar içinde açın; ilk ay bizden."), primary: { href: "/isletmeler/kayit", label: t("İlk ay ücretsiz başla") }, secondary: { href: "/kesfet", label: t("İşletme keşfet") } }}
    />
  </MarketingPage>;
}
