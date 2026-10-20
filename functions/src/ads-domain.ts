// Reklam takibi (UTM) ve Meta Marketing API yardımcıları — saf fonksiyonlar. Test: ads-domain.test.mjs
// Web, reklam linkindeki utm_* değerlerini tarayıcıda saklar ve işletme açılırken createBusiness'a gönderir;
// sunucu bunları businessAcquisitions/{businessId} belgesine yazar (istemci okuyamaz). Süper admin › Reklamlar
// Meta harcamasını bu kayıtlarla birleştirir.

export const META_ADS_SETTINGS_PATH = "platformPrivateSettings/metaAds";
export const ATTRIBUTION_MAX_AGE_MS = 30 * 86_400_000;
/** Günlük bütçe sınırları (TL) — yanlışlıkla fazladan sıfır yazmaya karşı. */
export const META_BUDGET_MIN_TRY = 50;
export const META_BUDGET_MAX_TRY = 20_000;

export type Attribution = {
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  clickId: "fbclid" | "gclid" | null;
  landingPath: string | null;
  referrerHost: string | null;
  capturedAt: number;
};

function clean(value: unknown, max = 80): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9çğıöşü._+\-]/g, "").slice(0, max);
  return text || null;
}

/** İstemciden gelen kaynak bilgisini doğrular; geçersiz ya da 30 günden eskiyse null. */
export function sanitizeAttribution(input: unknown, now = Date.now()): Attribution | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const capturedAt = Number(row.capturedAt);
  if (!Number.isFinite(capturedAt) || capturedAt > now + 5 * 60_000 || now - capturedAt > ATTRIBUTION_MAX_AGE_MS) return null;
  const clickId = row.clickId === "fbclid" || row.clickId === "gclid" ? row.clickId : null;
  const referrerHost = clean(row.referrerHost, 120);
  const source = clean(row.source) ?? (clickId === "fbclid" ? "meta" : clickId === "gclid" ? "google" : referrerHost);
  if (!source) return null;
  const landing = typeof row.landingPath === "string" && row.landingPath.startsWith("/") ? row.landingPath.split(/[?#]/)[0]!.slice(0, 120) : null;
  return {
    source,
    medium: clean(row.medium),
    campaign: clean(row.campaign, 120),
    content: clean(row.content, 120),
    term: clean(row.term),
    clickId,
    landingPath: landing,
    referrerHost,
    capturedAt,
  };
}

const META_SOURCES = new Set(["meta", "facebook", "fb", "instagram", "ig", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "l.instagram.com", "instagram.com", "facebook.com"]);

/** Kayıt Meta reklamından mı (utm_source meta/facebook/instagram ya da fbclid)? */
export function isMetaAttribution(value: Pick<Attribution, "source" | "clickId"> | null | undefined): boolean {
  if (!value) return false;
  return value.clickId === "fbclid" || META_SOURCES.has(value.source);
}

/** Meta'dan gelen kayıtlar mı, ücretli reklam mı, organik sosyal mi — panel etiketi. */
export function attributionChannel(value: Pick<Attribution, "source" | "medium" | "clickId"> | null | undefined): "meta_ads" | "meta_organic" | "google" | "other" | "direct" {
  if (!value) return "direct";
  if (isMetaAttribution(value)) {
    const paid = value.clickId === "fbclid" || ["paid", "cpc", "ppc", "paid_social", "ads", "ad"].includes(value.medium ?? "");
    return paid ? "meta_ads" : "meta_organic";
  }
  if (value.source === "google" || value.clickId === "gclid") return "google";
  return "other";
}

export type AcquisitionRow = { attribution: Attribution | null; paid: boolean; createdAt: number };

export type CampaignSignupSummary = { key: string; source: string; campaign: string | null; channel: ReturnType<typeof attributionChannel>; signups: number; paid: number };

/** Kayıtları kaynak + kampanyaya göre gruplar (en çok kayıt üstte). */
export function summarizeSignups(rows: AcquisitionRow[]) {
  const groups = new Map<string, CampaignSignupSummary>();
  const channels: Record<string, number> = { meta_ads: 0, meta_organic: 0, google: 0, other: 0, direct: 0 };
  let paid = 0;
  for (const row of rows) {
    const channel = attributionChannel(row.attribution);
    channels[channel] = (channels[channel] ?? 0) + 1;
    if (row.paid) paid += 1;
    const source = row.attribution?.source ?? "direct";
    const campaign = row.attribution?.campaign ?? null;
    const key = `${source}|${campaign ?? ""}`;
    const group = groups.get(key) ?? { key, source, campaign, channel, signups: 0, paid: 0 };
    group.signups += 1;
    if (row.paid) group.paid += 1;
    groups.set(key, group);
  }
  return {
    total: rows.length,
    paid,
    channels,
    campaigns: [...groups.values()].sort((a, b) => b.signups - a.signups || b.paid - a.paid),
  };
}

/** Meta insights "actions" dizisinden bir eylem türünün sayısı. */
export function metaActionCount(actions: unknown, type: string): number {
  if (!Array.isArray(actions)) return 0;
  const row = actions.find((item) => (item as { action_type?: unknown })?.action_type === type) as { value?: unknown } | undefined;
  const value = Number(row?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export type MetaInsightRow = { spend: number; impressions: number; reach: number; linkClicks: number; landingPageViews: number; videoViews: number };

export function parseMetaInsight(row: Record<string, unknown> | null | undefined): MetaInsightRow {
  const num = (value: unknown) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; };
  return {
    spend: num(row?.spend),
    impressions: num(row?.impressions),
    reach: num(row?.reach),
    linkClicks: num(row?.inline_link_clicks) || metaActionCount(row?.actions, "link_click"),
    landingPageViews: metaActionCount(row?.actions, "landing_page_view"),
    videoViews: metaActionCount(row?.actions, "video_view"),
  };
}

/** Bölme sonucu (payda 0 ise null), 2 basamak. */
export function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 100) / 100;
}

/** Meta reklam hesabı kimliği: "act_123", "123" → "act_123"; geçersizse null. */
export function normalizeAdAccountId(value: unknown): string | null {
  const text = String(value ?? "").trim().replace(/^act_/i, "");
  return /^\d{6,20}$/.test(text) ? `act_${text}` : null;
}

/** TL günlük bütçeyi Meta'nın para birimi alt birimine (kuruş) çevirir; sınır dışıysa null. */
export function dailyBudgetMinorUnits(tl: unknown): number | null {
  const value = Number(tl);
  if (!Number.isFinite(value) || value < META_BUDGET_MIN_TRY || value > META_BUDGET_MAX_TRY) return null;
  return Math.round(value * 100);
}

/** Tarih aralığı: son N gün (bugün dahil), İstanbul saatine göre YYYY-MM-DD. */
export function metaDateRange(days: number, now = Date.now()): { since: string; until: string; sinceMs: number } {
  const span = [7, 14, 30, 90].includes(days) ? days : 30;
  const day = (ms: number) => new Date(ms + 3 * 3_600_000).toISOString().slice(0, 10);
  const sinceMs = now - (span - 1) * 86_400_000;
  const since = day(sinceMs);
  return { since, until: day(now), sinceMs: Date.parse(`${since}T00:00:00+03:00`) };
}
