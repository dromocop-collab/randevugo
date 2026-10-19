import type { ReactNode } from "react";
import { safeJsonLd, SEO_SITE_URL } from "@/lib/seo/metadata";
import { localizeHref, tk } from "@/i18n/config";
import { getIntlLocale, getLocale, getT } from "@/i18n/server";

const FEATURE_NAMES = [tk("Akıllı takvim"), tk("Online randevu"), tk("SMS ve anlık bildirim"), tk("Canlı sıra"), tk("Ekip ve çalışan paneli"), tk("Müşteri CRM"), tk("Kasa, paket ve seans"), tk("Analiz ve büyüme"), tk("İşletmeye özel randevu alanları"), tk("iOS ve Android uygulaması")];

export default async function FeaturesLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  const locale = await getLocale();
  const pageUrl = `${SEO_SITE_URL}${localizeHref("/ozellikler", locale)}`;
  const featureJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: t("Online Randevu Sistemi Özellikleri"), description: t("SeninRandevun işletme yönetim özellikleri"), inLanguage: await getIntlLocale() },
      { "@type": "ItemList", name: t("SeninRandevun işletme özellikleri"), numberOfItems: FEATURE_NAMES.length, itemListElement: FEATURE_NAMES.map((name, index) => ({ "@type": "ListItem", position: index + 1, name: t(name) })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: t("Ana Sayfa"), item: `${SEO_SITE_URL}${localizeHref("/", locale).replace(/^\/$/, "")}` }, { "@type": "ListItem", position: 2, name: t("Özellikler"), item: pageUrl }] },
    ],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(featureJsonLd) }}/>{children}</>;
}
