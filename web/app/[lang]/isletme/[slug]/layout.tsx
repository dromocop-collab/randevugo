import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getBusinessBySlugCached } from "@/features/businesses/business-slug-cache";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { categoryDisplayName, seoCategory } from "@/lib/seo/categories";
import { canonicalAlternates, robotsFor } from "@/lib/seo/metadata";
import { SITE_LOCALE, SITE_NAME, absoluteUrl, businessPath } from "@/lib/seo/site";
import { composeDescription, displayPlace, locative } from "@/lib/seo/text";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlugCached(slug).catch(() => null);
  if (!business || business.status !== "active" || !business.isPublished) {
    return { title: "İşletme bulunamadı", robots: { index: false, follow: false } };
  }

  // Gizlenen işletmenin doğrudan linki açık kalır ama arama motorlarına kapalıdır.
  const indexable = business.hiddenFromDiscovery !== true;
  const path = businessPath(business.slug || slug);
  const category = canonicalBusinessCategory(business.category ?? "");
  const label = categoryDisplayName(category);
  const noun = seoCategory(category)?.noun ?? label.toLocaleLowerCase("tr-TR");
  const city = displayPlace(business.city);
  const district = displayPlace(business.district);
  const place = [district, city].filter(Boolean).join(", ");
  // Çok kısa/anlamsız açıklamalar (ör. test metni) arama sonucuna yazılmaz.
  const ownDescription = (business.description?.trim().length ?? 0) >= 40 ? business.description!.trim() : undefined;
  const nameHasLabel = business.name.toLocaleLowerCase("tr-TR").includes(label.toLocaleLowerCase("tr-TR"));
  const qualifier = [district, nameHasLabel ? "" : label].filter(Boolean).join(" ");
  const title = `${business.name}${qualifier ? ` – ${qualifier}` : ""}: Fiyatlar ve Online Randevu`;
  const rated = (business.reviewCount ?? 0) > 0 && (business.rating ?? 0) > 0;
  const description = composeDescription([
    ownDescription,
    `${business.name}${city ? `, ${locative(district || city)} hizmet veren bir ${noun}` : ""}.`,
    rated ? `${business.reviewCount} müşteri yorumuyla 5 üzerinden ${business.rating.toFixed(1)} puan.` : undefined,
    "Hizmetleri, fiyatları ve çalışma saatlerini incele, uygun saati seçip online randevu al.",
    place ? `Adres: ${place}.` : undefined,
  ]);
  const ogTitle = `${business.name} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: canonicalAlternates(path),
    robots: robotsFor(indexable),
    // Paylaşım görseli aynı klasördeki opengraph-image.tsx'ten gelir (images yazılmaz).
    openGraph: { title: ogTitle, description, url: absoluteUrl(path), type: "website", locale: SITE_LOCALE, siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title: ogTitle, description },
  };
}

/**
 * Olmayan/yayında olmayan işletmede vitrin, randevu ve canlı sıra sayfaları gerçek 404 döner
 * (yanıt akışı başlamadan kontrol edilir). Yapısal veri ve içerik sayfa bileşenindedir.
 */
export default async function BusinessProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Bağlantı hatası 404 sayılmaz (Google sayfayı dizinden silmesin); hata sayfası 500 döner.
  const business = await getBusinessBySlugCached(slug);
  if (!business || business.status !== "active" || !business.isPublished) notFound();
  return children;
}
