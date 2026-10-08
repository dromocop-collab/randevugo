/**
 * İşletme yardımcısı (herkese açık sayfalarda işletme hesabı için mini panel) — saf yardımcılar.
 * Firebase/React bağımlılığı yok; node --test ile birim testleri var (companion-domain.test.mjs).
 */

export type CompanionRole = "owner" | "admin" | "manager" | "staff";

export type CompanionStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface CompanionAppointment {
  id: string;
  customerName: string;
  serviceName?: string;
  staffName?: string;
  startAtMs: number;
  endAtMs?: number;
  status: CompanionStatus;
  createdAtMs?: number;
  createdByUid?: string;
  source?: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Panel/oturum/bilet ekranları: yardımcı burada görünmez (panelin kendi bildirimleri var). */
const EXCLUDED_PREFIXES = [
  "/dashboard",
  "/super-admin",
  "/admin",
  "/onboarding",
  "/giris",
  "/kayit",
  "/musteri",
  "/sifremi-unuttum",
  "/isletmeler/giris",
  "/isletmeler/kayit",
  "/randevu",
  "/api",
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Herkese açık (pazarlama kabuklu) bir sayfa mı? */
export function isCompanionRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return false;
  // Randevu sihirbazı tam ekran akış: /isletme/<slug>/randevu
  if (/^\/isletme\/[^/]+\/randevu(\/|$)/.test(pathname)) return false;
  return true;
}

/** /isletme/<slug> vitrin sayfasıysa slug'ı döndürür (alt sayfalar hariç). */
export function storefrontSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const match = /^\/isletme\/([^/?#]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Yönetim rolü (sahip/yönetici/müdür) mü? Çalışan yalnızca kendi randevularını görür. */
export function isManagerRole(role: CompanionRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

/** "Onayla" butonu: firestore.rules ile aynı kapsam (yönetici veya manageAppointments izni olan çalışan). */
export function canConfirmAppointments(
  role: CompanionRole | null | undefined,
  permissions?: { manageAppointments?: boolean } | null,
): boolean {
  if (isManagerRole(role)) return true;
  return role === "staff" && permissions?.manageAppointments === true;
}

/** Firestore Timestamp / ISO metin / Date / sayı → milisaniye. */
export function toMillis(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : undefined;
  if (typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

const STATUSES: CompanionStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Firestore belgesini yardımcının küçük modeline çevirir; startAt yoksa null. */
export function toCompanionAppointment(id: string, data: Record<string, unknown>): CompanionAppointment | null {
  const startAtMs = toMillis(data.startAt);
  if (startAtMs === undefined) return null;
  const status = STATUSES.includes(data.status as CompanionStatus) ? (data.status as CompanionStatus) : "confirmed";
  return {
    id,
    customerName: text(data.customerName) ?? "Müşteri",
    serviceName: text(data.serviceName),
    staffName: text(data.staffName),
    startAtMs,
    endAtMs: toMillis(data.endAt),
    status,
    createdAtMs: toMillis(data.createdAt),
    createdByUid: text(data.createdByUid),
    source: text(data.source),
  };
}

function isActive(item: CompanionAppointment) {
  return item.status === "pending" || item.status === "confirmed";
}

/**
 * Dinleyicide "eklendi" olarak gelen belgelerden gerçekten YENİ olanları seçer.
 * - Daha önce görülen (ilk anlık görüntü dahil) belgeler atlanır.
 * - Sayfa açılmadan önce oluşturulanlar (sinceMs) atlanır.
 * - Kullanıcının kendi oluşturduğu (panelden) ve iptal edilmiş randevular duyurulmaz.
 * Dönen `seen` yeni bir Set'tir (girdi değiştirilmez).
 */
export function pickNewArrivals(input: {
  added: CompanionAppointment[];
  seen: ReadonlySet<string>;
  sinceMs: number;
  selfUid?: string | null;
}): { fresh: CompanionAppointment[]; seen: Set<string> } {
  const seen = new Set(input.seen);
  const fresh: CompanionAppointment[] = [];
  for (const item of input.added) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.createdAtMs !== undefined && item.createdAtMs < input.sinceMs) continue;
    if (input.selfUid && item.createdByUid === input.selfUid) continue;
    if (!isActive(item)) continue;
    fresh.push(item);
  }
  return { fresh, seen };
}

/** Kuyruğa ekler: aynı randevu iki kez girmez, en fazla `max` kart tutulur (en eskiler düşer). */
export function enqueueArrivals(
  queue: CompanionAppointment[],
  incoming: CompanionAppointment[],
  max = 5,
): CompanionAppointment[] {
  const ids = new Set(queue.map((item) => item.id));
  const next = [...queue];
  for (const item of incoming) {
    if (ids.has(item.id)) continue;
    ids.add(item.id);
    next.push(item);
  }
  return next.length > max ? next.slice(next.length - max) : next;
}

export function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function localDayKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface DaySummary {
  /** İptal/gelmedi hariç bugünkü randevu sayısı. */
  total: number;
  /** Henüz bitmemiş (devam eden + gelecek) aktif randevular. */
  remaining: number;
  completed: number;
  current: CompanionAppointment | null;
  next: CompanionAppointment | null;
  upcoming: CompanionAppointment[];
}

/** Bugünün listesinden özet: sıradaki randevu, devam eden, kalan sayısı ve sonraki `take` randevu. */
export function summarizeDay(list: CompanionAppointment[], nowMs: number, take = 3): DaySummary {
  const counted = list.filter((item) => item.status !== "cancelled" && item.status !== "no_show");
  const sorted = [...counted].sort((a, b) => a.startAtMs - b.startAtMs);
  const active = sorted.filter(isActive);
  const endOf = (item: CompanionAppointment) => item.endAtMs ?? item.startAtMs + 30 * MINUTE;
  const current = active.find((item) => item.startAtMs <= nowMs && endOf(item) > nowMs) ?? null;
  const future = active.filter((item) => item.startAtMs > nowMs);
  return {
    total: counted.length,
    remaining: active.filter((item) => endOf(item) > nowMs).length,
    completed: counted.filter((item) => item.status === "completed").length,
    current,
    next: future[0] ?? null,
    upcoming: future.slice(0, take),
  };
}

/** Onay bekleyen ve henüz geçmemiş randevular (bugünden itibaren), saate göre. */
export function pendingUpcoming(list: CompanionAppointment[], nowMs: number): CompanionAppointment[] {
  const from = startOfLocalDay(nowMs);
  return list
    .filter((item) => item.status === "pending" && item.startAtMs >= from)
    .sort((a, b) => a.startAtMs - b.startAtMs);
}

/** "şimdi", "12 dk", "1 sa 5 dk", "2 gün". */
export function formatCountdown(ms: number): string {
  if (ms < MINUTE) return "şimdi";
  const minutes = Math.floor(ms / MINUTE);
  if (minutes < 60) return `${minutes} dk`;
  if (ms >= DAY) return `${Math.floor(ms / DAY)} gün`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** "Bugün 14:30", "Yarın 09:00", "12 Eki Pzt 10:15". */
export function formatWhen(ms: number, nowMs: number): string {
  const diffDays = Math.round((startOfLocalDay(ms) - startOfLocalDay(nowMs)) / DAY);
  const clock = formatClock(ms);
  if (diffDays === 0) return `Bugün ${clock}`;
  if (diffDays === 1) return `Yarın ${clock}`;
  if (diffDays === -1) return `Dün ${clock}`;
  const date = new Date(ms);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${DAY_NAMES[date.getDay()]} ${clock}`;
}

export function statusLabel(status: CompanionStatus): string {
  switch (status) {
    case "pending": return "Onay bekliyor";
    case "confirmed": return "Onaylandı";
    case "completed": return "Tamamlandı";
    case "cancelled": return "İptal edildi";
    case "no_show": return "Gelmedi";
  }
}

/** Ekran okuyucu duyurusu ve bildirim gövdesi. */
export function arrivalSentence(item: CompanionAppointment, nowMs: number): string {
  const parts = [`${item.customerName}`, item.serviceName, formatWhen(item.startAtMs, nowMs), item.staffName].filter(Boolean);
  return `Yeni randevu: ${parts.join(", ")}. ${statusLabel(item.status)}.`;
}

/** Başlatıcı rozeti: önce onay bekleyen, yoksa bugün kalan randevu sayısı. */
export function launcherBadge(pendingCount: number, remainingToday: number): { value: number; tone: "alert" | "info" } | null {
  if (pendingCount > 0) return { value: pendingCount, tone: "alert" };
  if (remainingToday > 0) return { value: remainingToday, tone: "info" };
  return null;
}

/** Panel derin bağlantıları. */
export const companionLinks = {
  appointment: (id: string) => `/dashboard/randevular?appointment=${encodeURIComponent(id)}`,
  appointments: "/dashboard/randevular",
  pending: "/dashboard/randevular?status=pending",
  calendar: "/dashboard/takvim",
  newAppointment: "/dashboard?yeniRandevu=1",
  settings: "/dashboard/ayarlar",
  companionSettings: "/dashboard/ayarlar?tab=randevu",
  analytics: "/dashboard/analitik",
  dashboard: "/dashboard",
  storefront: (slug: string) => `/isletme/${encodeURIComponent(slug)}`,
};
