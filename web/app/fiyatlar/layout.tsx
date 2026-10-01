import type { Metadata } from "next";
import { PLAN_PRICE, PLAN_FEATURE_LIST, PLAN_LABEL } from "@/constants/plans";
import { createPublicMetadata, safeJsonLd } from "@/lib/seo/metadata";

const SITE_URL = "https://seninrandevun.com";

export const metadata: Metadata = createPublicMetadata({
  title: "Randevu Sistemi Fiyatları",
  description: `Lansmana özel SeninRandevun ilk 3 ay ücretsiz. Sonrasında aylık ${PLAN_PRICE.monthly.toLocaleString("tr-TR")} ₺ veya yıllık ${PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺. Takvim, çalışan, müşteri CRM, analitik ve online rezervasyon dahil.`,
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
      name: PLAN_LABEL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/fiyatlar`,
      offers: [
        {
          "@type": "Offer", price: PLAN_PRICE.monthly, priceCurrency: PLAN_PRICE.currency,
          availability: "https://schema.org/InStock", description: `${PLAN_LABEL} — tüm özellikler dahil aylık plan`,
        },
        {
          "@type": "Offer", price: PLAN_PRICE.yearly, priceCurrency: PLAN_PRICE.currency,
          availability: "https://schema.org/InStock", description: `${PLAN_LABEL} — tüm özellikler dahil yıllık plan`,
        },
      ],
      featureList: PLAN_FEATURE_LIST,
      aggregateRating: undefined, // Add when you have real ratings
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "İlk 3 ay ücretsiz kampanyası nasıl çalışır?",
          acceptedAnswer: { "@type": "Answer", text: "Lansman döneminde açılan işletme hesapları tüm özellikleri kayıt tarihinden itibaren 3 ay ücretsiz kullanır. Kart bilgisi istenmez." },
        },
        {
          "@type": "Question",
          name: "Çalışan veya randevu limiti var mı?",
          acceptedAnswer: { "@type": "Answer", text: "250 çalışana kadar destek verilir; müşteri ve randevu sayısı sınırsızdır." },
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
