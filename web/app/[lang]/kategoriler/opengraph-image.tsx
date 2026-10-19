import { renderOgCard } from "@/lib/seo/og-card";
import { DEFAULT_LOCALE, isLocale, translate, type TFunction } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export const alt = "Tüm kategoriler — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Görsel rotalarında dil, kök [lang] parametresinden okunur. */
async function translatorFor(params: Promise<{ lang?: string }>) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  return { locale, t: ((source, vars) => translate(locale, messages, source, vars)) as TFunction };
}

export default async function Image({ params }: { params: Promise<{ lang?: string }> }) {
  const { t } = await translatorFor(params);
  return renderOgCard({
    eyebrow: t("Tüm kategoriler"),
    title: t("Ne için randevu almak istersin?"),
    subtitle: t("Kuaför, berber, güzellik, spa, sağlık, spor, veteriner ve daha fazlası."),
    chips: [t("Gerçek yorumlar"), t("Ücretsiz")],
  });
}
