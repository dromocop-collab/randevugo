import type { ReactNode } from "react";
import { safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";

const featureJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": `${SEO_SITE_URL}/ozellikler#webpage`, url: `${SEO_SITE_URL}/ozellikler`, name: "Online Randevu Sistemi Özellikleri", description: "SeninRandevun işletme yönetim özellikleri", inLanguage: "tr-TR" },
    { "@type": "ItemList", name: "SeninRandevun işletme özellikleri", numberOfItems: 10, itemListElement: ["Akıllı takvim", "Online randevu", "SMS ve anlık bildirim", "Canlı sıra", "Ekip ve çalışan paneli", "Müşteri CRM", "Kasa, paket ve seans", "Analiz ve büyüme", "İşletmeye özel randevu alanları", "iOS ve Android uygulaması"].map((name, index) => ({ "@type": "ListItem", position: index + 1, name })) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SEO_SITE_URL }, { "@type": "ListItem", position: 2, name: "Özellikler", item: `${SEO_SITE_URL}/ozellikler` }] },
  ],
};

export default function FeaturesLayout({ children }: { children: ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(featureJsonLd) }}/>{children}</>;
}
