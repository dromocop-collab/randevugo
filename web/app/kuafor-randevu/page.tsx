import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createProfessionMetadata } from "@/lib/profession-seo";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export const metadata = createProfessionMetadata({
  title: "Kuaför Randevusu Al – Online ve Ücretsiz",
  description: "Yakınındaki kuaförleri keşfet; saç kesimi, boya ve bakım hizmetlerinin fiyatlarını, yorumlarını ve müsait saatlerini karşılaştırıp online randevu al.",
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
