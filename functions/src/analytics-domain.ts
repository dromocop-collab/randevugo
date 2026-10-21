import { createHmac } from "crypto";

// Ziyaretçi analitiği — saf yardımcılar. Test: analytics-domain.test.mjs
// Sayım sunucuda: ziyaretçi = HMAC(gizli anahtar, IP + tarayıcı imzası). IP saklanmaz, çerez kullanılmaz.
// Aynı ziyaretçi aynı sayfayı 30 dk içinde tekrar açarsa sayılmaz; 30 dk hareketsizlikten sonra yeni oturum başlar.
// Botlar, otomatik test tarayıcıları ve platform yöneticileri sayıma girmez.

export const VIEW_DEDUP_MS = 30 * 60_000;
export const SESSION_GAP_MS = 30 * 60_000;
export const LIVE_WINDOW_MS = 5 * 60_000;
export const DAILY_SHARDS = 5;
export const EVENT_TTL_MS = 90 * 86_400_000;

/** Sayıma girmeyen (özel) yollar: panel, hesap, randevu bağlantıları. */
const PRIVATE_PREFIXES = ["/dashboard", "/super-admin", "/admin", "/onboarding", "/hesabim", "/randevu/", "/randevu-degistir", "/musteri", "/siram", "/api/"];

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|playwright|puppeteer|selenium|phantom|webdriver|electron|curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|httpclient|preview|facebookexternalhit|whatsapp|telegram|discord|slack|vercel|uptime|monitor|pingdom|statuscake|gtmetrix|scan/i;

export function isBotUserAgent(userAgent: unknown): boolean {
  const ua = String(userAgent ?? "").trim();
  if (ua.length < 20) return true;
  return BOT_PATTERN.test(ua);
}

/** Ziyaretçi kimliği: gizli anahtarla HMAC (geri çözülemez). Aynı cihaz + aynı IP = aynı kimlik. */
export function visitorIdFor(secret: string, ip: string, userAgent: string, acceptLanguage = ""): string {
  return createHmac("sha256", secret).update(`${ip}\n${userAgent}\n${acceptLanguage.split(",")[0] ?? ""}`).digest("hex").slice(0, 32);
}

/** Yol: dil öneki ayrılır, sorgu/parça atılır, uzunluk sınırlanır. Özel yollar null. */
export function normalizeTrackedPath(raw: unknown): { path: string; lang: "tr" | "en" } | null {
  let path = String(raw ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  path = path.split(/[?#]/)[0]!.replace(/\/{2,}/g, "/");
  let lang: "tr" | "en" = "tr";
  if (path === "/en" || path.startsWith("/en/")) { lang = "en"; path = path.slice(3) || "/"; }
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, "") || path.startsWith(prefix))) return null;
  if (!/^[\p{L}\p{N}/_.~%-]*$/u.test(path)) return null;
  return { path: path.slice(0, 120), lang };
}

export type PageType = "home" | "storefront" | "booking" | "business_signup" | "business_landing" | "pricing" | "explore" | "seo" | "legal" | "auth" | "app" | "help" | "other";

/** Sayfa türü (huniler ve "en çok ilgi gören bölümler" için). */
export function pageTypeOf(path: string): PageType {
  if (path === "/") return "home";
  if (/^\/isletme\/[^/]+\/randevu/.test(path)) return "booking";
  if (/^\/isletme\/[^/]+/.test(path)) return "storefront";
  if (path.startsWith("/isletmeler/kayit")) return "business_signup";
  if (path.startsWith("/isletmeler")) return "business_landing";
  if (path.startsWith("/fiyatlar")) return "pricing";
  if (path.startsWith("/kesfet") || path.startsWith("/simdi-musait") || path.startsWith("/kategoriler")) return "explore";
  if (/^\/(sehir|mugla|online-randevu|[a-z-]+-randevu)(\/|$)/.test(path)) return "seo";
  if (/^\/(kvkk|gizlilik|cerez-politikasi|kullanim-kosullari|mesafeli-satis-sozlesmesi|on-bilgilendirme-formu|iptal-ve-iade|teslimat-ve-ifa|hesap-silme)(\/|$)/.test(path)) return "legal";
  if (/^\/(giris|kayit|sifremi-unuttum)(\/|$)/.test(path)) return "auth";
  if (path.startsWith("/mobil-uygulama")) return "app";
  if (/^\/(yardim-merkezi|iletisim|hakkimizda|ozellikler|guvenlik)(\/|$)/.test(path)) return "help";
  return "other";
}

export type Device = "mobile" | "tablet" | "desktop";

/** Basit tarayıcı imzası çözümleme (kütüphanesiz). */
export function parseUserAgent(userAgent: string, widthHint?: number | null): { device: Device; browser: string; os: string } {
  const ua = userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "Diğer";
  const browser = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera"
    : /YaBrowser/.test(ua) ? "Yandex" : /Instagram/.test(ua) ? "Instagram" : /FBAN|FBAV|FB_IAB/.test(ua) ? "Facebook"
      : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Diğer";
  let device: Device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "tablet"
    : /Mobi|iPhone|iPod|Android/.test(ua) ? "mobile" : "desktop";
  // iPadOS masaüstü Safari gibi görünür; ekran genişliği ipucu düzeltir.
  if (device === "desktop" && os === "macOS" && widthHint && widthHint > 0 && widthHint <= 1100 && /Safari/.test(ua) && !/Chrome/.test(ua)) device = "tablet";
  return { device, browser, os };
}

export type SourceKind = "direct" | "search" | "social" | "ads" | "referral" | "internal";

/** Trafik kaynağı: utm varsa o, yoksa yönlendiren alan adı. */
export function classifySource(input: { referrerHost: string | null; utmSource: string | null; utmMedium: string | null; siteHost: string }): { kind: SourceKind; label: string } {
  const utm = (input.utmSource ?? "").toLowerCase().slice(0, 40);
  const medium = (input.utmMedium ?? "").toLowerCase();
  if (utm) {
    const paid = ["paid", "cpc", "ppc", "ads", "ad", "paid_social"].includes(medium);
    const social = /meta|facebook|fb|instagram|ig|tiktok|twitter|x\.com|linkedin|youtube/.test(utm);
    return { kind: paid ? "ads" : social ? "social" : "referral", label: utm };
  }
  const host = (input.referrerHost ?? "").toLowerCase().replace(/^www\./, "");
  if (!host) return { kind: "direct", label: "Doğrudan" };
  if (host === input.siteHost || host.endsWith(`.${input.siteHost}`)) return { kind: "internal", label: "Site içi" };
  if (/(^|\.)google\.|bing\.com|yandex\.|duckduckgo\.com|yahoo\.com|ecosia\.org/.test(host)) return { kind: "search", label: host.split(".").slice(-2, -1)[0] === "co" ? host : searchName(host) };
  if (/instagram\.com|facebook\.com|fb\.com|t\.co|twitter\.com|x\.com|tiktok\.com|linkedin\.com|youtube\.com|pinterest\.|whatsapp\.com|wa\.me|t\.me/.test(host)) return { kind: "social", label: socialName(host) };
  return { kind: "referral", label: host.slice(0, 60) };
}

function searchName(host: string) {
  if (host.includes("google")) return "Google";
  if (host.includes("bing")) return "Bing";
  if (host.includes("yandex")) return "Yandex";
  if (host.includes("duckduckgo")) return "DuckDuckGo";
  return host;
}

function socialName(host: string) {
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("facebook") || host === "fb.com") return "Facebook";
  if (host === "t.co" || host.includes("twitter") || host === "x.com") return "X (Twitter)";
  if (host.includes("tiktok")) return "TikTok";
  if (host.includes("linkedin")) return "LinkedIn";
  if (host.includes("youtube")) return "YouTube";
  if (host.includes("whatsapp") || host === "wa.me") return "WhatsApp";
  if (host === "t.me") return "Telegram";
  return host;
}

/** İstanbul saatine göre gün anahtarı, saat ve haftanın günü (0 = Pazartesi). */
export function istanbulParts(ms: number): { day: string; hour: number; weekday: number } {
  const shifted = new Date(ms + 3 * 3_600_000);
  return { day: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours(), weekday: (shifted.getUTCDay() + 6) % 7 };
}

/** Firestore harita anahtarı: nokta ve ters bölü güvenli hale getirilir. */
export function mapKey(value: string): string {
  return (value || "—").replace(/\\/g, "%5C").replace(/\./g, "%2E").replace(/`/g, "%60").slice(0, 120);
}

export function unmapKey(value: string): string {
  return value.replace(/%2E/g, ".").replace(/%5C/g, "\\").replace(/%60/g, "`");
}

/** Bir gün listesi (eskiden yeniye), son gün dahil. */
export function dayRange(endMs: number, days: number): string[] {
  const out: string[] = [];
  for (let index = days - 1; index >= 0; index -= 1) out.push(istanbulParts(endMs - index * 86_400_000).day);
  return out;
}

export type DailyAggregate = {
  views: number; visitors: number; sessions: number; newVisitors: number; excluded: number;
  byPath: Record<string, number>; byType: Record<string, number>; bySource: Record<string, number>; bySourceKind: Record<string, number>;
  byDevice: Record<string, number>; byBrowser: Record<string, number>; byOs: Record<string, number>; byLang: Record<string, number>;
  byEntry: Record<string, number>; byHour: Record<string, number>; typeVisitors: Record<string, number>;
};

export function emptyAggregate(): DailyAggregate {
  return {
    views: 0, visitors: 0, sessions: 0, newVisitors: 0, excluded: 0, byPath: {}, byType: {}, bySource: {}, bySourceKind: {},
    byDevice: {}, byBrowser: {}, byOs: {}, byLang: {}, byEntry: {}, byHour: {}, typeVisitors: {},
  };
}

/** Parça (shard) belgelerini tek günlük toplamda birleştirir. */
export function mergeAggregates(rows: Array<Partial<Record<keyof DailyAggregate, unknown>>>): DailyAggregate {
  const out = emptyAggregate();
  for (const row of rows) {
    for (const key of ["views", "visitors", "sessions", "newVisitors", "excluded"] as const) out[key] += Number(row[key] ?? 0) || 0;
    for (const key of ["byPath", "byType", "bySource", "bySourceKind", "byDevice", "byBrowser", "byOs", "byLang", "byEntry", "byHour", "typeVisitors"] as const) {
      const map = row[key];
      if (!map || typeof map !== "object") continue;
      for (const [name, value] of Object.entries(map as Record<string, unknown>)) {
        out[key][unmapKey(name)] = (out[key][unmapKey(name)] ?? 0) + (Number(value) || 0);
      }
    }
  }
  return out;
}

/** Bir haritanın en büyük N girdisi. */
export function topEntries(map: Record<string, number>, count: number): Array<{ key: string; value: number }> {
  return Object.entries(map).map(([key, value]) => ({ key, value })).filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key)).slice(0, count);
}

/** Yüzde değişim (önceki 0 ise ve şimdi > 0 ise 100). */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type JourneyStep = { path: string; pageType: string; at: number };
export type Journey = {
  session: string; visitor: string; sourceKind: string; sourceLabel: string; device: string; browser: string; os: string; lang: string;
  newVisitor: boolean; startedAt: number; lastAt: number; durationMs: number; steps: JourneyStep[];
  reachedSignup: boolean; reachedBooking: boolean;
};

type RawEvent = Record<string, unknown> & { at?: { toMillis?: () => number } };

/** Son olaylardan oturum bazında ziyaretçi yolculukları (en yeni üstte). Oturum anahtarı olmayan eski olaylar tek adım sayılır. */
export function buildJourneys(events: RawEvent[], limit: number): Journey[] {
  const groups = new Map<string, Journey>();
  for (const event of events) {
    const at = typeof event.at?.toMillis === "function" ? event.at.toMillis() : Number(event.at ?? 0);
    if (!at) continue;
    const key = typeof event.session === "string" && event.session ? event.session : `${String(event.visitor ?? "?")}-${at}`;
    const step = { path: String(event.path ?? "/"), pageType: String(event.pageType ?? "other"), at };
    const journey = groups.get(key);
    if (!journey) {
      groups.set(key, {
        session: key, visitor: String(event.visitor ?? ""), sourceKind: String(event.sourceKind ?? "direct"), sourceLabel: String(event.sourceLabel ?? ""),
        device: String(event.device ?? ""), browser: String(event.browser ?? ""), os: String(event.os ?? ""), lang: String(event.lang ?? "tr"),
        newVisitor: event.newVisitor === true, startedAt: at, lastAt: at, durationMs: 0, steps: [step],
        reachedSignup: step.pageType === "business_signup", reachedBooking: step.pageType === "booking",
      });
      continue;
    }
    journey.steps.push(step);
    journey.startedAt = Math.min(journey.startedAt, at);
    journey.lastAt = Math.max(journey.lastAt, at);
    if (event.newSession === true) {
      // Oturumun ilk olayı kaynağın asıl sahibidir.
      journey.sourceKind = String(event.sourceKind ?? journey.sourceKind);
      journey.sourceLabel = String(event.sourceLabel ?? journey.sourceLabel);
      journey.newVisitor = event.newVisitor === true;
    }
    if (step.pageType === "business_signup") journey.reachedSignup = true;
    if (step.pageType === "booking") journey.reachedBooking = true;
  }
  return [...groups.values()]
    .map((journey) => ({ ...journey, steps: journey.steps.sort((a, b) => a.at - b.at).slice(0, 30), durationMs: journey.lastAt - journey.startedAt }))
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, limit);
}
