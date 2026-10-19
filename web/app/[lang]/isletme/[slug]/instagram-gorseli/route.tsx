import type { NextRequest } from "next/server";
import { getBusinessBySlugCached } from "@/features/businesses/business-slug-cache";
import { listBookableServices } from "@/features/services/service-repository";
import { formatRating, parseShareFormat, pickShowcaseServices, shareDisplayUrl, shareFileName, type ShareFormat } from "@/features/share/instagram-share-domain";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { renderInstagramCard, type InstagramCardInput } from "@/lib/share/instagram-card";
import { categoryDisplayName } from "@/lib/seo/categories";
import { fetchImageDataUrl } from "@/lib/seo/og-card";
import { localImageDataUrl } from "@/lib/seo/og-routes";
import { absoluteUrl, businessPath } from "@/lib/seo/site";
import { displayPlace } from "@/lib/seo/text";

/**
 * GET /isletme/<slug>/instagram-gorseli?boyut=hikaye|gonderi[&v=<sürüm>]
 * Yayındaki işletme için Instagram Hikâye (1080×1920) ya da gönderi (1080×1350) PNG'si.
 * Yayında olmayan / bulunamayan işletmede 404. CDN'de 1 saat tutulur; `v` (işletmenin updatedAt'i)
 * değişince yeni anahtar oluşur, yani güncellenen işletmenin görseli de tazelenir.
 * Görsel işletmenin Türkçe Instagram paylaşımı içindir; metinleri bilerek Türkçe kalır (i18n-ignore).
 */
const CACHE_CONTROL = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";

function notFound() {
  return new Response("İşletme bulunamadı.", { status: 404, headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain; charset=utf-8" } }); // i18n-ignore
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const format = parseShareFormat(request.nextUrl.searchParams.get("boyut"));

  const sample = process.env.NODE_ENV !== "production" ? await devSample(slug, format) : null;
  const input = sample ?? (await loadBusinessCard(slug, format));
  if (input === "error") return new Response("Görsel şu anda oluşturulamadı.", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }); // i18n-ignore
  if (!input) return notFound();

  try {
    return await renderInstagramCard(input, {
      headers: {
        "Cache-Control": sample ? "no-store" : CACHE_CONTROL,
        "Content-Disposition": `inline; filename="${shareFileName(slug, format)}"`,
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("[instagram-gorseli] çizim hatası", error); // i18n-ignore
    return new Response("Görsel şu anda oluşturulamadı.", { status: 500, headers: { "Cache-Control": "no-store" } }); // i18n-ignore
  }
}

async function loadBusinessCard(slug: string, format: ShareFormat): Promise<InstagramCardInput | null | "error"> {
  let business;
  try {
    business = await getBusinessBySlugCached(slug);
  } catch {
    // Bağlantı hatası 404 sayılmaz; paylaşım ekranı tekrar denesin.
    return "error";
  }
  if (!business || business.status !== "active" || !business.isPublished) return null;

  const [services, cover, logo] = await Promise.all([
    listBookableServices(business.id).catch(() => []),
    fetchImageDataUrl(business.coverUrl || business.galleryUrls?.find(Boolean)),
    fetchImageDataUrl(business.logoUrl),
  ]);
  const rated = (business.reviewCount ?? 0) > 0 && (business.rating ?? 0) > 0;
  const pageSlug = business.slug || slug;
  return {
    format,
    name: business.name,
    category: categoryDisplayName(canonicalBusinessCategory(business.category ?? "")),
    place: [displayPlace(business.district), displayPlace(business.city)].filter(Boolean).join(", "),
    rating: rated ? formatRating(business.rating) : null,
    reviewCount: rated ? business.reviewCount : 0,
    verified: business.isVerified === true,
    onlineBooking: business.allowOnlineBooking !== false,
    services: pickShowcaseServices(services, format === "story" ? 4 : 3),
    displayUrl: shareDisplayUrl(pageSlug),
    pageUrl: absoluteUrl(businessPath(pageSlug)),
    cover,
    logo,
    monogram: business.name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "S",
  };
}

/** Yalnızca geliştirmede: /isletme/ornek-kuafor/instagram-gorseli gibi örnek işletmeler (tasarım/Türkçe karakter denetimi). */
async function devSample(slug: string, format: ShareFormat): Promise<InstagramCardInput | null> {
  const base = { format, pageUrl: absoluteUrl(businessPath(slug)), displayUrl: shareDisplayUrl(slug), logo: null } as const;
  if (slug === "ornek-kuafor") {
    return {
      ...base,
      name: "Şığ Güzellik & Saç Tasarım İstanbul", // i18n-ignore
      category: "Kuaför", // i18n-ignore
      place: "Kadıköy, İstanbul", // i18n-ignore
      rating: formatRating(4.86),
      reviewCount: 128,
      verified: true,
      onlineBooking: true,
      services: pickShowcaseServices([
        { name: "Saç kesimi & fön", price: 450, durationMinutes: 45 }, // i18n-ignore
        { name: "Ombre / Balyaj", price: 2250, durationMinutes: 180 },
        { name: "Keratin bakımı", price: 1800, durationMinutes: 120 }, // i18n-ignore
        { name: "Gelin saçı (prova dahil)", price: 6500, durationMinutes: 150 }, // i18n-ignore
      ], format === "story" ? 4 : 3),
      cover: await localImageDataUrl("/images/home-hero-studio-v2.jpg"),
      monogram: "Ş", // i18n-ignore
    };
  }
  if (slug === "ornek-berber") {
    return {
      ...base,
      name: "Çağrı Berber", // i18n-ignore
      category: "Berber",
      place: "Fethiye, Muğla", // i18n-ignore
      rating: null,
      reviewCount: 0,
      verified: false,
      onlineBooking: true,
      services: pickShowcaseServices([
        { name: "Saç + sakal", price: 600, durationMinutes: 50 }, // i18n-ignore
        { name: "Çocuk tıraşı", price: 300, durationMinutes: 25 }, // i18n-ignore
        { name: "Ağda & yüz bakımı", price: 0, durationMinutes: 30 }, // i18n-ignore
      ], format === "story" ? 4 : 3),
      cover: null,
      monogram: "Ç", // i18n-ignore
    };
  }
  return null;
}
