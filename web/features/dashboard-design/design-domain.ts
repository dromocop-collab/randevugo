// İşletme paneli tasarımı (süper admin › Panel Tasarımı) — tüm işletmelere uygulanan genel ayar.
// Belge: platformSettings/dashboardDesign (herkes okur, yalnız süper admin yazar). Saf mantık; test: design-domain.test.mjs
// Kayıttaki her alan güvensiz kabul edilir: parseDashboardDesign uzunlukları, bağlantıları ve kimlikleri süzer.

export const NAV_GROUPS = ["merkez", "operasyon", "buyume", "yonetim", "sistem"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

/** Gizlenemeyen/kapatılamayan menü öğeleri (işletme panelde kilitli kalmasın). */
export const LOCKED_NAV_HREFS = ["/dashboard", "/dashboard/ayarlar", "/dashboard/abonelik", "/dashboard/destek"] as const;

/** Özel bağlantılarda seçilebilen simgeler (arayüz bunları lucide simgelerine eşler). */
export const CUSTOM_LINK_ICONS = ["link", "book", "video", "gift", "megaphone", "star", "heart", "sparkles", "graduation", "message", "phone", "shop"] as const;
export type CustomLinkIcon = (typeof CUSTOM_LINK_ICONS)[number];

export const ANNOUNCEMENT_TONES = ["info", "success", "warning", "danger"] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];
export const ANNOUNCEMENT_AUDIENCES = ["all", "trialing", "active", "expired"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const MAX_CUSTOM_LINKS = 8;
export const MAX_TEXT_OVERRIDES = 300;

export type NavItemDesign = {
  /** Menüden gizle. */
  hidden?: boolean;
  /** Sayfayı da kapat (doğrudan adresle açılınca "kapalı" ekranı). */
  disabled?: boolean;
  label?: string;
  labelEn?: string;
  group?: NavGroup;
  order?: number;
};

export type CustomLink = {
  id: string;
  label: string;
  labelEn?: string;
  /** /dashboard/... gibi panel içi yol ya da https:// dış bağlantı. */
  href: string;
  icon: CustomLinkIcon;
  group: NavGroup;
  order: number;
  newTab: boolean;
};

export type Announcement = {
  enabled: boolean;
  id: string;
  tone: AnnouncementTone;
  title: string;
  message: string;
  linkLabel: string;
  linkHref: string;
  startsAt: number | null;
  endsAt: number | null;
  dismissible: boolean;
  audience: AnnouncementAudience;
};

export type TextOverride = { from: string; to: string; toEn?: string };

export type DashboardDesign = {
  nav: { items: Record<string, NavItemDesign>; custom: CustomLink[]; groupLabels: Partial<Record<NavGroup, string>> };
  home: { modules: Array<{ id: string; enabled: boolean }> | null; locked: boolean };
  appearance: { defaultSkin: string | null; forceSkin: boolean; allowedSkins: string[] | null };
  announcement: Announcement;
  texts: TextOverride[];
};

export const EMPTY_ANNOUNCEMENT: Announcement = {
  enabled: false, id: "", tone: "info", title: "", message: "", linkLabel: "", linkHref: "",
  startsAt: null, endsAt: null, dismissible: true, audience: "all",
};

export const EMPTY_DESIGN: DashboardDesign = {
  nav: { items: {}, custom: [], groupLabels: {} },
  home: { modules: null, locked: false },
  appearance: { defaultSkin: null, forceSkin: false, allowedSkins: null },
  announcement: EMPTY_ANNOUNCEMENT,
  texts: [],
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Tek satır metin: kontrol karakterleri ve fazla boşluk temizlenir. */
export function cleanLine(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Çok satırlı metin (duyuru mesajı): satır sonları korunur. */
function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "";
}

/**
 * Güvenli bağlantı: panel içi yol (/ ile başlar, // ve \ yok) ya da https:// dış adres.
 * javascript:, data:, http: ve göreli olmayan her şey reddedilir.
 */
export function safeHref(value: unknown): string | null {
  const href = cleanLine(value, 500);
  if (!href) return null;
  if (href.startsWith("/")) return /^\/(?![/\\])[^\s\\]*$/.test(href) ? href : null;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && url.hostname.includes(".") && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isExternalHref(href: string): boolean {
  return /^https:\/\//i.test(href);
}

function oneOf<T extends string>(value: unknown, list: readonly T[], fallback: T): T {
  return list.includes(value as T) ? value as T : fallback;
}

function millisOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value ? Date.parse(value) : NaN;
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

/** Firestore belgesini güvenli tasarıma çevirir; bilinmeyen/bozuk her alan varsayılana düşer. */
export function parseDashboardDesign(raw: unknown, knownSkins: readonly string[] = [], knownModules: readonly string[] = []): DashboardDesign {
  const data = record(raw);
  const nav = record(data.nav);
  const items: Record<string, NavItemDesign> = {};
  for (const [href, value] of Object.entries(record(nav.items)).slice(0, 60)) {
    if (!/^\/(dashboard(\/[a-z0-9-]+)*|hesabim)$/.test(href)) continue;
    const row = record(value);
    const locked = (LOCKED_NAV_HREFS as readonly string[]).includes(href);
    const entry: NavItemDesign = {};
    if (row.hidden === true && !locked) entry.hidden = true;
    if (row.disabled === true && !locked) entry.disabled = true;
    const label = cleanLine(row.label, 40);
    if (label) entry.label = label;
    const labelEn = cleanLine(row.labelEn, 40);
    if (labelEn) entry.labelEn = labelEn;
    if ((NAV_GROUPS as readonly string[]).includes(String(row.group))) entry.group = row.group as NavGroup;
    if (typeof row.order === "number" && Number.isFinite(row.order)) entry.order = Math.max(0, Math.min(999, Math.round(row.order)));
    if (Object.keys(entry).length) items[href] = entry;
  }
  const seen = new Set<string>();
  const custom: CustomLink[] = [];
  for (const value of Array.isArray(nav.custom) ? nav.custom : []) {
    const row = record(value);
    const id = cleanLine(row.id, 40);
    const label = cleanLine(row.label, 40);
    const href = safeHref(row.href);
    if (!/^[a-z0-9-]{2,40}$/.test(id) || seen.has(id) || !label || !href) continue;
    seen.add(id);
    const labelEn = cleanLine(row.labelEn, 40);
    custom.push({
      id, label, ...(labelEn ? { labelEn } : {}), href,
      icon: oneOf(row.icon, CUSTOM_LINK_ICONS, "link"),
      group: oneOf(row.group, NAV_GROUPS, "sistem"),
      order: typeof row.order === "number" && Number.isFinite(row.order) ? Math.max(0, Math.min(999, Math.round(row.order))) : 500,
      newTab: row.newTab === true || (row.newTab !== false && isExternalHref(href)),
    });
    if (custom.length >= MAX_CUSTOM_LINKS) break;
  }
  const groupLabels: Partial<Record<NavGroup, string>> = {};
  const rawGroups = record(nav.groupLabels);
  for (const group of NAV_GROUPS) {
    const label = cleanLine(rawGroups[group], 40);
    if (label) groupLabels[group] = label;
  }

  const home = record(data.home);
  let modules: Array<{ id: string; enabled: boolean }> | null = null;
  if (Array.isArray(home.modules)) {
    const ids = new Set<string>();
    modules = home.modules.flatMap((value) => {
      const row = record(value);
      const id = String(row.id ?? "");
      if (ids.has(id) || (knownModules.length && !knownModules.includes(id)) || !/^[a-z]{2,30}$/.test(id)) return [];
      ids.add(id);
      return [{ id, enabled: row.enabled !== false }];
    });
    if (!modules.length) modules = null;
  }

  const appearance = record(data.appearance);
  const skinOk = (value: unknown) => typeof value === "string" && /^[a-z]{2,20}$/.test(value) && (!knownSkins.length || knownSkins.includes(value));
  const defaultSkin = skinOk(appearance.defaultSkin) ? String(appearance.defaultSkin) : null;
  const allowed = Array.isArray(appearance.allowedSkins) ? [...new Set(appearance.allowedSkins.filter(skinOk).map(String))] : [];

  const announcement = record(data.announcement);
  const title = cleanLine(announcement.title, 80);
  const message = cleanText(announcement.message, 600);
  const linkHref = safeHref(announcement.linkHref) ?? "";
  const startsAt = millisOrNull(announcement.startsAt);
  const endsAt = millisOrNull(announcement.endsAt);

  const texts: TextOverride[] = [];
  const sources = new Set<string>();
  for (const value of Array.isArray(data.texts) ? data.texts : []) {
    const row = record(value);
    const from = typeof row.from === "string" ? row.from.trim().slice(0, 300) : "";
    const to = cleanText(row.to, 300);
    if (!from || !to || sources.has(from) || from === to) continue;
    // Değişkenli metinde ({count} vb.) yeni metin aynı değişkenleri taşımalı; yoksa sayı/ad kaybolurdu.
    if (!sameVariables(from, to)) continue;
    const toEn = cleanText(row.toEn, 300);
    sources.add(from);
    texts.push({ from, to, ...(toEn && sameVariables(from, toEn) ? { toEn } : {}) });
    if (texts.length >= MAX_TEXT_OVERRIDES) break;
  }

  return {
    nav: { items, custom, groupLabels },
    home: { modules, locked: home.locked === true && modules !== null },
    appearance: {
      defaultSkin,
      forceSkin: appearance.forceSkin === true && defaultSkin !== null,
      allowedSkins: allowed.length ? (defaultSkin && !allowed.includes(defaultSkin) ? [defaultSkin, ...allowed] : allowed) : null,
    },
    announcement: {
      enabled: announcement.enabled === true && Boolean(title || message),
      id: cleanLine(announcement.id, 40) || hashText(`${title}|${message}`),
      tone: oneOf(announcement.tone, ANNOUNCEMENT_TONES, "info"),
      title, message,
      linkLabel: linkHref ? cleanLine(announcement.linkLabel, 30) : "",
      linkHref,
      startsAt,
      endsAt: endsAt !== null && startsAt !== null && endsAt <= startsAt ? null : endsAt,
      dismissible: announcement.dismissible !== false,
      audience: oneOf(announcement.audience, ANNOUNCEMENT_AUDIENCES, "all"),
    },
    texts,
  };
}

/** {count}, {name} gibi değişken kümesi aynı mı? */
export function sameVariables(from: string, to: string): boolean {
  const vars = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort().join(",");
  return vars(from) === vars(to);
}

/** Kısa kararlı özet (duyuru kimliği: metin değişince "kapattım" tercihi sıfırlanır). */
export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export type BaseNavItem = { href: string; label: string; group: NavGroup };
export type DesignedNavItem<T extends BaseNavItem> = T & { customLabel?: string; customLabelEn?: string; external?: boolean; newTab?: boolean; customIcon?: CustomLinkIcon; customId?: string };

/**
 * Menüye tasarımı uygular: gizlenenler çıkar, ad/grup değişir, sıra (order, yoksa kod sırası) uygulanır,
 * özel bağlantılar eklenir. makeCustom: özel bağlantıyı menü öğesine çevirir (simge vb. arayüzden).
 */
export function applyNavDesign<T extends BaseNavItem>(items: readonly T[], design: DashboardDesign, makeCustom: (link: CustomLink) => T): Array<DesignedNavItem<T>> {
  const designed: Array<{ item: DesignedNavItem<T>; order: number }> = items.flatMap((item, index) => {
    const entry = design.nav.items[item.href];
    if (entry?.hidden || entry?.disabled) return [];
    return [{
      item: { ...item, group: entry?.group ?? item.group, ...(entry?.label ? { customLabel: entry.label } : {}), ...(entry?.labelEn ? { customLabelEn: entry.labelEn } : {}) },
      order: entry?.order ?? index * 10,
    }];
  });
  for (const link of design.nav.custom) {
    designed.push({
      item: { ...makeCustom(link), group: link.group, customLabel: link.label, ...(link.labelEn ? { customLabelEn: link.labelEn } : {}), external: isExternalHref(link.href), newTab: link.newTab, customIcon: link.icon, customId: link.id },
      order: link.order,
    });
  }
  return designed.map((entry, index) => ({ ...entry, index })).sort((a, b) => a.order - b.order || a.index - b.index).map((entry) => entry.item);
}

/** Bu adres süper admin tarafından kapatılmış bir bölüm mü? (alt sayfalar dahil) */
export function disabledSectionFor(pathname: string, design: DashboardDesign): string | null {
  const match = Object.entries(design.nav.items)
    .filter(([href, entry]) => entry.disabled && href !== "/dashboard" && (pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match ? match[0] : null;
}

export type AnnouncementContext = { now: number; subscriptionStatus: string | null };

/** Şu an bu işletmeye gösterilecek duyuru (tarih aralığı ve hedef kitle). */
export function activeAnnouncement(design: DashboardDesign, context: AnnouncementContext): Announcement | null {
  const item = design.announcement;
  if (!item.enabled) return null;
  if (item.startsAt !== null && context.now < item.startsAt) return null;
  if (item.endsAt !== null && context.now >= item.endsAt) return null;
  const status = context.subscriptionStatus ?? "";
  if (item.audience === "trialing" && status !== "trialing") return null;
  if (item.audience === "active" && status !== "active") return null;
  if (item.audience === "expired" && !["expired", "past_due", "cancelled", "canceled", "suspended"].includes(status)) return null;
  return item;
}

/** Metin değişiklikleri: kaynak Türkçe metin → yeni metin (dil başına). */
export function textOverrideMap(design: DashboardDesign, locale: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of design.texts) {
    const target = locale === "tr" ? row.to : row.toEn;
    if (target) map.set(row.from, target);
  }
  return map;
}

/** Ana panel kart sırası: kilitliyse tasarım, değilse kullanıcının tercihi, o da yoksa tasarımın varsayılanı. */
export function resolveHomeModules<T extends { id: string; enabled: boolean }>(userModules: T[] | null, design: DashboardDesign, normalize: (value: unknown) => T[]): T[] {
  if (design.home.modules && (design.home.locked || !userModules)) return normalize(design.home.modules);
  return userModules ?? normalize(null);
}

/** Görünüm: zorunlu tema, izinli temalar ve kullanıcı seçimi yoksa varsayılan. */
export function resolveSkin(userSkin: string | null, design: DashboardDesign, fallback: string): string {
  const { defaultSkin, forceSkin, allowedSkins } = design.appearance;
  if (forceSkin && defaultSkin) return defaultSkin;
  if (userSkin && (!allowedSkins || allowedSkins.includes(userSkin))) return userSkin;
  return defaultSkin ?? (allowedSkins?.[0] ?? fallback);
}
