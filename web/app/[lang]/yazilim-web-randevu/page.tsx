import type { Metadata } from "next";
import { SeoLandingPage, seoLandingMetadata } from "@/components/seo/seo-landing-page";
import { tk } from "@/i18n/config";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return seoLandingMetadata({
    title: tk("Yazılım ve Web Danışmanlığı Randevusu"),
    description: tk("Web tasarım, yazılım geliştirme ve dijital danışmanlık hizmeti veren uzmanları keşfet; projen için uygun saatte online görüşme randevusu al."),
    pathname: "/yazilim-web-randevu",
    category: "yazilim",
  });
}

export default function SoftwareBookingPage() {
  return <SeoLandingPage
    pathname="/yazilim-web-randevu"
    eyebrow={tk("Dijital çözüm ortakları")}
    title={tk("Yazılım ve web uzmanınızla online görüşün")}
    description={tk("Web sitesi, özel yazılım, e-ticaret ve dijital dönüşüm ihtiyaçlarınız için doğru işletmeyi bulun; uygun görüşme saatini anında seçin.")}
    category="yazilim"
    benefits={[
      tk("Uzmanlık alanlarını, hizmet kapsamını ve gerçek müşteri değerlendirmelerini karşılaştırın."),
      tk("Projenize uygun danışmanı ve görüşme saatini doğrudan seçin."),
      tk("İlk analiz görüşmesini telefon trafiği olmadan birkaç adımda planlayın."),
    ]}
    steps={[
      tk("İhtiyacınıza uygun yazılım ve web işletmelerini keşfedin."),
      tk("Hizmet paketini ve çalışmak istediğiniz uzmanı seçin."),
      tk("Uygun görüşme saatini belirleyip randevunuzu oluşturun."),
    ]}
    faq={[
      { question: tk("Yazılım danışmanlığı randevusu nasıl alınır?"), answer: tk("Yazılım kategorisindeki işletmeleri inceleyin, ihtiyacınıza uygun hizmeti ve müsait görüşme saatini seçin.") },
      { question: tk("Hangi hizmetler için görüşebilirim?"), answer: tk("Web tasarım, e-ticaret, mobil uygulama, özel yazılım, SEO ve dijital dönüşüm gibi hizmetler işletmeye göre sunulabilir.") },
      { question: tk("Online görüşme yapılabilir mi?"), answer: tk("İşletmenin sunduğu çalışma modeline göre online veya yüz yüze görüşme seçeneği bulunabilir.") },
    ]}
    relatedLinks={[
      { href: "/kesfet?category=yazilim", label: tk("Yazılım işletmelerini keşfet") },
      { href: "/danismanlik-randevu", label: tk("Danışmanlık randevusu") },
      { href: "/online-randevu", label: tk("Online randevu nasıl alınır?") },
    ]}
  />;
}
