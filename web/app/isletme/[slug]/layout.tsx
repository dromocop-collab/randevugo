import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBusinessBySlug, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { listServices } from "@/features/services/service-repository";

const SITE_URL = "https://seninrandevun.com";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CATEGORY_LABELS: Record<string, string> = {
  kuafor: "Kuaför", berber: "Berber", guzellik: "Güzellik Merkezi", nail: "Nail Studio",
  spa: "Spa & Masaj", spor: "Spor & PT", saglik: "Sağlık", danismanlik: "Danışmanlık",
  veteriner: "Veteriner", yazilim: "Yazılım", egitim: "Eğitim", servis: "Servis & Teknik",
};

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
  const categoryLabel = CATEGORY_LABELS[business?.category ?? ""] ?? "";
  const title = `${label}${business?.district ? ` ${business.district}` : ""} | Fiyatlar, Yorumlar ve Randevu`;
  const description = business?.description?.trim() || `${label} ${location} hizmetlerini, fiyatlarını, çalışma saatlerini, ekibini ve gerçek müşteri yorumlarını inceleyin; uygun saati seçerek online randevu alın.`;

  // Use business cover/logo for OG image, fallback to /og.png
  const ogImages: string[] = [];
  if (business?.coverUrl) ogImages.push(business.coverUrl);
  else if (business?.logoUrl) ogImages.push(business.logoUrl);
  if (ogImages.length === 0) ogImages.push("/og.png");

  const keywords = [
    label,
    categoryLabel && `${categoryLabel} ${location}`,
    categoryLabel && `${categoryLabel} randevu`,
    location && `${location} randevu`,
    "online randevu",
    "SeninRandevun",
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", locale: "tr_TR", images: ogImages },
    twitter: { card: "summary_large_image", title, description, images: ogImages },
    robots: { index: business?.isPublished === true && business.status === "active", follow: true, googleBot: { index: business?.isPublished === true && business.status === "active", follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export default async function BusinessProfileLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug).catch(() => null);
  if (!business || !business.isPublished || business.status !== "active") return <>{children}</>;

  // Fetch working hours and services for rich schema
  const [workingHours, services] = await Promise.all([
    listBusinessWorkingHours(business.id).catch(() => []),
    listServices(business.id, true).catch(() => []),
  ]);

  // Build openingHoursSpecification
  const openingHours = workingHours
    .filter((wh) => wh.isOpen)
    .map((wh) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_NAMES[wh.day] ?? "Monday",
      opens: wh.start,
      closes: wh.end,
    }));

  // Build hasOfferCatalog with services
  const offerCatalog = services.length > 0 ? {
    "@type": "OfferCatalog",
    name: `${business.name} Hizmetleri`,
    itemListElement: services.slice(0, 20).map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        ...(service.description ? { description: service.description } : {}),
      },
      ...(service.price != null ? {
        price: service.price,
        priceCurrency: "TRY",
      } : {}),
    })),
  } : undefined;

  // Determine priceRange from services
  const prices = services.map((s) => s.price).filter((p): p is number => typeof p === "number" && p > 0);
  const priceRange = prices.length > 0
    ? prices.length === 1
      ? `${prices[0]} ₺`
      : `${Math.min(...prices)} ₺ - ${Math.max(...prices)} ₺`
    : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/isletme/${slug}#business`,
    name: business.name,
    url: `${SITE_URL}/isletme/${slug}`,
    image: business.coverUrl || business.logoUrl,
    description: business.description,
    telephone: business.phone,
    ...(business.email ? { email: business.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.district,
      addressRegion: business.city,
      addressCountry: "TR",
    },
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
    ...(offerCatalog ? { hasOfferCatalog: offerCatalog } : {}),
    ...(priceRange ? { priceRange } : {}),
    ...(business.reviewCount > 0 && business.rating > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: business.rating,
        reviewCount: business.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    ...(business.socialMedia?.instagram ? {
      sameAs: [`https://instagram.com/${business.socialMedia.instagram.replace(/^@/, "")}`],
    } : {}),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/isletme/${slug}/randevu`,
        actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
      },
      result: {
        "@type": "Reservation",
        name: `${business.name} Online Randevu`,
      },
    },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    {children}
  </>;
}
