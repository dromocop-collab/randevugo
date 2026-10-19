"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_LABELS, translate, type Locale, type Messages, type TFunction } from "./config";

type I18nValue = { locale: Locale; messages: Messages };
const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: {} });

/** Kök yerleşim (app/[lang]/layout.tsx) tarafından sarılır; sözlük yalnız İngilizcede gönderilir. */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
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
