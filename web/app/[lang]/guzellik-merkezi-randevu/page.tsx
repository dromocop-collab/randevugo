import type { Metadata } from "next";
import { SeoLandingPage, seoLandingMetadata } from "@/components/seo/seo-landing-page";
import { tk } from "@/i18n/config";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return seoLandingMetadata({
    title: tk("Online Güzellik Merkezi Randevusu Al"),
    description: tk("Güzellik merkezlerini keşfet; cilt bakımı, epilasyon, kaş ve kirpik hizmetlerinin fiyatlarını ve müsait saatlerini karşılaştırıp online randevu al."),
    pathname: "/guzellik-merkezi-randevu",
    category: "guzellik",
  });
}

export default function GuzellikMerkeziRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/guzellik-merkezi-randevu"
      eyebrow={tk("Güzellik ve bakım")}
      title={tk("Güzellik merkezi randevunuzu kolayca alın")}
      description={tk("Cilt bakımı, epilasyon, manikür, pedikür ve daha fazlası için size uygun güzellik merkezini bulun. Hizmet ve saat seçimini online yapın.")}
      category="guzellik"
      benefits={[
        tk("Güzellik merkezlerinin hizmetlerini ve müsaitlik durumunu tek ekranda inceleyin."),
        tk("İhtiyacınıza uygun çalışanı, hizmeti ve randevu saatini seçin."),
        tk("Randevu sürecini hızlı, düzenli ve telefon görüşmesi olmadan tamamlayın."),
      ]}
      steps={[
        tk("Konumunuza veya hizmet ihtiyacınıza göre güzellik merkezlerini arayın."),
        tk("Cilt bakımı, epilasyon, tırnak ve diğer hizmetlerden birini seçin."),
        tk("Müsait gün ve saati belirleyerek randevunuzu onaylayın."),
      ]}
      faq={[
        { question: tk("Güzellik merkezi randevusu nasıl alınır?"), answer: tk("Güzellik kategorisindeki işletmeleri keşfedin, hizmeti ve çalışanı seçin. Uygun saatlerden birini belirleyerek online randevunuzu oluşturun.") },
        { question: tk("Hangi güzellik hizmetleri için randevu alabilirim?"), answer: tk("İşletmeye göre cilt bakımı, epilasyon, manikür, pedikür, nail art, masaj ve farklı bakım hizmetlerini bulabilirsiniz.") },
        { question: tk("Randevu saatini değiştirebilir miyim?"), answer: tk("İşletmenin randevu politikasına bağlı olarak işletmeyle iletişime geçebilir veya hesabınızdaki randevu detaylarından yönlendirmeleri takip edebilirsiniz.") },
      ]}
      relatedLinks={[
        { href: "/kesfet?category=guzellik", label: tk("Güzellik merkezlerini keşfet") },
        { href: "/online-randevu", label: tk("Tüm randevu seçenekleri") },
        { href: "/kuafor-randevu", label: tk("Kuaför randevusu") },
      ]}
    />
  );
}
