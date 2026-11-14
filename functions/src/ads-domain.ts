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
  fbclid: string | null;
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
    fbclid: typeof row.fbclid === "string" && /^[A-Za-z0-9_-]{10,500}$/.test(row.fbclid.trim()) ? row.fbclid.trim() : null,
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

export type MetaInsightRow = { spend: number; impressions: number; reach: number; linkClicks: number; landingPageViews: number; videoViews: number; conversations: number };

/** Tıklayıp WhatsApp'ta konuşma başlatan kişi sayısı (Meta 7 günlük atıf). */
export const META_CONVERSATION_ACTION = "onsite_conversion.messaging_conversation_started_7d";

export function parseMetaInsight(row: Record<string, unknown> | null | undefined): MetaInsightRow {
  const num = (value: unknown) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; };
  return {
    spend: num(row?.spend),
    impressions: num(row?.impressions),
    reach: num(row?.reach),
    linkClicks: num(row?.inline_link_clicks) || metaActionCount(row?.actions, "link_click"),
    landingPageViews: metaActionCount(row?.actions, "landing_page_view"),
    videoViews: metaActionCount(row?.actions, "video_view"),
    conversations: metaActionCount(row?.actions, META_CONVERSATION_ACTION),
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

/* ── Kırılımlar: yerleşim / yaş / cinsiyet / bölge / haftanın günü ─────────────────────────────────────────── */

export type MetaBreakdownKind = "placement" | "age" | "gender" | "region" | "weekday";
/** Meta insights "breakdowns" parametresi (haftanın günü günlük satırlardan bizde hesaplanır). */
export const META_BREAKDOWN_FIELDS: Record<Exclude<MetaBreakdownKind, "weekday">, string> = {
  placement: "publisher_platform,platform_position", age: "age", gender: "gender", region: "region",
};
export function isBreakdownKind(value: unknown): value is MetaBreakdownKind {
  return value === "placement" || value === "age" || value === "gender" || value === "region" || value === "weekday";
}

const PLATFORM_LABEL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network", threads: "Threads", whatsapp: "WhatsApp" };
const POSITION_LABEL: Record<string, string> = {
  feed: "Akış", facebook_reels: "Reels", instagram_reels: "Reels", story: "Hikâye", facebook_stories: "Hikâye", instagram_stories: "Hikâye",
  explore: "Keşfet", explore_home: "Keşfet ana sayfa", instagram_explore_grid_home: "Keşfet ana sayfa", marketplace: "Marketplace", video_feeds: "Video akışı",
  instream_video: "Video içi", facebook_reels_overlay: "Reels üstü reklam", right_hand_column: "Sağ sütun", search: "Arama sonuçları",
  profile_feed: "Profil akışı", instagram_profile_feed: "Profil akışı", messenger_inbox: "Gelen kutusu", messenger_stories: "Hikâye",
  an_classic: "Uygulama ağı", rewarded_video: "Ödüllü video", threads_feed: "Akış", ig_search: "Arama sonuçları", notification: "Bildirimler",
  biz_disco_feed: "İşletme keşfi", facebook_profile_feed: "Profil akışı", unknown: "Diğer",
};
const GENDER_LABEL: Record<string, string> = { male: "Erkek", female: "Kadın", unknown: "Belirtilmemiş" };
const WEEKDAY_LABEL = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase("tr-TR")); }

/** Bir kırılım satırının anahtarı ve Türkçe etiketi. */
export function breakdownKey(kind: MetaBreakdownKind, row: Record<string, unknown>): { key: string; label: string } {
  const text = (value: unknown) => String(value ?? "").trim();
  if (kind === "placement") {
    const platform = text(row.publisher_platform) || "unknown";
    const position = text(row.platform_position) || "unknown";
    return { key: `${platform}|${position}`, label: `${PLATFORM_LABEL[platform] ?? titleCase(platform)} · ${POSITION_LABEL[position] ?? titleCase(position)}` };
  }
  if (kind === "age") { const age = text(row.age) || "unknown"; return { key: age, label: age === "unknown" ? "Bilinmiyor" : `${age} yaş` }; }
  if (kind === "gender") { const gender = text(row.gender) || "unknown"; return { key: gender, label: GENDER_LABEL[gender] ?? gender }; }
  if (kind === "region") { const region = text(row.region) || "Bilinmiyor"; return { key: region, label: region.replace(/ (Province|İli)$/i, "") }; }
  const date = text(row.date_start);
  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  // Pazartesi önce sıralansın diye anahtar 1..7 (Pazar 7).
  return weekday < 0 ? { key: "0", label: "Bilinmiyor" } : { key: String(weekday === 0 ? 7 : weekday), label: WEEKDAY_LABEL[weekday]! };
}

/** Sonuç: siteye gelen (sayfa görüntüleme) + WhatsApp'ta konuşma başlatan. */
export const metaResults = (row: Pick<MetaInsightRow, "landingPageViews" | "conversations">) => row.landingPageViews + row.conversations;

export type BreakdownRow = MetaInsightRow & {
  key: string; label: string; results: number; spendShare: number; cpc: number | null; costPerResult: number | null; ctr: number | null;
  flag: "best" | "waste" | null;
};

/**
 * Meta kırılım satırlarını gruplar, sonuç başı maliyeti hesaplar ve işaretler:
 * "waste" = harcamanın en az %10'u (ve ≥ 20 ₺) gitmiş ama hiç sonuç yok ya da sonuç başı maliyet ortalamanın 2 katından fazla;
 * "best"  = en az 3 sonuçlu satırlar içinde sonuç başı en ucuz olan.
 */
export function summarizeBreakdown(kind: MetaBreakdownKind, rows: Array<Record<string, unknown>>): { rows: BreakdownRow[]; average: number | null } {
  const groups = new Map<string, { key: string; label: string; stats: MetaInsightRow }>();
  for (const raw of rows) {
    const { key, label } = breakdownKey(kind, raw);
    const stats = parseMetaInsight(raw);
    const group = groups.get(key) ?? { key, label, stats: { spend: 0, impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0, videoViews: 0, conversations: 0 } };
    (Object.keys(stats) as Array<keyof MetaInsightRow>).forEach((field) => { group.stats[field] += stats[field]; });
    groups.set(key, group);
  }
  const all = [...groups.values()];
  const totalSpend = all.reduce((sum, group) => sum + group.stats.spend, 0);
  const totalResults = all.reduce((sum, group) => sum + metaResults(group.stats), 0);
  const average = ratio(totalSpend, totalResults);
  const result: BreakdownRow[] = all.map(({ key, label, stats }) => {
    const results = metaResults(stats);
    const costPerResult = ratio(stats.spend, results);
    const share = totalSpend ? stats.spend / totalSpend : 0;
    const heavy = share >= 0.1 && stats.spend >= 20;
    const waste = heavy && (results === 0 || (average != null && costPerResult != null && costPerResult > average * 2));
    return {
      ...stats, spend: Math.round(stats.spend * 100) / 100, key, label, results, spendShare: Math.round(share * 1000) / 10,
      cpc: ratio(stats.spend, stats.linkClicks), costPerResult,
      ctr: stats.impressions ? Math.round((stats.linkClicks / stats.impressions) * 10_000) / 100 : null,
      flag: waste ? "waste" : null,
    };
  });
  const candidates = result.filter((row) => row.results >= 3 && row.costPerResult != null);
  if (candidates.length >= 2) {
    const best = candidates.reduce((min, row) => (row.costPerResult! < min.costPerResult! ? row : min));
    best.flag = "best";
  }
  if (kind === "weekday" || kind === "age") result.sort((a, b) => a.key.localeCompare(b.key, "tr"));
  else result.sort((a, b) => b.spend - a.spend);
  return { rows: result, average };
}

/* ── Otomatik koruma: sonuç getirmeden para yakan reklam setini yakala ──────────────────────────────────────── */

export type AdGuardSettings = { enabled: boolean; minSpend: number; maxCostPerResult: number | null; autoPause: boolean };
export const AD_GUARD_DEFAULTS: AdGuardSettings = { enabled: false, minSpend: 150, maxCostPerResult: null, autoPause: false };

/** İstemciden/veritabanından gelen koruma ayarını doğrular (sınır dışı değerler kırpılır). */
export function normalizeAdGuardSettings(input: unknown): AdGuardSettings {
  const row = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const minSpend = Number(row.minSpend);
  const maxCost = Number(row.maxCostPerResult);
  return {
    enabled: row.enabled === true,
    minSpend: Number.isFinite(minSpend) && minSpend > 0 ? Math.min(5_000, Math.max(30, Math.round(minSpend))) : AD_GUARD_DEFAULTS.minSpend,
    maxCostPerResult: Number.isFinite(maxCost) && maxCost > 0 ? Math.min(5_000, Math.max(1, Math.round(maxCost * 100) / 100)) : null,
    autoPause: row.autoPause === true,
  };
}

export type AdGuardVerdict = { trigger: false } | { trigger: true; reason: "no_results" | "expensive"; message: string };

/**
 * Son 7 günün reklam seti istatistiğine bakar.
 * - Harcama ≥ minSpend ve hiç sonuç yok (sayfa görüntüleme + WhatsApp konuşması 0) → "no_results"
 * - maxCostPerResult tanımlıysa, harcama ≥ minSpend ve sonuç başı maliyet bunu aşıyorsa → "expensive"
 */
export function evaluateAdGuard(stats: Pick<MetaInsightRow, "spend" | "landingPageViews" | "conversations" | "linkClicks">, settings: AdGuardSettings): AdGuardVerdict {
  if (!settings.enabled || stats.spend < settings.minSpend) return { trigger: false };
  const results = metaResults(stats);
  const spend = Math.round(stats.spend);
  if (results === 0) {
    return { trigger: true, reason: "no_results", message: `Son 7 günde ${spend} ₺ harcandı; ${stats.linkClicks} tıklama var ama siteye gelen ya da WhatsApp'ta yazan yok.` };
  }
  const cost = stats.spend / results;
  if (settings.maxCostPerResult != null && cost > settings.maxCostPerResult) {
    return { trigger: true, reason: "expensive", message: `Son 7 günde ${spend} ₺ harcandı, ${results} sonuç: sonuç başı ${Math.round(cost)} ₺ (sınır ${settings.maxCostPerResult} ₺).` };
  }
  return { trigger: false };
}

/* ── Huni ───────────────────────────────────────────────────────────────────────────────────────────────── */

export type FunnelStep = { key: string; label: string; value: number | null; hint?: string };
export type FunnelRow = FunnelStep & { fromPrevious: number | null; fromFirst: number | null };

/** Her adım için bir önceki ve ilk adıma göre yüzde (adım verisi yoksa null; aradaki boş adım atlanır). */
export function buildFunnel(steps: FunnelStep[]): FunnelRow[] {
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const firstIndex = steps.findIndex((step) => step.value != null);
  let previous: number | null = null;
  return steps.map((step, index) => {
    const value = step.value;
    const row: FunnelRow = {
      ...step,
      fromPrevious: value != null && previous != null ? pct(value, previous) : null,
      fromFirst: value != null && index > firstIndex && firstIndex >= 0 ? pct(value, steps[firstIndex]!.value!) : null,
    };
    if (value != null) previous = value;
    return row;
  });
}

/** Ziyaret oturumunun kaynağı Meta reklamı mı (trackVisit sessionSourceLabel = utm_source)? */
export function isMetaAdSession(kind: unknown, label: unknown): boolean {
  return kind === "ads" && META_SOURCES.has(String(label ?? "").trim().toLowerCase());
}
