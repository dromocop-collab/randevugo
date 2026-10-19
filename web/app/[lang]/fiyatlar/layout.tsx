import type { Metadata } from "next";
import { createPublicMetadata, safeJsonLd } from "@/lib/seo/metadata";
import { localizeHref } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

const SITE_URL = "https://seninrandevun.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return createPublicMetadata({
    title: t("Randevu Sistemi Fiyatları"),
    description: t("SeninRandevun online randevu sistemi paketlerini, güncel aylık ve yıllık fiyatları, deneme sürelerini, şube ve çalışan limitlerini tek sayfada karşılaştırın."),
    keywords: [
      t("online randevu sistemi fiyatları"),
      t("randevu yazılımı fiyat"),
      t("işletme yönetim yazılımı fiyat"),
      t("kuaför randevu sistemi fiyat"),
      t("SeninRandevun fiyatları"),
      t("salon randevu yazılımı"),
      t("randevu sistemi ücretsiz deneme"),
    ],
    pathname: "/fiyatlar",
    imageAlt: t("SeninRandevun işletme planları ve fiyatları"),
    locale: await getLocale(),
  });
}

export default async function FiyatlarLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const locale = await getLocale();
  const pageUrl = `${SITE_URL}${localizeHref("/fiyatlar", locale)}`;
  const homeUrl = `${SITE_URL}${localizeHref("/", locale).replace(/^\/$/, "")}`;

  /* JSON-LD Pricing Schema — rendered server-side for Google */
  const pricingJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "SeninRandevun",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: pageUrl,
        aggregateRating: undefined, // Add when you have real ratings
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: t("Ücretsiz deneme kampanyası nasıl çalışır?"),
            acceptedAnswer: { "@type": "Answer", text: t("İşletmeler seçtikleri pakette belirtilen deneme süresinden yararlanır. Güncel süre ve paket kapsamı fiyatlar sayfasında gösterilir.") },
          },
          {
            "@type": "Question",
            name: t("Çalışan veya randevu limiti var mı?"),
            acceptedAnswer: { "@type": "Answer", text: t("Çalışan ve şube limitleri pakete göre değişir; güncel kapasite her paket kartında gösterilir.") },
          },
          {
            "@type": "Question",
            name: t("İstediğim zaman ayrılabilir miyim?"),
            acceptedAnswer: { "@type": "Answer", text: t("Evet. Aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz.") },
          },
          {
            "@type": "Question",
            name: t("Mevcut verilerimi taşıyabilir miyim?"),
            acceptedAnswer: { "@type": "Answer", text: t("Müşteri listenizi aktarabilir, kurulum desteğimizden yararlanabilirsiniz.") },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t("Ana Sayfa"), item: homeUrl },
          { "@type": "ListItem", position: 2, name: t("Fiyatlar"), item: pageUrl },
        ],
      },
    ],
  };

  return <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(pricingJsonLd) }}
    />
    {children}
  </>;
}
