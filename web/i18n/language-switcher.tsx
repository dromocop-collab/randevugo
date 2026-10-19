"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, LOCALE_LABELS, localizeHref, splitLocale, type Locale } from "./config";
import { useLocale } from "./client";
import styles from "./language-switcher.module.css";

const SUGGEST_DISMISS_KEY = "sr-lang-suggest-dismissed";

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Aynı sayfanın diğer dildeki adresine tam sayfa geçiş (kök yerleşim ve <html lang> yeniden kurulur). */
export function switchLocale(target: Locale) {
  rememberLocale(target);
  const { path } = splitLocale(window.location.pathname);
  window.location.assign(localizeHref(`${path}${window.location.search}${window.location.hash}`, target));
}

/**
 * Dil seçici. variant="pill": koyu/açık başlıklarda küçük düğme + menü; variant="list": ayarlar sayfası için satırlar.
 * Diller config.ts'teki LOCALES listesinden gelir; yeni dil eklenince kendiliğinden görünür.
 */
export function LanguageSwitcher({ variant = "pill", tone = "light", className }: { variant?: "pill" | "list"; tone?: "light" | "dark"; className?: string }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  if (variant === "list") {
    return (
      <div className={`${styles.list} ${className ?? ""}`} role="radiogroup" aria-label="Dil / Language">
        {LOCALES.map((item) => (
          <button key={item} type="button" role="radio" aria-checked={item === locale} className={styles.listItem} onClick={() => { if (item !== locale) switchLocale(item); }}>
            <span className={styles.code}>{LOCALE_LABELS[item].short}</span>
            <span className={styles.name} lang={item}>{LOCALE_LABELS[item].name}</span>
            {item === locale ? <Check size={16} aria-hidden /> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${styles.root} ${tone === "dark" ? styles.dark : ""} ${className ?? ""}`}>
      <button type="button" className={styles.trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} title="Dil / Language">
        <Globe size={15} aria-hidden />
        <span>{LOCALE_LABELS[locale].short}</span>
        <ChevronDown size={13} aria-hidden className={styles.chevron} />
      </button>
      {open ? (
        <div id={menuId} role="menu" className={styles.menu}>
          {LOCALES.map((item) => (
            <button key={item} type="button" role="menuitemradio" aria-checked={item === locale} className={styles.menuItem} onClick={() => { setOpen(false); if (item !== locale) switchLocale(item); }}>
              <span className={styles.code}>{LOCALE_LABELS[item].short}</span>
              <span lang={item}>{LOCALE_LABELS[item].name}</span>
              {item === locale ? <Check size={15} aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Tarayıcı dili Türkçe değilse ve kullanıcı henüz dil seçmediyse, Türkçe sayfada küçük bir öneri gösterir.
 * Otomatik yönlendirme YAPMAZ (arama motorları Türkçe sayfaları görmeye devam etsin).
 */
export function LanguageSuggestion() {
  const locale = useLocale();
  const [suggested, setSuggested] = useState<Locale | null>(null);

  useEffect(() => {
    if (locale !== DEFAULT_LOCALE) return;
    try {
      if (document.cookie.split("; ").some((part) => part.startsWith(`${LOCALE_COOKIE}=`))) return;
      if (window.localStorage.getItem(SUGGEST_DISMISS_KEY)) return;
    } catch { return; }
    const preferred = (navigator.languages ?? [navigator.language]).map((tag) => tag.toLowerCase().split("-")[0]);
    if (preferred[0] === DEFAULT_LOCALE) return;
    const match = preferred.find((tag): tag is Locale => LOCALES.includes(tag as Locale) && tag !== DEFAULT_LOCALE);
    if (match) queueMicrotask(() => setSuggested(match));
  }, [locale]);

  if (!suggested) return null;
  const dismiss = () => {
    rememberLocale(DEFAULT_LOCALE);
    try { window.localStorage.setItem(SUGGEST_DISMISS_KEY, "1"); } catch { /* depolama kapalı olabilir */ }
    setSuggested(null);
  };
  return (
    <div className={styles.suggest} role="dialog" aria-label={LOCALE_LABELS[suggested].name} lang={suggested}>
      <Globe size={18} aria-hidden />
      <span>{suggested === "en" ? "This page is also available in English." : LOCALE_LABELS[suggested].name}</span>
      <button type="button" className={styles.suggestPrimary} onClick={() => switchLocale(suggested)}>{suggested === "en" ? "Switch to English" : LOCALE_LABELS[suggested].name}</button>
      <button type="button" className={styles.suggestClose} onClick={dismiss} aria-label="Türkçe devam et / Keep Turkish"><X size={16} aria-hidden /></button>
    </div>
  );
}
