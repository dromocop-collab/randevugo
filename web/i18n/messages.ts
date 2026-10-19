import type { Locale, Messages } from "./config";
import enCommon from "./messages/en/common.json";

// Sözlükler: dil başına klasör (messages/<dil>/*.json), konu başına dosya; burada birleştirilir.
// Anahtar = Türkçe kaynak metin, değer = o dildeki karşılık (ya da çoğul nesnesi).
// Türkçe varsayılan dil olduğu için sözlüğü yoktur. Yeni dil: aşağıya bir satır ekle.
const DICTIONARIES: Partial<Record<Locale, Messages>> = {
  en: { ...enCommon },
};

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? {};
}

/** Testler ve eksik çeviri raporu için. */
export function dictionaryLocales(): Locale[] {
  return Object.keys(DICTIONARIES) as Locale[];
}
