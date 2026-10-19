import { renderOgCard } from "@/lib/seo/og-card";
import { DEFAULT_LOCALE, isLocale, translate } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export const alt = "Senin randevu karakterin ne? — SeninRandevun";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Görsel rotalarında root params yok: dil, [lang] parametresinden okunur.
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  const t = (source: string) => translate(locale, messages, source);
  return renderOgCard({
    eyebrow: t("1 dakikalık test"),
    title: t("Senin randevu karakterin ne?"),
    subtitle: t("8 eğlenceli soru: Telefon Ninjası mı, Defter Ustası mı, Gece Kuşu mu?"),
    chips: [t("8 soru"), t("~1 dakika")],
  });
}
