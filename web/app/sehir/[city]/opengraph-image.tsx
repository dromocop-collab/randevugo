import { getCity, categoryCounts } from "@/lib/seo/seo-data";
import { renderOgCard } from "@/lib/seo/og-card";
import { locative } from "@/lib/seo/text";

export const alt = "Şehirdeki işletmeler ve online randevu — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = await getCity(slug);
  if (!city) return renderOgCard({ eyebrow: "SeninRandevun", title: "Yakınındaki işletmeyi keşfet, online randevu al" });
  const top = categoryCounts(city.businesses).slice(0, 3).map((item) => item.label);
  return renderOgCard({
    eyebrow: `${city.city} · Online randevu`,
    title: `${locative(city.city)} online randevu al`,
    subtitle: top.length ? top.join(" · ") : undefined,
    chips: [`${city.businesses.length} işletme`],
    monogram: city.city.charAt(0).toLocaleUpperCase("tr-TR"),
  });
}
