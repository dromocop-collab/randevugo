/**
 * schema.org JSON-LD oluşturucuları (saf modül, test edilebilir).
 * Yalnızca gerçek veriden alan üretir: veri yoksa ilgili alan hiç eklenmez
 * (ör. yayınlanmış yorum yoksa aggregateRating/review yazılmaz).
 */
import { SITE_CONTACT, SITE_DESCRIPTION, SITE_LANGUAGE, SITE_LOGO_PATH, SITE_NAME, SITE_SAME_AS, SITE_URL, absoluteUrl } from "./site.ts";
import { schemaTypeForCategory } from "./categories.ts";
import { shortPersonName } from "./text.ts";

export type JsonLdObject = Record<string, unknown>;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function organizationJsonLd(): JsonLdObject {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl(SITE_LOGO_PATH), width: 1254, height: 1254 },
    email: SITE_CONTACT.email,
    contactPoint: [{
      "@type": "ContactPoint",
      telephone: SITE_CONTACT.telephone,
      email: SITE_CONTACT.email,
      contactType: "customer service",
      areaServed: "TR",
      availableLanguage: ["Turkish"],
    }],
    sameAs: [...SITE_SAME_AS],
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/kesfet?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function graph(...nodes: (JsonLdObject | null | undefined | false)[]): JsonLdObject {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[], id?: string): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function itemListJsonLd(items: { name: string; path: string; image?: string }[], options: { id?: string; name?: string } = {}): JsonLdObject {
  return {
    "@type": "ItemList",
    ...(options.id ? { "@id": options.id } : {}),
    ...(options.name ? { name: options.name } : {}),
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListUnordered",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      ...(item.image ? { image: absoluteUrl(item.image) } : {}),
    })),
  };
}

export function faqJsonLd(faq: { question: string; answer: string }[], id?: string): JsonLdObject | null {
  if (faq.length === 0) return null;
  return {
    "@type": "FAQPage",
    ...(id ? { "@id": id } : {}),
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export type ScheduleLike = { day: number; isOpen: boolean; start: string; end: string; breakStart?: string; breakEnd?: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Aynı saatlere sahip günleri gruplar; öğle arası varsa iki ayrı aralık yazar. */
export function openingHoursJsonLd(hours: ScheduleLike[]): JsonLdObject[] {
  const groups = new Map<string, { opens: string; closes: string; days: number[] }>();
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = [...hours].filter((item) => item.isOpen && TIME.test(item.start) && TIME.test(item.end) && item.start < item.end)
    .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  for (const item of sorted) {
    const hasBreak = item.breakStart && item.breakEnd && TIME.test(item.breakStart) && TIME.test(item.breakEnd)
      && item.start < item.breakStart && item.breakStart < item.breakEnd && item.breakEnd < item.end;
    const ranges: [string, string][] = hasBreak ? [[item.start, item.breakStart!], [item.breakEnd!, item.end]] : [[item.start, item.end]];
    for (const [opens, closes] of ranges) {
      const key = `${opens}-${closes}`;
      const group = groups.get(key) ?? { opens, closes, days: [] };
      if (!group.days.includes(item.day)) group.days.push(item.day);
      groups.set(key, group);
    }
  }
  return [...groups.values()].map((group) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: group.days.map((day) => SCHEMA_DAYS[day]).filter(Boolean),
    opens: group.opens,
    closes: group.closes,
  }));
}

export function priceRangeText(prices: number[]): string | undefined {
  const valid = prices.filter((price) => Number.isFinite(price) && price > 0);
  if (valid.length === 0) return undefined;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const format = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.round(value));
  return min === max ? `${format(min)} TRY` : `${format(min)}-${format(max)} TRY`;
}

export type StorefrontSchemaInput = {
  slug: string;
  path: string;
  name: string;
  category: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  district?: string;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];
  rating?: number;
  reviewCount?: number;
  instagram?: string;
  hours: ScheduleLike[];
  services: { name: string; description?: string; price?: number; currency?: string; durationMinutes?: number }[];
  reviews: { customerName?: string; rating: number; comment?: string; createdAt?: string; isVisible?: boolean; status?: string }[];
  allowOnlineBooking?: boolean;
};

function isoDuration(minutes?: number): string | undefined {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return `PT${hours ? `${hours}H` : ""}${rest ? `${rest}M` : ""}`;
}

function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : undefined;
}

function instagramUrl(handle?: string): string | undefined {
  const value = handle?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const user = value.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  return user ? `https://www.instagram.com/${user}` : undefined;
}

/** İşletme vitrini için LocalBusiness (kategoriye göre alt tür) JSON-LD düğümü. */
export function storefrontJsonLd(input: StorefrontSchemaInput): JsonLdObject {
  const url = absoluteUrl(input.path);
  const images = [input.coverUrl, input.logoUrl, ...(input.galleryUrls ?? [])].filter((value): value is string => Boolean(value)).map((value) => absoluteUrl(value));
  const uniqueImages = [...new Set(images)].slice(0, 6);
  const offers = input.services.filter((service) => service.name?.trim()).slice(0, 30);
  const prices = offers.map((service) => service.price ?? 0);
  const priceRange = priceRangeText(prices);
  const openingHours = openingHoursJsonLd(input.hours);
  const reviewCount = Math.max(0, Math.floor(input.reviewCount ?? 0));
  const rating = Number(input.rating ?? 0);
  const hasRating = reviewCount > 0 && rating >= 1 && rating <= 5;
  const publishedReviews = input.reviews
    .filter((review) => review.isVisible !== false && (review.status === undefined || review.status === "approved") && review.rating >= 1 && review.rating <= 5 && review.comment?.trim())
    .slice(0, 5);
  const sameAs = [instagramUrl(input.instagram), input.website?.startsWith("http") ? input.website : undefined].filter(Boolean);

  return {
    "@type": schemaTypeForCategory(input.category),
    "@id": `${url}#business`,
    name: input.name,
    url,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(uniqueImages.length ? { image: uniqueImages } : {}),
    ...(input.logoUrl ? { logo: absoluteUrl(input.logoUrl) } : {}),
    ...(input.phone?.trim() ? { telephone: input.phone.trim() } : {}),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    address: {
      "@type": "PostalAddress",
      ...(input.address?.trim() ? { streetAddress: input.address.trim() } : {}),
      ...(input.district?.trim() ? { addressLocality: input.district.trim() } : {}),
      ...(input.city?.trim() ? { addressRegion: input.city.trim() } : {}),
      addressCountry: "TR",
    },
    ...(input.city?.trim() ? { areaServed: { "@type": "City", name: input.city.trim() } } : {}),
    ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
    ...(priceRange ? { priceRange, currenciesAccepted: "TRY" } : {}),
    ...(offers.length ? {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${input.name} hizmetleri`,
        itemListElement: offers.map((service) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.name.trim(),
            ...(service.description?.trim() ? { description: service.description.trim().slice(0, 300) } : {}),
            ...(isoDuration(service.durationMinutes) ? { duration: isoDuration(service.durationMinutes) } : {}),
          },
          ...(service.price && service.price > 0 ? { price: service.price, priceCurrency: service.currency || "TRY" } : {}),
          url: absoluteUrl(`${input.path}/randevu`),
        })),
      },
    } : {}),
    ...(hasRating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Math.round(rating * 10) / 10,
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    ...(hasRating && publishedReviews.length ? {
      review: publishedReviews.map((review) => ({
        "@type": "Review",
        author: { "@type": "Person", name: shortPersonName(review.customerName) },
        ...(isoDate(review.createdAt) ? { datePublished: isoDate(review.createdAt) } : {}),
        reviewBody: review.comment!.trim().slice(0, 500),
        reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      })),
    } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(input.allowOnlineBooking === false ? {} : {
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: absoluteUrl(`${input.path}/randevu`),
          inLanguage: SITE_LANGUAGE,
          actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"],
        },
        result: { "@type": "Reservation", name: `${input.name} online randevu` },
      },
    }),
    isPartOf: { "@id": WEBSITE_ID },
  };
}

/** Kategori tanıtım sayfası için Service düğümü. */
export function serviceJsonLd(input: { path: string; name: string; description: string; serviceType: string; image?: string; areaServed?: string }): JsonLdObject {
  const url = absoluteUrl(input.path);
  return {
    "@type": "Service",
    "@id": `${url}#service`,
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url,
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    provider: { "@id": ORGANIZATION_ID },
    areaServed: input.areaServed ? { "@type": "City", name: input.areaServed } : { "@type": "Country", name: "Türkiye" },
    availableChannel: { "@type": "ServiceChannel", serviceUrl: url, availableLanguage: "Turkish" },
  };
}

export function webPageJsonLd(input: { path: string; name: string; description: string; type?: "WebPage" | "CollectionPage" | "AboutPage" | "ContactPage" | "FAQPage"; image?: string; breadcrumbId?: string; mainEntityId?: string }): JsonLdObject {
  const url = absoluteUrl(input.path);
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    ...(input.image ? { primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(input.image) } } : {}),
    ...(input.breadcrumbId ? { breadcrumb: { "@id": input.breadcrumbId } } : {}),
    ...(input.mainEntityId ? { mainEntity: { "@id": input.mainEntityId } } : {}),
  };
}

/** `<script type="application/ld+json">` içine güvenle yazılabilir metin. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
