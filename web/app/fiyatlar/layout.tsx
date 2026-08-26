import type { Metadata } from "next";
import { PLAN_PRICE, PLAN_FEATURE_LIST, PLAN_LABEL } from "@/constants/plans";

const SITE_URL = "https://seninrandevun.com";

export const metadata: Metadata = {
  title: "Online Randevu Sistemi Fiyatları | İşletme Planları",
  description: `SeninRandevun online randevu sistemi yılda ${PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺. Takvim, çalışan, müşteri CRM, analitik ve online rezervasyon özellikleriyle işletmenizi büyütün. 14 gün ücretsiz deneyin.`,
  keywords: [
    "online randevu sistemi fiyatları",
    "randevu yazılımı fiyat",
    "işletme yönetim yazılımı fiyat",
    "kuaför randevu sistemi fiyat",
    "SeninRandevun fiyatları",
    "salon randevu yazılımı",
    "randevu sistemi ücretsiz deneme",
  ],
  alternates: { canonical: `${SITE_URL}/fiyatlar` },
  openGraph: {
    title: "Online Randevu Sistemi Fiyatları | SeninRandevun",
    description: `Tüm özellikler dahil tek plan — yılda ${PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺. 14 gün ücretsiz deneyin.`,
    url: `${SITE_URL}/fiyatlar`,
    type: "website",
  },
};

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
      offers: {
        "@type": "Offer",
        price: PLAN_PRICE.yearly,
        priceCurrency: PLAN_PRICE.currency,
        priceValidUntil: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        availability: "https://schema.org/InStock",
        description: `${PLAN_LABEL} — tüm özellikler dahil yıllık plan`,
        seller: {
          "@type": "Organization",
          name: "SeninRandevun",
          url: SITE_URL,
        },
      },
      featureList: PLAN_FEATURE_LIST,
      aggregateRating: undefined, // Add when you have real ratings
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Deneme süresi nasıl çalışır?",
          acceptedAnswer: { "@type": "Answer", text: "14 gün boyunca tüm özellikleri ücretsiz kullanırsınız. Kart bilgisi istenmez." },
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd).replace(/</g, "\\u003c") }}
    />
    {children}
  </>;
}
