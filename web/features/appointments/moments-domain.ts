// Randevu anı özellikleri — saf mantık (test: moments-domain.test.mjs).
// Sunucu kuralları functions/src/appointment-moments-domain.ts ile aynı tutulmalı (pencere, dakika seçenekleri).

export const ARRIVAL_OPEN_BEFORE_MS = 3 * 60 * 60_000;
export const ARRIVAL_CLOSE_AFTER_MS = 30 * 60_000;
export const CUSTOMER_DELAY_OPTIONS = [5, 10, 15, 20, 30] as const;
export const BUSINESS_DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

export type ArrivalState = { status: "on_the_way" | "late"; delayMinutes: number; updatedAt?: string | null };
export type BusinessDelayState = { minutes: number; updatedAt?: string | null };

/** Bilette varış kartı ne zaman görünür: aktif randevu, başlangıçtan 3 saat önce → 30 dk sonra. */
export function arrivalPhase(status: string, startMs: number, nowMs: number): "hidden" | "soon" | "open" {
  if (!["pending", "confirmed"].includes(status) || !Number.isFinite(startMs)) return "hidden";
  if (nowMs > startMs + ARRIVAL_CLOSE_AFTER_MS) return "hidden";
  if (nowMs < startMs - ARRIVAL_OPEN_BEFORE_MS) return startMs - nowMs < 24 * 60 * 60_000 ? "soon" : "hidden";
  return "open";
}

/** Gecikme hesaba katılmış tahmini başlangıç (ms). */
export function expectedStartMs(startMs: number, delay?: BusinessDelayState | null): number {
  return startMs + Math.max(0, delay?.minutes ?? 0) * 60_000;
}

// ── Sakin saatler ──

export type ScheduleDay = { day: number; isOpen?: boolean; start?: string; end?: string };
export type BusyWindow = { day: number; startHour: number; endHour: number; load: number };

function toHour(value: string | undefined, round: "floor" | "ceil"): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]) + Number(match[2]) / 60;
  return round === "floor" ? Math.floor(hours) : Math.ceil(hours);
}

/** Gün için tam açık olduğu saat dilimleri [h, h+1). */
export function openHoursOf(day: ScheduleDay | undefined): number[] {
  if (!day?.isOpen) return [];
  const start = toHour(day.start, "ceil");
  const end = toHour(day.end, "floor");
  if (start === null || end === null || end <= start) return [];
  return Array.from({ length: end - start }, (_, index) => start + index);
}

/** Haritada gösterilecek saat aralığı (haftanın en erken açılışı → en geç kapanışı). */
export function gridHourRange(schedule: ScheduleDay[]): [number, number] | null {
  const hours = schedule.flatMap(openHoursOf);
  if (!hours.length) return null;
  return [Math.min(...hours), Math.max(...hours) + 1];
}

function windowsOfDay(grid: number[][], day: ScheduleDay): BusyWindow[] {
  const hours = openHoursOf(day);
  const windows: BusyWindow[] = [];
  for (let index = 0; index + 1 < hours.length; index += 1) {
    const first = hours[index];
    const second = hours[index + 1];
    if (second !== first + 1) continue;
    const load = Math.round(((grid[day.day]?.[first] ?? 0) + (grid[day.day]?.[second] ?? 0)) / 2);
    windows.push({ day: day.day, startHour: first, endHour: second + 1, load });
  }
  return windows;
}

/**
 * En sakin 2 saatlik pencereler (gün başına en fazla bir tane, en sakin önce) ve en yoğun pencere.
 * Ham sayı yok; grid 0-100 göreli yoğunluktur.
 */
export function busyHighlights(grid: number[][], schedule: ScheduleDay[], count = 3): { calm: BusyWindow[]; peak: BusyWindow | null } {
  const all = schedule.flatMap((day) => windowsOfDay(grid, day));
  if (!all.length) return { calm: [], peak: null };
  const bestPerDay = new Map<number, BusyWindow>();
  for (const window of all) {
    const current = bestPerDay.get(window.day);
    if (!current || window.load < current.load || (window.load === current.load && window.startHour < current.startHour)) bestPerDay.set(window.day, window);
  }
  const calm = [...bestPerDay.values()].sort((a, b) => a.load - b.load || a.day - b.day || a.startHour - b.startHour).slice(0, count);
  const peak = all.reduce((best, window) => (window.load > best.load ? window : best), all[0]);
  return { calm, peak: peak.load > 0 ? peak : null };
}

/** 0-100 → 0-4 renk basamağı. */
export function busyLevel(value: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0;
  if (value < 25) return 1;
  if (value < 50) return 2;
  if (value < 75) return 3;
  return 4;
}

// ── Kişisel ritim ──

export type RhythmAppointment = {
  businessId: string; businessName: string; businessSlug: string; serviceId: string; serviceName: string; staffId?: string;
  startAt: string; status: string;
};
export type RhythmSuggestion = {
  key: string; businessId: string; businessName: string; businessSlug: string; serviceId: string; serviceName: string; staffId?: string;
  /** Ziyaretler arası tipik gün sayısı (medyan). */
  everyDays: number; visits: number; lastAt: string; dueAt: string;
  /** Pozitif: kaç gün kaldı; negatif: kaç gün geçti. */
  daysUntil: number;
};

const DAY_MS = 86_400_000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Aynı işletmede aynı hizmeti en az 2 kez tamamlamış müşteri için "bir sonraki ziyaret" tahmini.
 * Aralık 6-150 gün dışındaysa ya da o işletmede yaklaşan randevu varsa öneri yok. Yakında olan önce.
 */
export function visitRhythm(rows: RhythmAppointment[], nowMs: number, limit = 3): RhythmSuggestion[] {
  const upcomingBusinesses = new Set(rows
    .filter((row) => ["pending", "confirmed"].includes(row.status) && Date.parse(row.startAt) > nowMs)
    .map((row) => row.businessId));
  const groups = new Map<string, RhythmAppointment[]>();
  for (const row of rows) {
    if (row.status !== "completed" || !row.businessId || !row.serviceId || !row.businessSlug) continue;
    if (!Number.isFinite(Date.parse(row.startAt)) || Date.parse(row.startAt) > nowMs) continue;
    const key = `${row.businessId}:${row.serviceId}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const suggestions: RhythmSuggestion[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2 || upcomingBusinesses.has(list[0].businessId)) continue;
    const sorted = [...list].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    // Aynı gün iki kayıt (ör. ek hizmet) tek ziyaret sayılır.
    const visits = sorted.filter((row, index) => index === 0 || Date.parse(row.startAt) - Date.parse(sorted[index - 1].startAt) >= DAY_MS / 2);
    if (visits.length < 2) continue;
    const gaps = visits.slice(1).map((row, index) => (Date.parse(row.startAt) - Date.parse(visits[index].startAt)) / DAY_MS);
    const everyDays = Math.round(median(gaps));
    if (everyDays < 6 || everyDays > 150) continue;
    const last = visits[visits.length - 1];
    const dueMs = Date.parse(last.startAt) + everyDays * DAY_MS;
    const daysUntil = Math.round((dueMs - nowMs) / DAY_MS);
    // Çok gecikmişse (2 döngüden fazla) artık ritim sayılmaz.
    if (daysUntil < -everyDays * 2) continue;
    suggestions.push({
      key, businessId: last.businessId, businessName: last.businessName, businessSlug: last.businessSlug,
      serviceId: last.serviceId, serviceName: last.serviceName, staffId: last.staffId || undefined,
      everyDays, visits: visits.length, lastAt: last.startAt, dueAt: new Date(dueMs).toISOString(), daysUntil,
    });
  }
  return suggestions.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, limit);
}
