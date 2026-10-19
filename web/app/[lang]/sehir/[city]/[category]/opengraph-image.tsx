import { SEO_CATEGORIES, isSeoCategory, localizeSeoCategory, seoCategoryVars } from "@/lib/seo/categories";
import { placeVars } from "@/lib/seo/text";
import { DEFAULT_LOCALE, isLocale, translate, type TFunction } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { renderOgCard } from "@/lib/seo/og-card";
import { localImageDataUrl } from "@/lib/seo/og-routes";
import { getCity, topRated } from "@/lib/seo/seo-data";

export const alt = "Şehir ve kategoriye göre işletmeler — SeninRandevun";
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

export default async function Image({ params }: { params: Promise<{ lang?: string; city: string; category: string }> }) {
  const { city: slug, category } = await params;
  const { t, locale } = await translatorFor(params);
  const city = isSeoCategory(category) ? await getCity(slug) : null;
  const rows = city?.businesses.filter((row) => row.category === category) ?? [];
  if (!city || rows.length === 0) return renderOgCard({ eyebrow: "SeninRandevun", title: t("Yakınındaki işletmeyi keşfet, online randevu al") });
  const item = localizeSeoCategory(SEO_CATEGORIES[category], t);
  const vars = { ...placeVars(city.city, locale), ...seoCategoryVars(item, locale) };
  const best = topRated(rows);
  return renderOgCard({
    eyebrow: `${city.city} · ${item.label}`,
    title: t("{place} {noun} randevusu", vars),
    subtitle: vars.Examples,
    chips: [t("{count} işletme", { count: rows.length }), best ? t("En yüksek puan {rating}", { rating: best.rating.toFixed(1) }) : ""].filter(Boolean),
    image: await localImageDataUrl(item.image),
  });
}
