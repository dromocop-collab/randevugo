import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/seo-landing-page";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { tk } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

// Kategori işletme listesi saatte bir yenilenir.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return createPublicMetadata({
    title: t("Online Randevu Al – Kuaför, Berber, Güzellik"),
    description: t("Kuaför, berber, güzellik, sağlık, spor ve daha fazlası için online randevu al. İşletmeleri karşılaştır, uygun saati seç, randevunu saniyeler içinde oluştur."),
    pathname: "/online-randevu",
    keywords: [t("online randevu al"), t("internetten randevu"), t("randevu uygulaması"), t("yakındaki işletmeler"), t("ücretsiz randevu al")],
    image: null,
    locale: await getLocale(),
  });
}

export default function OnlineRandevuPage() {
  return (
    <SeoLandingPage
      pathname="/online-randevu"
      eyebrow={tk("SeninRandevun ile kolayca")}
      title={tk("Online randevu almak artık çok kolay")}
      description={tk("Aradığınız hizmeti ve konumu seçin, işletmelerin müsait saatlerini karşılaştırın ve telefonla beklemeden randevunuzu oluşturun.")}
      benefits={[
        tk("7/24 açık randevu seçenekleriyle istediğiniz saati kolayca bulun."),
        tk("Kuaför, berber, güzellik, sağlık, spor ve birçok kategoriyi tek yerde keşfedin."),
        tk("Randevu bilgilerinizi hesabınızdan takip edin ve değişiklikleri kolayca yönetin."),
      ]}
      steps={[
        tk("Keşfet sayfasında hizmet, kategori veya şehir seçerek işletmeleri arayın."),
        tk("İşletmenin hizmetlerini, çalışanlarını, müsaitlik durumunu ve yorumlarını inceleyin."),
        tk("Size uygun günü ve saati seçerek randevunuzu onaylayın."),
      ]}
      faq={[
        { question: tk("Online randevu nasıl alınır?"), answer: tk("Keşfet sayfasından kategori veya şehir seçin, bir işletme ve hizmet belirleyin. Uygun gün ve saati seçtikten sonra randevunuzu onaylayabilirsiniz.") },
        { question: tk("Hangi işletmelerden randevu alabilirim?"), answer: tk("Kuaför, berber, güzellik merkezi, nail studio, spor, sağlık, veteriner, eğitim ve danışmanlık işletmelerini keşfedebilirsiniz.") },
        { question: tk("Randevumu nereden takip ederim?"), answer: tk("Giriş yaptıktan sonra Hesabım sayfasından yaklaşan ve geçmiş randevularınızı görüntüleyebilirsiniz.") },
      ]}
      relatedLinks={[
        { href: "/kesfet", label: tk("İşletmeleri keşfet") },
        { href: "/kuafor-randevu", label: tk("Kuaför randevusu") },
        { href: "/guzellik-merkezi-randevu", label: tk("Güzellik randevusu") },
      ]}
    />
  );
}
