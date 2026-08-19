import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createProfessionMetadata } from "@/lib/profession-seo";

export const metadata = createProfessionMetadata({
  title: "Kuaför Randevusu Al | Online Kuaför Randevu",
  description: "Yakınınızdaki kuaförleri keşfedin, saç kesimi ve bakım hizmetlerini inceleyin, uygun saati seçerek online kuaför randevunuzu hemen alın.",
  pathname: "/kuafor-randevu",
  category: "kuafor",
});

export default function KuaforRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/kuafor-randevu"
      eyebrow="Saç ve bakım"
      title="Kuaför randevunuzu online alın"
      description="Saç kesimi, boya, fön ve bakım hizmetleri sunan kuaförleri tek yerde karşılaştırın. Size uygun hizmeti ve saati seçerek beklemeden randevu oluşturun."
      category="kuafor"
      benefits={[
        "Kuaförün hizmet, fiyat ve çalışma saatlerini randevudan önce görün.",
        "Çalışan ve uygun saat seçimini kendiniz yapın; telefon trafiğiyle uğraşmayın.",
        "Randevu detaylarınızı hesabınızdan kolayca takip edin.",
      ]}
      steps={[
        "Şehrinizdeki kuaförleri ve sundukları hizmetleri keşfedin.",
        "Saç kesimi, boya, bakım veya istediğiniz hizmeti seçin.",
        "Uygun saati onaylayarak kuaför randevunuzu tamamlayın.",
      ]}
      faq={[
        { question: "Kuaför randevusu online alınır mı?", answer: "Evet. SeninRandevun üzerinden kuaförleri, hizmetleri ve müsait saatleri inceleyerek online randevu alabilirsiniz." },
        { question: "Kuaför randevusu için üye olmak gerekir mi?", answer: "İşletmenin tercih ettiği akışa göre randevu oluşturabilirsiniz. Hesap açmak randevularınızı daha kolay takip etmenizi sağlar." },
        { question: "Kuaför seçerken nelere dikkat etmeliyim?", answer: "Hizmet detaylarını, fiyatları, çalışanları, çalışma saatlerini ve müşteri yorumlarını karşılaştırarak karar verebilirsiniz." },
      ]}
      relatedLinks={[
        { href: "/kesfet?category=kuafor", label: "Kuaförleri keşfet" },
        { href: "/online-randevu", label: "Online randevu nasıl alınır?" },
        { href: "/berber-randevu", label: "Berber randevusu" },
      ]}
    />
  );
}
