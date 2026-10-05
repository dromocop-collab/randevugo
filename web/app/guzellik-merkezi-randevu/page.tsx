import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createProfessionMetadata } from "@/lib/profession-seo";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export const metadata = createProfessionMetadata({
  title: "Online Güzellik Merkezi Randevusu Al",
  description: "Güzellik merkezlerini keşfet; cilt bakımı, epilasyon, kaş ve kirpik hizmetlerinin fiyatlarını ve müsait saatlerini karşılaştırıp online randevu al.",
  pathname: "/guzellik-merkezi-randevu",
  category: "guzellik",
});

export default function GuzellikMerkeziRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/guzellik-merkezi-randevu"
      eyebrow="Güzellik ve bakım"
      title="Güzellik merkezi randevunuzu kolayca alın"
      description="Cilt bakımı, epilasyon, manikür, pedikür ve daha fazlası için size uygun güzellik merkezini bulun. Hizmet ve saat seçimini online yapın."
      category="guzellik"
      benefits={[
        "Güzellik merkezlerinin hizmetlerini ve müsaitlik durumunu tek ekranda inceleyin.",
        "İhtiyacınıza uygun çalışanı, hizmeti ve randevu saatini seçin.",
        "Randevu sürecini hızlı, düzenli ve telefon görüşmesi olmadan tamamlayın.",
      ]}
      steps={[
        "Konumunuza veya hizmet ihtiyacınıza göre güzellik merkezlerini arayın.",
        "Cilt bakımı, epilasyon, tırnak ve diğer hizmetlerden birini seçin.",
        "Müsait gün ve saati belirleyerek randevunuzu onaylayın.",
      ]}
      faq={[
        { question: "Güzellik merkezi randevusu nasıl alınır?", answer: "Güzellik kategorisindeki işletmeleri keşfedin, hizmeti ve çalışanı seçin. Uygun saatlerden birini belirleyerek online randevunuzu oluşturun." },
        { question: "Hangi güzellik hizmetleri için randevu alabilirim?", answer: "İşletmeye göre cilt bakımı, epilasyon, manikür, pedikür, nail art, masaj ve farklı bakım hizmetlerini bulabilirsiniz." },
        { question: "Randevu saatini değiştirebilir miyim?", answer: "İşletmenin randevu politikasına bağlı olarak işletmeyle iletişime geçebilir veya hesabınızdaki randevu detaylarından yönlendirmeleri takip edebilirsiniz." },
      ]}
      relatedLinks={[
        { href: "/kesfet?category=guzellik", label: "Güzellik merkezlerini keşfet" },
        { href: "/online-randevu", label: "Tüm randevu seçenekleri" },
        { href: "/kuafor-randevu", label: "Kuaför randevusu" },
      ]}
    />
  );
}
