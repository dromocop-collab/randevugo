import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBusinessBySlug } from "@/features/businesses/business-repository";

const SITE_URL = "https://seninrandevun.com";

function labelFromSlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr-TR"));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug).catch(() => null);
  const label = business?.name ?? labelFromSlug(slug);
  const canonical = `${SITE_URL}/isletme/${encodeURIComponent(slug)}`;
  const location = business ? `${business.district}, ${business.city}` : "";
  const title = `${label}${business?.district ? ` ${business.district}` : ""} | Fiyatlar, Yorumlar ve Randevu`;
  const description = business?.description?.trim() || `${label} ${location} hizmetlerini, fiyatlarını, çalışma saatlerini, ekibini ve gerçek müşteri yorumlarını inceleyin; uygun saati seçerek online randevu alın.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", locale: "tr_TR", images: ["/og.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
    robots: { index: business?.isPublished === true && business.status === "active", follow: true, googleBot: { index: business?.isPublished === true && business.status === "active", follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export default async function BusinessProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug).catch(() => null);
  const schema = business && business.isPublished && business.status === "active" ? {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: business.name,
    url: `${SITE_URL}/isletme/${slug}`, image: business.coverUrl || business.logoUrl,
    description: business.description, telephone: business.phone,
    address: { "@type": "PostalAddress", streetAddress: business.address, addressLocality: business.district, addressRegion: business.city, addressCountry: "TR" },
    ...(business.reviewCount > 0 && business.rating > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: business.rating, reviewCount: business.reviewCount } } : {}),
  } : null;
  return <>{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}{children}</>;
}
