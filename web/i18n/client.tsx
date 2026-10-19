"use client";

import { createContext, use, useCallback, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_LABELS, translate, type Locale, type Messages, type TFunction } from "./config";

// Sözlükler ayrı JS parçası olarak yüklenir (tarayıcı önbelleğinde kalır); Türkçe için hiç yüklenmez.
// Yeni dil: bundles/<dil>.ts ve aşağıya bir satır.
const LOADERS: Partial<Record<Locale, () => Promise<{ default: Messages }>>> = {
  en: () => import("./bundles/en"),
};
const EMPTY: Messages = {};
const cache = new Map<Locale, Promise<Messages>>();
function loadMessages(locale: Locale): Promise<Messages> {
  let promise = cache.get(locale);
  if (!promise) {
    const loader = LOADERS[locale];
    promise = loader ? loader().then((module) => module.default) : Promise.resolve(EMPTY);
    cache.set(locale, promise);
  }
  return promise;
}

type I18nValue = { locale: Locale; messages: Messages };
const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: EMPTY });

/** Kök yerleşim (app/[lang]/layout.tsx) sarar. Sözlük gelene kadar sunucudan gelen HTML görünür kalır. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const messages = locale === DEFAULT_LOCALE ? EMPTY : use(loadMessages(locale));
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/** İstemci bileşenleri için çeviri: const t = useT(); t("Randevu al"). */
export function useT(): TFunction {
  const { locale, messages } = useContext(I18nContext);
  return useCallback<TFunction>((source, vars) => translate(locale, messages, source, vars), [locale, messages]);
}

/** Intl için dil etiketi: "tr-TR" / "en-GB". */
export function useIntlLocale(): string {
  return LOCALE_LABELS[useLocale()].intl;
}
