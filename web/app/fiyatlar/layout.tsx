import type { Metadata } from "next";
import { createPublicMetadata, safeJsonLd } from "@/lib/seo/metadata";

const SITE_URL = "https://seninrandevun.com";

export const metadata: Metadata = createPublicMetadata({
  title: "Randevu Sistemi Fiyatları",
  description: "SeninRandevun işletme paketlerini, güncel aylık ve yıllık fiyatları, deneme sürelerini, şube ve çalışan limitlerini karşılaştırın.",
  keywords: [
    "online randevu sistemi fiyatları",
    "randevu yazılımı fiyat",
    "işletme yönetim yazılımı fiyat",
    "kuaför randevu sistemi fiyat",
    "SeninRandevun fiyatları",
    "salon randevu yazılımı",
    "randevu sistemi ücretsiz deneme",
  ],
  pathname: "/fiyatlar",
  imageAlt: "SeninRandevun işletme planları ve fiyatları",
});

/* JSON-LD Pricing Schema — rendered server-side for Google */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "SeninRandevun",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/fiyatlar`,
      aggregateRating: undefined, // Add when you have real ratings
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Ücretsiz deneme kampanyası nasıl çalışır?",
          acceptedAnswer: { "@type": "Answer", text: "İşletmeler seçtikleri pakette belirtilen deneme süresinden yararlanır. Güncel süre ve paket kapsamı fiyatlar sayfasında gösterilir." },
        },
        {
          "@type": "Question",
          name: "Çalışan veya randevu limiti var mı?",
          acceptedAnswer: { "@type": "Answer", text: "Çalışan ve şube limitleri pakete göre değişir; güncel kapasite her paket kartında gösterilir." },
        },
        {
          "@type": "Question",
          name: "İstediğim zaman ayrılabilir miyim?",
          acceptedAnswer: { "@type": "Answer", text: "Evet. Aboneliğinizi dilediğiniz zaman sonlandırabilirsiniz." },
        },
        {
          "@type": "Question",
          name: "Mevcut verilerimi taşıyabilir miyim?",
          acceptedAnswer: { "@type": "Answer", text: "Müşteri listenizi aktarabilir, kurulum desteğimizden yararlanabilirsiniz." },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Fiyatlar", item: `${SITE_URL}/fiyatlar` },
      ],
    },
  ],
};

export default function FiyatlarLayout({ children }: { children: React.ReactNode }) {
  return <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(pricingJsonLd) }}
    />
    {children}
  </>;
}
