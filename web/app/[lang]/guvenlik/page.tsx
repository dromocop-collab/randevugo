import { BellRing, Building2, KeyRound, Lock, ShieldCheck, Shrink } from "lucide-react";
import { MarketingPage } from "@/components/marketing/marketing-shell";
import { EditorialPage } from "@/components/marketing-pages/editorial-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata=createPublicMetadata({title:"Veri Güvenliği ve Erişim Kontrolü",description:"SeninRandevun'un şifreli veri aktarımı, rol bazlı erişim, işletme izolasyonu ve iş sürekliliği yaklaşımını inceleyin.",pathname:"/guvenlik",keywords:["randevu sistemi güvenliği","veri güvenliği","rol bazlı erişim","KVKK uyumlu randevu sistemi"]});

export default function Page() {
  return <MarketingPage>
    <EditorialPage
      crumb="Güvenlik"
      eyebrow="Güvenlik"
      eyebrowIcon={<ShieldCheck size={13} aria-hidden="true" />}
      title={<>İşletme veriniz<br /><em>işiniz kadar değerlidir.</em></>}
      intro="Veri erişimini sınırlandıran, güvenli aktarımı ve operasyon sürekliliğini destekleyen katmanlı bir yaklaşım kullanıyoruz."
      highlights={[
        { icon: <KeyRound size={19} aria-hidden="true" />, title: "Rol bazlı erişim", text: "Her ekip üyesi yalnızca yetkisi kadarını görür." },
        { icon: <Building2 size={19} aria-hidden="true" />, title: "İşletme izolasyonu", text: "Veriler işletme üyeliğine bağlı kurallarla korunur." },
        { icon: <Lock size={19} aria-hidden="true" />, title: "Şifreli aktarım", text: "Uygulama trafiği şifreli bağlantılarla yürür." },
      ]}
      tocLabel="Güvenlik katmanları"
      sections={[
        { id: "erisim-kontrolu", icon: <KeyRound size={21} aria-hidden="true" />, title: "Erişim kontrolü", body: <p>İşletme verileri kullanıcı ve işletme üyeliğine bağlı erişim kurallarıyla korunur. Platform yönetimi ayrı yetki katmanındadır.</p>, points: ["İşletme Sahibi, Yönetici, Müdür ve Çalışan rolleri", "Çalışanlar yalnızca kendi randevu ve takvimini görür", "Platform yönetimi ayrı yetki katmanında"] },
        { id: "aktarim-ve-altyapi", icon: <Lock size={21} aria-hidden="true" />, title: "Aktarım ve altyapı", body: <p>Uygulama trafiği şifreli bağlantılar üzerinden yürütülür; yönetilen bulut servisleriyle ölçeklenebilir ve izlenebilir bir altyapı kullanılır.</p> },
        { id: "veri-minimizasyonu", icon: <Shrink size={21} aria-hidden="true" />, title: "Veri minimizasyonu", body: <p>Hizmeti sunmak için gerekli bilgileri işler, hassas verilere erişimi işlev ve rol düzeyinde sınırlandırırız.</p> },
        { id: "olay-bildirimi", icon: <BellRing size={21} aria-hidden="true" />, title: "Olay bildirimi", body: <p>Güvenlikle ilgili bir bulgunuz varsa <a href="mailto:info@seninrandevun.com?subject=G%C3%BCvenlik">info@seninrandevun.com</a> adresine konu satırında Güvenlik yazarak iletebilirsiniz.</p> },
      ]}
      related={[
        { href: "/kvkk", label: "KVKK Aydınlatma Metni", text: "Haklarınız ve başvuru yolları." },
        { href: "/gizlilik", label: "Gizlilik Politikası", text: "Bilgileriniz nasıl işlenir?" },
        { href: "/iletisim", label: "İletişim", text: "Sorularınız için bize ulaşın." },
      ]}
    />
  </MarketingPage>;
}
