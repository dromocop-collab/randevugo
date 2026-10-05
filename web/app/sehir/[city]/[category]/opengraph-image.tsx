import { SEO_CATEGORIES, isSeoCategory } from "@/lib/seo/categories";
import { renderOgCard } from "@/lib/seo/og-card";
import { localImageDataUrl } from "@/lib/seo/og-routes";
import { getCity, topRated } from "@/lib/seo/seo-data";

export const alt = "Şehir ve kategoriye göre işletmeler — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ city: string; category: string }> }) {
  const { city: slug, category } = await params;
  const city = isSeoCategory(category) ? await getCity(slug) : null;
  const rows = city?.businesses.filter((row) => row.category === category) ?? [];
  if (!city || rows.length === 0) return renderOgCard({ eyebrow: "SeninRandevun", title: "Yakınındaki işletmeyi keşfet, online randevu al" });
  const item = SEO_CATEGORIES[category];
  const best = topRated(rows);
  return renderOgCard({
    eyebrow: `${city.city} · ${item.label}`,
    title: `${city.city} ${item.noun} randevusu`,
    subtitle: `${item.examples.charAt(0).toLocaleUpperCase("tr-TR")}${item.examples.slice(1)}`,
    chips: [`${rows.length} işletme`, best ? `En yüksek puan ${best.rating.toFixed(1)}` : ""].filter(Boolean),
    image: await localImageDataUrl(item.image),
  });
}
