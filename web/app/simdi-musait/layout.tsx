import type { Metadata } from "next";
import { createPublicMetadata, safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "Şimdi Müsait İşletmeler | Canlı Sıraya Katıl",
  description: "Şu anda yeni müşteri kabul eden işletmeleri keşfet, güncel bekleme süresini gör ve sana uygun hizmet için canlı sıraya katıl.",
  pathname: "/simdi-musait",
  keywords: ["şimdi müsait işletmeler", "canlı sıra", "beklemeden hizmet al", "yakındaki açık işletmeler", "anlık randevu"],
  imageAlt: "Canlı sıraya açık ve şimdi müsait işletmeler",
});

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "CollectionPage", name: "Şimdi Müsait İşletmeler", url: `${SEO_SITE_URL}/simdi-musait`, description: "Canlı sıraya açık işletmelerin güncel listesi." },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SEO_SITE_URL },
      { "@type": "ListItem", position: 2, name: "Şimdi Müsait", item: `${SEO_SITE_URL}/simdi-musait` },
    ] },
  ],
};

export default function LiveDiscoveryLayout({ children }: { children: React.ReactNode }) {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />{children}</>;
}
