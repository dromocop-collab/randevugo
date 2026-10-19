import { getCity, categoryCounts } from "@/lib/seo/seo-data";
import { renderOgCard } from "@/lib/seo/og-card";
import { placeVars } from "@/lib/seo/text";
import { DEFAULT_LOCALE, isLocale, translate, type TFunction } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export const alt = "Şehirdeki işletmeler ve online randevu — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

/** Görsel rotalarında dil, kök [lang] parametresinden okunur. */
async function translatorFor(params: Promise<{ lang?: string }>) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  return { locale, t: ((source, vars) => translate(locale, messages, source, vars)) as TFunction };
}

export default async function Image({ params }: { params: Promise<{ lang?: string; city: string }> }) {
  const { city: slug } = await params;
  const { t, locale } = await translatorFor(params);
  const city = await getCity(slug);
  if (!city) return renderOgCard({ eyebrow: "SeninRandevun", title: t("Yakınındaki işletmeyi keşfet, online randevu al") });
  const top = categoryCounts(city.businesses).slice(0, 3).map((item) => t(item.label));
  return renderOgCard({
    eyebrow: `${city.city} · ${t("Online randevu")}`,
    title: t("{inPlace} online randevu al", placeVars(city.city, locale)),
    subtitle: top.length ? top.join(" · ") : undefined,
    chips: [t("{count} işletme", { count: city.businesses.length })],
    monogram: city.city.charAt(0).toLocaleUpperCase("tr-TR"),
  });
}
