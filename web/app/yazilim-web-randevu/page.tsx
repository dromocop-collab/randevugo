import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createProfessionMetadata } from "@/lib/profession-seo";

export const metadata = createProfessionMetadata({
  title: "Yazılım ve Web Danışmanlığı Randevusu",
  description: "Web tasarım, yazılım geliştirme ve dijital danışmanlık hizmeti veren işletmeleri keşfedin; uzmanlarla online görüşme randevusu alın.",
  pathname: "/yazilim-web-randevu",
  category: "yazilim",
});

export default function SoftwareBookingPage() {
  return <SeoLandingPage
    pathname="/yazilim-web-randevu"
    eyebrow="Dijital çözüm ortakları"
    title="Yazılım ve web uzmanınızla online görüşün"
    description="Web sitesi, özel yazılım, e-ticaret ve dijital dönüşüm ihtiyaçlarınız için doğru işletmeyi bulun; uygun görüşme saatini anında seçin."
    category="yazilim"
    benefits={[
      "Uzmanlık alanlarını, hizmet kapsamını ve gerçek müşteri değerlendirmelerini karşılaştırın.",
      "Projenize uygun danışmanı ve görüşme saatini doğrudan seçin.",
      "İlk analiz görüşmesini telefon trafiği olmadan birkaç adımda planlayın.",
    ]}
    steps={[
      "İhtiyacınıza uygun yazılım ve web işletmelerini keşfedin.",
      "Hizmet paketini ve çalışmak istediğiniz uzmanı seçin.",
      "Uygun görüşme saatini belirleyip randevunuzu oluşturun.",
    ]}
    faq={[
      { question: "Yazılım danışmanlığı randevusu nasıl alınır?", answer: "Yazılım kategorisindeki işletmeleri inceleyin, ihtiyacınıza uygun hizmeti ve müsait görüşme saatini seçin." },
      { question: "Hangi hizmetler için görüşebilirim?", answer: "Web tasarım, e-ticaret, mobil uygulama, özel yazılım, SEO ve dijital dönüşüm gibi hizmetler işletmeye göre sunulabilir." },
      { question: "Online görüşme yapılabilir mi?", answer: "İşletmenin sunduğu çalışma modeline göre online veya yüz yüze görüşme seçeneği bulunabilir." },
    ]}
    relatedLinks={[
      { href: "/kesfet?category=yazilim", label: "Yazılım işletmelerini keşfet" },
      { href: "/danismanlik-randevu", label: "Danışmanlık randevusu" },
      { href: "/online-randevu", label: "Online randevu nasıl alınır?" },
    ]}
  />;
}
