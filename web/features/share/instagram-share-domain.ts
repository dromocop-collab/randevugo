/**
 * Instagram paylaşım görseli için saf yardımcılar (React/Firebase/Next yok).
 * node --test ile doğrudan çalışabilsin diye "@/..." takma adı kullanılmaz.
 */
import { STORE_HOST, formatTry } from "../businesses/setup-helpers.ts";

export type ShareFormat = "story" | "post";

/** Instagram Hikâye (9:16) ve dikey gönderi (4:5) ölçüleri. */
export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

/** URL'deki `boyut` değeri: varsayılan hikâye; "gonderi"/"post"/"feed" dikey gönderi. */
export function parseShareFormat(value: string | null | undefined): ShareFormat {
  const clean = (value ?? "").trim().toLocaleLowerCase("tr-TR");
  return clean === "gonderi" || clean === "gönderi" || clean === "post" || clean === "feed" ? "post" : "story";
}

function encodeSlug(slug: string): string {
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* geçersiz kodlama: olduğu gibi kullan */ }
  return encodeURIComponent(decoded);
}

/**
 * Görsel uç noktasının göreli yolu. `version` (işletmenin updatedAt'i) CDN önbellek anahtarını
 * değiştirir; işletme güncellenince paylaşılan görsel de tazelenir.
 */
export function shareImagePath(slug: string, format: ShareFormat, version?: unknown): string {
  const params = new URLSearchParams();
  params.set("boyut", format === "post" ? "gonderi" : "hikaye");
  const v = versionToken(version);
  if (v) params.set("v", v);
  return `/isletme/${encodeSlug(slug)}/instagram-gorseli?${params.toString()}`;
}

/**
 * updatedAt → kısa sürüm anahtarı; okunamazsa boş. Sunucudan gelen işletme verisinde updatedAt
 * ISO metin, epoch, Firestore Timestamp ({seconds}) ya da onun JSON/metin hâli olabilir.
 */
export function versionToken(version: unknown): string {
  if (version === null || version === undefined || version === "") return "";
  let millis = Number.NaN;
  if (typeof version === "number") millis = version;
  else if (typeof version === "string") {
    const seconds = /seconds=(\d+)/.exec(version);
    millis = seconds ? Number(seconds[1]) * 1000 : Date.parse(version);
  } else if (typeof version === "object") {
    const record = version as { seconds?: unknown; _seconds?: unknown; toMillis?: () => number };
    if (typeof record.toMillis === "function") millis = record.toMillis();
    else if (typeof record.seconds === "number") millis = record.seconds * 1000;
    else if (typeof record._seconds === "number") millis = record._seconds * 1000;
  }
  return Number.isFinite(millis) && millis > 0 ? Math.floor(millis / 1000).toString(36) : "";
}

export function shareFileName(slug: string, format: ShareFormat): string {
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* olduğu gibi */ }
  const safe = decoded.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "isletme";
  return `${safe}-instagram-${format === "post" ? "gonderi" : "hikaye"}.png`;
}

/** Görselde yazan kısa adres: "seninrandevun.com/isletme/<slug>". */
export function shareDisplayUrl(slug: string): string {
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* olduğu gibi */ }
  return `${STORE_HOST}/isletme/${decoded}`;
}

export function clampText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** 4.8 → "4,8" (Türkçe ondalık). */
export function formatRating(rating: number): string {
  return (Math.round(rating * 10) / 10).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export type ShowcaseServiceInput = {
  name: string;
  price: number;
  currency?: string;
  durationMinutes?: number;
  isActive?: boolean;
  isBookableOnline?: boolean;
  sortOrder?: number;
};

export type ShowcaseService = { name: string; priceLabel: string | null; durationLabel: string | null };

export function formatPriceLabel(price: number, currency = "TRY"): string | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  if (currency === "TRY") return formatTry(price);
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return formatTry(price);
  }
}

function durationLabel(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

/**
 * Vitrinde öne çıkacak hizmetler: aktif + online alınabilir, menü sırasına göre; fiyatı olanlar önce.
 * Aynı adlı hizmetler (farklı uzman/şube kopyaları) tek satır olur.
 */
export function pickShowcaseServices(services: readonly ShowcaseServiceInput[], limit: number): ShowcaseService[] {
  const seen = new Set<string>();
  const rows = services
    .filter((service) => service.isActive !== false && service.isBookableOnline !== false && service.name?.trim())
    .map((service, index) => ({ service, index }))
    .sort((a, b) => {
      const priced = Number(b.service.price > 0) - Number(a.service.price > 0);
      if (priced) return priced;
      const order = (a.service.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.service.sortOrder ?? Number.MAX_SAFE_INTEGER);
      return order || a.index - b.index;
    })
    .filter(({ service }) => {
      const key = service.name.trim().toLocaleLowerCase("tr-TR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return rows.slice(0, Math.max(0, limit)).map(({ service }) => ({
    name: clampText(service.name, 34),
    priceLabel: formatPriceLabel(service.price, service.currency ?? "TRY"),
    durationLabel: durationLabel(service.durationMinutes),
  }));
}

/** Görseldeki başlık yazı boyutu: uzun adlar küçülür, en fazla iki satır. */
export function titleFontSize(name: string, format: ShareFormat): number {
  const length = name.length;
  if (format === "story") return length > 30 ? 64 : length > 18 ? 78 : 92;
  return length > 30 ? 52 : length > 18 ? 62 : 72;
}
