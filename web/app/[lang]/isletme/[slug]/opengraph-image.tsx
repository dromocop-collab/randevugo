import { getBusinessBySlugCached } from "@/features/businesses/business-slug-cache";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import { categoryDisplayName } from "@/lib/seo/categories";
import { fetchImageDataUrl, renderOgCard } from "@/lib/seo/og-card";
import { displayPlace } from "@/lib/seo/text";

export const alt = "İşletme profili ve online randevu — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// İşletme bilgileri değiştikçe görsel en geç bir saatte yenilenir.
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlugCached(slug).catch(() => null);
  if (!business || business.status !== "active" || !business.isPublished) {
    return renderOgCard({ eyebrow: "SeninRandevun", title: "Yakınındaki işletmeyi keşfet, online randevu al" });
  }
  const category = categoryDisplayName(canonicalBusinessCategory(business.category ?? ""));
  const place = [displayPlace(business.district), displayPlace(business.city)].filter(Boolean).join(", ");
  const rated = (business.reviewCount ?? 0) > 0 && (business.rating ?? 0) > 0;
  const image = (await fetchImageDataUrl(business.coverUrl)) ?? (await fetchImageDataUrl(business.logoUrl));
  return renderOgCard({
    eyebrow: [category, displayPlace(business.city)].filter(Boolean).join(" · "),
    title: business.name,
    subtitle: place ? `${place}` : undefined,
    chips: [rated ? `${business.rating.toFixed(1)} puan · ${business.reviewCount} yorum` : "", business.isVerified ? "Doğrulanmış işletme" : ""].filter(Boolean),
    image,
    monogram: business.name.trim().charAt(0).toLocaleUpperCase("tr-TR"),
  });
}
