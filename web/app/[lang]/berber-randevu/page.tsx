import type { Metadata } from "next";
import { SeoLandingPage, seoLandingMetadata } from "@/components/seo/seo-landing-page";
import { tk } from "@/i18n/config";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return seoLandingMetadata({
    title: tk("Berber Randevusu Al – Online ve Ücretsiz"),
    description: tk("Yakınındaki berberleri keşfet; saç, sakal ve tıraş hizmetlerinin fiyatlarını, yorumlarını ve müsait saatlerini karşılaştırıp online berber randevusu al."),
    pathname: "/berber-randevu",
    category: "berber",
  });
}

export default function BerberRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/berber-randevu"
      eyebrow={tk("Erkek bakım")}
      title={tk("Berber randevunuzu online alın")}
      description={tk("Saç kesimi, sakal tıraşı ve bakım hizmetleri sunan berberleri keşfedin. Uygun hizmeti ve saati seçerek hızlıca randevu oluşturun.")}
      category="berber"
      benefits={[
        tk("Berberlerin hizmetlerini, çalışma saatlerini ve müşteri yorumlarını karşılaştırın."),
        tk("Size uygun çalışanı ve randevu saatini kendiniz seçin."),
        tk("Randevunuzu telefon beklemeden birkaç adımda tamamlayın."),
      ]}
      steps={[
        tk("Konumunuza göre berberleri arayın ve işletme profilini inceleyin."),
        tk("Saç, sakal veya bakım hizmetlerinden ihtiyacınıza uygun olanı seçin."),
        tk("Müsait gün ve saati seçerek randevunuzu onaylayın."),
      ]}
      faq={[
        { question: tk("Online berber randevusu nasıl alınır?"), answer: tk("Berber kategorisindeki işletmeleri keşfedin, hizmet ve çalışan seçimini yapın. Müsait saatlerden birini seçerek randevunuzu tamamlayın.") },
        { question: tk("Berber randevusunda hangi hizmetleri bulabilirim?"), answer: tk("İşletmeye göre saç kesimi, sakal tıraşı, saç ve sakal bakımı, çocuk saç kesimi ve benzeri hizmetleri bulabilirsiniz.") },
        { question: tk("Berberimi ve saatimi seçebilir miyim?"), answer: tk("İşletmenin tanımladığı çalışan ve müsaitlik seçenekleri arasından size uygun olanı seçebilirsiniz.") },
      ]}
      relatedLinks={[
        { href: "/kesfet?category=berber", label: tk("Berberleri keşfet") },
        { href: "/online-randevu", label: tk("Online randevu nasıl alınır?") },
        { href: "/kuafor-randevu", label: tk("Kuaför randevusu") },
      ]}
    />
  );
}
