import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "Online Randevu Al",
  description: "Kuaför, berber, güzellik, sağlık, spor ve daha fazlası için online randevu alın. Uygun işletmeyi ve saati seçin, randevunuzu saniyeler içinde oluşturun.",
  pathname: "/online-randevu",
  keywords: ["online randevu al", "internetten randevu", "randevu uygulaması", "yakındaki işletmeler", "ücretsiz randevu al"],
  imageAlt: "Online randevu alma rehberi",
});

export default function OnlineRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/online-randevu"
      eyebrow="SeninRandevun ile kolayca"
      title="Online randevu almak artık çok kolay"
      description="Aradığınız hizmeti ve konumu seçin, işletmelerin müsait saatlerini karşılaştırın ve telefonla beklemeden randevunuzu oluşturun."
      benefits={[
        "7/24 açık randevu seçenekleriyle istediğiniz saati kolayca bulun.",
        "Kuaför, berber, güzellik, sağlık, spor ve birçok kategoriyi tek yerde keşfedin.",
        "Randevu bilgilerinizi hesabınızdan takip edin ve değişiklikleri kolayca yönetin.",
      ]}
      steps={[
        "Keşfet sayfasında hizmet, kategori veya şehir seçerek işletmeleri arayın.",
        "İşletmenin hizmetlerini, çalışanlarını, müsaitlik durumunu ve yorumlarını inceleyin.",
        "Size uygun günü ve saati seçerek randevunuzu onaylayın.",
      ]}
      faq={[
        { question: "Online randevu nasıl alınır?", answer: "Keşfet sayfasından kategori veya şehir seçin, bir işletme ve hizmet belirleyin. Uygun gün ve saati seçtikten sonra randevunuzu onaylayabilirsiniz." },
        { question: "Hangi işletmelerden randevu alabilirim?", answer: "Kuaför, berber, güzellik merkezi, nail studio, spor, sağlık, veteriner, eğitim ve danışmanlık işletmelerini keşfedebilirsiniz." },
        { question: "Randevumu nereden takip ederim?", answer: "Giriş yaptıktan sonra Hesabım sayfasından yaklaşan ve geçmiş randevularınızı görüntüleyebilirsiniz." },
      ]}
      relatedLinks={[
        { href: "/kesfet", label: "İşletmeleri keşfet" },
        { href: "/kuafor-randevu", label: "Kuaför randevusu" },
        { href: "/guzellik-merkezi-randevu", label: "Güzellik randevusu" },
      ]}
    />
  );
}
