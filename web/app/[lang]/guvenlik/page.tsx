import { BellRing, Building2, KeyRound, Lock, ShieldCheck, Shrink } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { EditorialPage } from "@/components/marketing-pages/editorial-page";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({title:t("Veri Güvenliği ve Erişim Kontrolü"),description:t("SeninRandevun'un şifreli veri aktarımı, rol bazlı erişim, işletme izolasyonu ve iş sürekliliği yaklaşımını inceleyin."),pathname:"/guvenlik",keywords:[t("randevu sistemi güvenliği"),t("veri güvenliği"),t("rol bazlı erişim"),t("KVKK uyumlu randevu sistemi")],locale:await getLocale()});
}

export default async function Page() {
  const t = await getT();
  return <MarketingPage>
    <EditorialPage
      crumb={t("Güvenlik")}
      eyebrow={t("Güvenlik")}
      eyebrowIcon={<ShieldCheck size={13} aria-hidden="true" />}
      title={<>{t("İşletme veriniz")}<br /><em>{t("işiniz kadar değerlidir.")}</em></>}
      intro={t("Veri erişimini sınırlandıran, güvenli aktarımı ve operasyon sürekliliğini destekleyen katmanlı bir yaklaşım kullanıyoruz.")}
      highlights={[
        { icon: <KeyRound size={19} aria-hidden="true" />, title: t("Rol bazlı erişim"), text: t("Her ekip üyesi yalnızca yetkisi kadarını görür.") },
        { icon: <Building2 size={19} aria-hidden="true" />, title: t("İşletme izolasyonu"), text: t("Veriler işletme üyeliğine bağlı kurallarla korunur.") },
        { icon: <Lock size={19} aria-hidden="true" />, title: t("Şifreli aktarım"), text: t("Uygulama trafiği şifreli bağlantılarla yürür.") },
      ]}
      tocLabel={t("Güvenlik katmanları")}
      sections={[
        { id: "erisim-kontrolu", icon: <KeyRound size={21} aria-hidden="true" />, title: t("Erişim kontrolü"), body: <p>{t("İşletme verileri kullanıcı ve işletme üyeliğine bağlı erişim kurallarıyla korunur. Platform yönetimi ayrı yetki katmanındadır.")}</p>, points: [t("İşletme Sahibi, Yönetici, Müdür ve Çalışan rolleri"), t("Çalışanlar yalnızca kendi randevu ve takvimini görür"), t("Platform yönetimi ayrı yetki katmanında")] },
        { id: "aktarim-ve-altyapi", icon: <Lock size={21} aria-hidden="true" />, title: t("Aktarım ve altyapı"), body: <p>{t("Uygulama trafiği şifreli bağlantılar üzerinden yürütülür; yönetilen bulut servisleriyle ölçeklenebilir ve izlenebilir bir altyapı kullanılır.")}</p> },
        { id: "veri-minimizasyonu", icon: <Shrink size={21} aria-hidden="true" />, title: t("Veri minimizasyonu"), body: <p>{t("Hizmeti sunmak için gerekli bilgileri işler, hassas verilere erişimi işlev ve rol düzeyinde sınırlandırırız.")}</p> },
        { id: "olay-bildirimi", icon: <BellRing size={21} aria-hidden="true" />, title: t("Olay bildirimi"), body: <p>{t("Güvenlikle ilgili bir bulgunuz varsa")} <a href="mailto:info@seninrandevun.com?subject=G%C3%BCvenlik">info@seninrandevun.com</a> {t("adresine konu satırında Güvenlik yazarak iletebilirsiniz.")}</p> },
      ]}
      related={[
        { href: "/kvkk", label: t("KVKK Aydınlatma Metni"), text: t("Haklarınız ve başvuru yolları.") },
        { href: "/gizlilik", label: t("Gizlilik Politikası"), text: t("Bilgileriniz nasıl işlenir?") },
        { href: "/iletisim", label: t("İletişim"), text: t("Sorularınız için bize ulaşın.") },
      ]}
    />
  </MarketingPage>;
}
