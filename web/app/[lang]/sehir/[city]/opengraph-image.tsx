import { getCity, categoryCounts } from "@/lib/seo/seo-data";
import { renderOgCard } from "@/lib/seo/og-card";
import { placeVars } from "@/lib/seo/text";
import { getTForParams } from "@/i18n/server";

export const alt = "Şehirdeki işletmeler ve online randevu — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ lang?: string; city: string }> }) {
  const { city: slug } = await params;
  const { t, locale } = await getTForParams(params);
  const city = await getCity(slug);
  if (!city) return renderOgCard({ cta: t("Online randevu al"), eyebrow: "SeninRandevun", title: t("Yakınındaki işletmeyi keşfet, online randevu al") });
  const top = categoryCounts(city.businesses).slice(0, 3).map((item) => t(item.label));
  return renderOgCard({ cta: t("Online randevu al"),
    eyebrow: `${city.city} · ${t("Online randevu")}`,
    title: t("{inPlace} online randevu al", placeVars(city.city, locale)),
    subtitle: top.length ? top.join(" · ") : undefined,
    chips: [t("{count} işletme", { count: city.businesses.length })],
    monogram: city.city.charAt(0).toLocaleUpperCase("tr-TR"),
  });
}
