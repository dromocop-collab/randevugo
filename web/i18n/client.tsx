"use client";

import { createContext, use, useCallback, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_LABELS, interpolate, translateWithPatterns, type Locale, type MessagePattern, type Messages, type TFunction } from "./config";

// Sözlükler ayrı JS parçası olarak yüklenir (tarayıcı önbelleğinde kalır); Türkçe için hiç yüklenmez.
// Yeni dil: bundles/<dil>.ts ve aşağıya bir satır.
type Bundle = { messages: Messages; patterns: MessagePattern[] };
const LOADERS: Partial<Record<Locale, () => Promise<{ default: Messages; patterns?: MessagePattern[] }>>> = {
  en: () => import("./bundles/en"),
};
const EMPTY: Bundle = { messages: {}, patterns: [] };
const cache = new Map<Locale, Promise<Bundle>>();
function loadBundle(locale: Locale): Promise<Bundle> {
  let promise = cache.get(locale);
  if (!promise) {
    const loader = LOADERS[locale];
    promise = loader ? loader().then((module) => ({ messages: module.default, patterns: module.patterns ?? [] })) : Promise.resolve(EMPTY);
    cache.set(locale, promise);
  }
  return promise;
}

/** overrides: süper adminin metin değişiklikleri (kaynak Türkçe metin → bu dildeki yeni metin). */
type I18nValue = { locale: Locale; bundle: Bundle; overrides?: ReadonlyMap<string, string> };
const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, bundle: EMPTY });

/** Kök yerleşim (app/[lang]/layout.tsx) sarar. Sözlük gelene kadar sunucudan gelen HTML görünür kalır. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const bundle = locale === DEFAULT_LOCALE ? EMPTY : use(loadBundle(locale));
  const value = useMemo(() => ({ locale, bundle }), [locale, bundle]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Alt ağaçta metin değişikliklerini uygular (işletme paneli; süper admin › Panel Tasarımı › Metinler). */
export function I18nOverrides({ overrides, children }: { overrides: ReadonlyMap<string, string>; children: ReactNode }) {
  const parent = useContext(I18nContext);
  const value = useMemo(() => (overrides.size ? { ...parent, overrides } : parent), [overrides, parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/** İstemci bileşenleri için çeviri: const t = useT(); t("Randevu al"). */
export function useT(): TFunction {
  const { locale, bundle, overrides } = useContext(I18nContext);
  return useCallback<TFunction>((source, vars) => {
    const replaced = overrides?.get(source);
    return replaced ? interpolate(replaced, vars) : translateWithPatterns(locale, bundle.messages, bundle.patterns, source, vars);
  }, [locale, bundle, overrides]);
}

/** Intl için dil etiketi: "tr-TR" / "en-GB". */
export function useIntlLocale(): string {
  return LOCALE_LABELS[useLocale()].intl;
}
