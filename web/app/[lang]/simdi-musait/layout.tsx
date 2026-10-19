import type { Metadata } from "next";
import { createPublicMetadata, safeJsonLd } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/site";
import { localizeHref } from "@/i18n/config";
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return createPublicMetadata({
    title: t("Şimdi Müsait İşletmeler | Canlı Sıraya Katıl"),
    description: t("Şu anda yeni müşteri kabul eden kuaför, berber ve bakım işletmelerini keşfet; güncel bekleme süresini gör ve sana uygun hizmet için canlı sıraya katıl."),
    pathname: "/simdi-musait",
    keywords: [t("şimdi müsait işletmeler"), t("canlı sıra"), t("beklemeden hizmet al"), t("yakındaki açık işletmeler"), t("anlık randevu")],
    imageAlt: t("Canlı sıraya açık ve şimdi müsait işletmeler"),
    locale: await getLocale(),
  });
}

export default async function LiveDiscoveryLayout({ children }: { children: React.ReactNode }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const pageUrl = absoluteUrl(localizeHref("/simdi-musait", locale));
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: t("Şimdi Müsait İşletmeler"), url: pageUrl, description: t("Canlı sıraya açık işletmelerin güncel listesi.") },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: t("Ana Sayfa"), item: absoluteUrl(localizeHref("/", locale)) },
        { "@type": "ListItem", position: 2, name: t("Şimdi Müsait"), item: pageUrl },
      ] },
    ],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />{children}</>;
}
