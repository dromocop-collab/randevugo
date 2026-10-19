import { localizeHref, splitLocale, type Locale } from "./config";

/** React dışı tarayıcı kodu için (window.location ile tam geçişler): geçerli dil adresten okunur. */
export function browserLocale(): Locale {
  return typeof window === "undefined" ? "tr" : splitLocale(window.location.pathname).locale;
}

export function localizeForBrowser(href: string): string {
  return localizeHref(href, browserLocale());
}
