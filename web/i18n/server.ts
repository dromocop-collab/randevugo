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
