import type { Metadata } from "next";
import { SeoLandingPage, seoLandingMetadata } from "@/components/seo/seo-landing-page";
import { tk } from "@/i18n/config";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return seoLandingMetadata({
    title: tk("Kuaför Randevusu Al – Online ve Ücretsiz"),
    description: tk("Yakınındaki kuaförleri keşfet; saç kesimi, boya ve bakım hizmetlerinin fiyatlarını, yorumlarını ve müsait saatlerini karşılaştırıp online randevu al."),
    pathname: "/kuafor-randevu",
    category: "kuafor",
  });
}

export default function KuaforRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/kuafor-randevu"
      eyebrow={tk("Saç ve bakım")}
      title={tk("Kuaför randevunuzu online alın")}
      description={tk("Saç kesimi, boya, fön ve bakım hizmetleri sunan kuaförleri tek yerde karşılaştırın. Size uygun hizmeti ve saati seçerek beklemeden randevu oluşturun.")}
      category="kuafor"
      benefits={[
        tk("Kuaförün hizmet, fiyat ve çalışma saatlerini randevudan önce görün."),
        tk("Çalışan ve uygun saat seçimini kendiniz yapın; telefon trafiğiyle uğraşmayın."),
        tk("Randevu detaylarınızı hesabınızdan kolayca takip edin."),
      ]}
      steps={[
        tk("Şehrinizdeki kuaförleri ve sundukları hizmetleri keşfedin."),
        tk("Saç kesimi, boya, bakım veya istediğiniz hizmeti seçin."),
        tk("Uygun saati onaylayarak kuaför randevunuzu tamamlayın."),
      ]}
      faq={[
        { question: tk("Kuaför randevusu online alınır mı?"), answer: tk("Evet. SeninRandevun üzerinden kuaförleri, hizmetleri ve müsait saatleri inceleyerek online randevu alabilirsiniz.") },
        { question: tk("Kuaför randevusu için üye olmak gerekir mi?"), answer: tk("İşletmenin tercih ettiği akışa göre randevu oluşturabilirsiniz. Hesap açmak randevularınızı daha kolay takip etmenizi sağlar.") },
        { question: tk("Kuaför seçerken nelere dikkat etmeliyim?"), answer: tk("Hizmet detaylarını, fiyatları, çalışanları, çalışma saatlerini ve müşteri yorumlarını karşılaştırarak karar verebilirsiniz.") },
      ]}
      relatedLinks={[
        { href: "/kesfet?category=kuafor", label: tk("Kuaförleri keşfet") },
        { href: "/online-randevu", label: tk("Online randevu nasıl alınır?") },
        { href: "/berber-randevu", label: tk("Berber randevusu") },
      ]}
    />
  );
}
