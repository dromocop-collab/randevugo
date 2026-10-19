import { localImageDataUrl } from "@/lib/seo/og-routes";
import { renderOgCard } from "@/lib/seo/og-card";
import { DEFAULT_LOCALE, isLocale, translate, type TFunction } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export const alt = "Online randevu al — SeninRandevun";
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
    eyebrow: t("Online randevu"),
    title: t("Uygun saati seç, randevunu saniyeler içinde al"),
    subtitle: t("Kuaförden veterinere yakınındaki işletmeler tek yerde."),
    chips: [t("Ücretsiz"), "7/24"],
    image: await localImageDataUrl("/images/booking-flow-hero.png"),
  });
}
