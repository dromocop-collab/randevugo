import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createProfessionMetadata } from "@/lib/profession-seo";

export const metadata = createProfessionMetadata({
  title: "Berber Randevusu Al | Online Berber Randevu",
  description: "Yakınınızdaki berberleri keşfedin, saç ve sakal hizmetlerini inceleyin, size uygun saati seçerek online berber randevusu alın.",
  pathname: "/berber-randevu",
  category: "berber",
});

export default function BerberRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/berber-randevu"
      eyebrow="Erkek bakım"
      title="Berber randevunuzu online alın"
      description="Saç kesimi, sakal tıraşı ve bakım hizmetleri sunan berberleri keşfedin. Uygun hizmeti ve saati seçerek hızlıca randevu oluşturun."
      category="berber"
      benefits={[
        "Berberlerin hizmetlerini, çalışma saatlerini ve müşteri yorumlarını karşılaştırın.",
        "Size uygun çalışanı ve randevu saatini kendiniz seçin.",
        "Randevunuzu telefon beklemeden birkaç adımda tamamlayın.",
      ]}
      steps={[
        "Konumunuza göre berberleri arayın ve işletme profilini inceleyin.",
        "Saç, sakal veya bakım hizmetlerinden ihtiyacınıza uygun olanı seçin.",
        "Müsait gün ve saati seçerek randevunuzu onaylayın.",
      ]}
      faq={[
        { question: "Online berber randevusu nasıl alınır?", answer: "Berber kategorisindeki işletmeleri keşfedin, hizmet ve çalışan seçimini yapın. Müsait saatlerden birini seçerek randevunuzu tamamlayın." },
        { question: "Berber randevusunda hangi hizmetleri bulabilirim?", answer: "İşletmeye göre saç kesimi, sakal tıraşı, saç ve sakal bakımı, çocuk saç kesimi ve benzeri hizmetleri bulabilirsiniz." },
        { question: "Berberimi ve saatimi seçebilir miyim?", answer: "İşletmenin tanımladığı çalışan ve müsaitlik seçenekleri arasından size uygun olanı seçebilirsiniz." },
      ]}
      relatedLinks={[
        { href: "/kesfet?category=berber", label: "Berberleri keşfet" },
        { href: "/online-randevu", label: "Online randevu nasıl alınır?" },
        { href: "/kuafor-randevu", label: "Kuaför randevusu" },
      ]}
    />
  );
}
