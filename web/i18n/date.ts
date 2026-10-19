// date-fns biçimlendirme dili ve dile göre tarih kalıpları. Yeni dil eklerken buraya da satır ekleyin
// (Record<Locale, …> olduğu için eksik dil TypeScript hatası verir).
import type { Locale as DateFnsLocale } from "date-fns";
import { enGB, tr } from "date-fns/locale";
import { useLocale } from "./client";
import type { Locale } from "./config";

export const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { tr, en: enGB };

/** Gün adının yeri dile göre değişir: "12 Mart Çarşamba" / "Wednesday 12 March". */
export const DATE_PATTERNS: Record<Locale, { dayLong: string; dayShort: string; dayYearLong: string }> = {
  tr: { dayLong: "d MMMM EEEE", dayShort: "d MMM EEE", dayYearLong: "d MMMM yyyy EEEE" },
  en: { dayLong: "EEEE d MMMM", dayShort: "EEE d MMM", dayYearLong: "EEEE d MMMM yyyy" },
};

/** İstemci bileşenlerinde etkin dilin date-fns dili: format(date, "d MMMM", { locale: useDateFnsLocale() }). */
export function useDateFnsLocale(): DateFnsLocale {
  return DATE_FNS_LOCALES[useLocale()];
}

export function useDatePatterns() {
  return DATE_PATTERNS[useLocale()];
}
