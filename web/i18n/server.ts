import "server-only";
import { lang } from "next/root-params";
import { DEFAULT_LOCALE, LOCALE_LABELS, isLocale, translateWithPatterns, type Locale, type TFunction } from "./config";
import { getMessages, getPatterns } from "./messages";

/** Sunucu bileşenlerinde geçerli dil (kök [lang] parametresinden). */
export async function getLocale(): Promise<Locale> {
  try {
    const value = await lang();
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Sunucu bileşenleri için çeviri fonksiyonu: const t = await getT(); t("Randevu al"). */
export async function getT(): Promise<TFunction> {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const patterns = getPatterns(locale);
  return (source, vars) => translateWithPatterns(locale, messages, patterns, source, vars);
}

export async function getIntlLocale(): Promise<string> {
  return LOCALE_LABELS[await getLocale()].intl;
}

/**
 * Görsel rotaları (opengraph-image) route handler sayılır; orada kök parametre getter'ı çalışmaz.
 * Dil, rotanın params içindeki [lang] değerinden okunur.
 */
export async function getTForParams(params: Promise<{ lang?: string }>): Promise<{ locale: Locale; t: TFunction }> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  const patterns = getPatterns(locale);
  return { locale, t: (source, vars) => translateWithPatterns(locale, messages, patterns, source, vars) };
}
