// Çok dilli site yapılandırması — saf modül (sunucu, istemci, proxy ve testler ortak kullanır).
//
// YENİ DİL EKLEMEK (ör. Almanca "de"):
//   1) LOCALES'e "de" ekle, LOCALE_LABELS'e satırını yaz (ad, Intl etiketi, yazım yönü).
//   2) i18n/messages/de/ klasörünü en/ ile aynı dosya adlarıyla oluştur ve messages.ts'te kaydet.
//   3) npm run test:unit → eksik çeviriler listelenir. Başka hiçbir dosyaya dokunmak gerekmez.
//
// Adresler:  Türkçe (varsayılan) önekiz: /kesfet      İngilizce: /en/kesfet
// İçeride her sayfa app/[lang]/... altında; proxy.ts önekiz istekleri /tr/... olarak yeniden yazar.
// Böylece CDN iki dili farklı adreslerde önbelleğe alır, Türkçe adresler ve SEO aynen kalır.

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";
/** Kullanıcının bilinçli dil seçimi (dil seçici yazar). */
export const LOCALE_COOKIE = "sr_lang";

export const LOCALE_LABELS: Record<Locale, { short: string; name: string; intl: string; og: string; dir: "ltr" | "rtl" }> = {
  tr: { short: "TR", name: "Türkçe", intl: "tr-TR", og: "tr_TR", dir: "ltr" },
  en: { short: "EN", name: "English", intl: "en-GB", og: "en_GB", dir: "ltr" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Dil ön eki almayan yollar: API, kimlik doğrulama, dosyalar ve kök meta dosyaları. */
const BYPASS_PREFIXES = ["/api/", "/_next/", "/__/", "/.well-known/"];
const BYPASS_EXACT = new Set(["/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/firebase-messaging-sw.js", "/indexnow.txt", "/favicon.ico"]);

export function isLocaleBypassPath(pathname: string): boolean {
  if (BYPASS_EXACT.has(pathname)) return true;
  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // public/ altındaki dosyalar (görseller, service worker, pwa simgeleri): son parçada uzantı var.
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return /\.[a-z0-9]{2,5}$/i.test(last);
}

/** Görünen yoldan dili ayırır: "/en/kesfet" → { locale: "en", path: "/kesfet" }; "/kesfet" → tr. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return { locale, path: "/" };
    if (pathname.startsWith(`/${locale}/`)) return { locale, path: pathname.slice(locale.length + 1) };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || "/" };
}

/**
 * Site içi mutlak yolu dile göre yazar. Dış bağlantılara, #çapa ve sorgu-yalnız adreslere,
 * API/dosya yollarına dokunmaz. "/kesfet?x=1#a" + en → "/en/kesfet?x=1#a".
 */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const match = /^([^?#]*)(.*)$/.exec(href)!;
  const pathname = match[1] || "/";
  const rest = match[2] ?? "";
  if (isLocaleBypassPath(pathname)) return href;
  const { path } = splitLocale(pathname);
  if (locale === DEFAULT_LOCALE) return `${path}${rest}`;
  return `${path === "/" ? `/${locale}` : `/${locale}${path}`}${rest}`;
}

/** Mesaj içindeki {ad} yer tutucularını doldurur. */
export function interpolate(template: string, vars?: Record<string, string | number | null | undefined>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars && vars[key] !== null && vars[key] !== undefined ? String(vars[key]) : whole));
}

/** Çoğul biçimler Intl.PluralRules kategorileriyle: { one: "{count} appointment", other: "{count} appointments" }. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Messages = Record<string, string | PluralForms>;
export type TranslateVars = Record<string, string | number | null | undefined>;

const pluralRules = new Map<Locale, Intl.PluralRules>();
function pluralCategory(locale: Locale, count: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(locale);
  if (!rules) { rules = new Intl.PluralRules(LOCALE_LABELS[locale].intl); pluralRules.set(locale, rules); }
  return rules.select(count);
}

/**
 * Türkçe kaynak metin anahtardır (gettext usulü): t("Randevu al").
 * Sözlükte karşılığı yoksa Türkçe metin gösterilir (boş ekran olmaz; test eksikleri yakalar).
 * Çoğul: karşılık bir nesne ise vars.count'a göre o dilin çoğul kategorisi seçilir (Rusça/Arapça gibi diller dahil).
 */
export function translate(locale: Locale, messages: Messages, source: string, vars?: TranslateVars): string {
  if (locale === DEFAULT_LOCALE) return interpolate(source, vars);
  // Bağlam: aynı Türkçe kelime farklı yerlerde farklı karşılık alabilir ("İptal" düğme → Cancel, durum → Canceled).
  // t("İptal", { ctx: "durum" }) önce "durum::İptal" anahtarına bakar, yoksa düz "İptal"e.
  const ctx = typeof vars?.ctx === "string" ? vars.ctx : null;
  const target = (ctx ? messages[`${ctx}::${source}`] : undefined) ?? messages[source];
  if (!target) return interpolate(source, vars);
  if (typeof target === "string") return interpolate(target, vars);
  const count = Number(vars?.count);
  const chosen = Number.isFinite(count) ? target[pluralCategory(locale, count)] ?? target.other : target.other;
  return interpolate(chosen, vars);
}

/**
 * Değişken içeren sunucu mesajları için kalıplar ("Lütfen 30 saniye bekleyin." ↔ "Lütfen {n} saniye bekleyin.").
 * Yalnız birebir eşleşme bulunamayınca denenir. Yakalanan değerler de sözlükte varsa çevrilir.
 */
export type MessagePattern = { re: RegExp; names: string[]; target: string | PluralForms };

export function compilePatterns(record: Record<string, string | PluralForms>): MessagePattern[] {
  return Object.entries(record).map(([key, target]) => {
    const names: string[] = [];
    const body = key.split(/(\{\w+\})/).map((part) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      if (name) { names.push(name); return "(.+?)"; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    return { re: new RegExp(`^${body}$`, "s"), names, target };
  });
}

/** translate + kalıplar: önce birebir anahtar, yoksa kalıplar, yoksa kaynak metin. */
export function translateWithPatterns(locale: Locale, messages: Messages, patterns: MessagePattern[], source: string, vars?: TranslateVars): string {
  const ctx = typeof vars?.ctx === "string" ? vars.ctx : null;
  if (locale === DEFAULT_LOCALE || messages[source] || (ctx && messages[`${ctx}::${source}`]) || !patterns.length) return translate(locale, messages, source, vars);
  for (const pattern of patterns) {
    const match = pattern.re.exec(source);
    if (!match) continue;
    const captured: TranslateVars = { ...vars };
    pattern.names.forEach((name, index) => {
      const value = match[index + 1];
      captured[name] = typeof messages[value] === "string" ? (messages[value] as string) : value;
    });
    return translate(locale, { [source]: pattern.target }, source, captured);
  }
  return translate(locale, messages, source, vars);
}

export type TFunction = (source: string, vars?: TranslateVars) => string;

/**
 * Çevrilecek sabit metni işaretler (kimlik fonksiyonu). Sabit listelerde kullanılır, gösterirken t() ile çevrilir:
 *   const NAV = [{ label: tk("Takvim") }];   …   {t(item.label)}
 * Böylece çeviri denetimi (i18n/check.mjs) bu metinleri de bulur.
 */
export function tk<T extends string>(source: T): T {
  return source;
}
