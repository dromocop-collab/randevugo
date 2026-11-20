// Randevu anı özellikleri (saf mantık, test: appointment-moments-domain.test.mjs):
//  1) Varış durumu — müşteri biletten "Yoldayım" / "X dk gecikeceğim" der, işletme anında görür.
//  2) İşletme gecikmesi — işletme "X dk gecikmeliyiz" der; müşterinin biletinde ve bildiriminde görünür,
//     istenirse aynı uzmanın bugünkü sonraki randevularına da yansır.
//  3) Sakin saatler — son haftaların randevu yoğunluğu (gün × saat), vitrinde "ne zaman gelsem?" haritası.

export const ARRIVAL_STATUSES = ["on_the_way", "late", "clear"] as const;
export type ArrivalStatus = (typeof ARRIVAL_STATUSES)[number];
export const CUSTOMER_DELAY_OPTIONS = [5, 10, 15, 20, 30] as const;
export const BUSINESS_DELAY_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60] as const;
/** Varış bildirimi randevudan en erken bu kadar önce açılır. */
export const ARRIVAL_OPEN_BEFORE_MS = 3 * 60 * 60_000;
/** Başlangıçtan sonra bu kadar süre daha "gecikiyorum" denebilir. */
export const ARRIVAL_CLOSE_AFTER_MS = 30 * 60_000;
export const MAX_ARRIVAL_UPDATES = 6;

export type ArrivalWindow = { open: true } | { open: false; reason: "status" | "too_early" | "too_late" };

export function arrivalWindow(status: unknown, startMs: number, nowMs: number): ArrivalWindow {
  if (!["pending", "confirmed"].includes(String(status))) return { open: false, reason: "status" };
  if (!Number.isFinite(startMs) || startMs <= 0) return { open: false, reason: "status" };
  if (nowMs < startMs - ARRIVAL_OPEN_BEFORE_MS) return { open: false, reason: "too_early" };
  if (nowMs > startMs + ARRIVAL_CLOSE_AFTER_MS) return { open: false, reason: "too_late" };
  return { open: true };
}

export type ArrivalInput = { status: ArrivalStatus; delayMinutes: number };

/** İstemci girdisini doğrular; geçersizse null. "late" yalnız izinli dakikalarla. */
export function normalizeArrivalInput(raw: { status?: unknown; delayMinutes?: unknown }): ArrivalInput | null {
  const status = String(raw.status ?? "") as ArrivalStatus;
  if (!ARRIVAL_STATUSES.includes(status)) return null;
  if (status !== "late") return { status, delayMinutes: 0 };
  const minutes = Number(raw.delayMinutes);
  if (!(CUSTOMER_DELAY_OPTIONS as readonly number[]).includes(minutes)) return null;
  return { status, delayMinutes: minutes };
}

export function normalizeBusinessDelay(raw: unknown): number | null {
  const minutes = Number(raw);
  return (BUSINESS_DELAY_OPTIONS as readonly number[]).includes(minutes) ? minutes : null;
}

/** İşletmeye giden bildirim metni (Türkçe; panel ve push aynı ifadeyi kullanır). */
export function arrivalPushText(input: ArrivalInput, customerName: string, timeText: string): { title: string; body: string } | null {
  const who = customerName.trim().slice(0, 60) || "Müşteri";
  if (input.status === "on_the_way") return { title: "Müşteri yolda", body: `${who} yola çıktı · randevu ${timeText}` };
  if (input.status === "late") return { title: `${input.delayMinutes} dk gecikecek`, body: `${who} yaklaşık ${input.delayMinutes} dk geç gelecek · randevu ${timeText}` };
  return null;
}

export function businessDelayPushText(minutes: number, businessName: string, timeText: string): { title: string; body: string } {
  const name = businessName.trim().slice(0, 60) || "İşletme";
  if (minutes <= 0) return { title: "Randevunuz zamanında", body: `${name} artık gecikmeli değil · randevu ${timeText}` };
  return { title: `${name} ~${minutes} dk gecikmeli`, body: `Acele etmenize gerek yok; randevunuz ${timeText} yerine yaklaşık ${minutes} dk sonra başlayacak.` };
}

/** Gecikme yayılımı: aynı uzmanın, seçilen randevudan sonra başlayan bugünkü aktif randevuları. */
export function cascadeTargets<T extends { id: string; staffId?: unknown; status?: unknown; startMs: number }>(
  rows: T[], anchor: { id: string; staffId: string; startMs: number }, dayEndMs: number,
): T[] {
  if (!anchor.staffId) return [];
  return rows.filter((row) => row.id !== anchor.id
    && String(row.staffId ?? "") === anchor.staffId
    && ["pending", "confirmed"].includes(String(row.status))
    && row.startMs > anchor.startMs && row.startMs < dayEndMs);
}

// ── Sakin saatler ──

export const BUSY_WEEKS = 8;
export const BUSY_MIN_SAMPLE = 12;
export const BUSY_CACHE_MS = 12 * 60 * 60_000;

export type BusyAppointment = { startMs: number; endMs: number; status: unknown };
export type BusyHours = {
  /** 7 gün (0 = Pazar) × 24 saat; 0-100 göreli yoğunluk (en yoğun saat = 100). */
  grid: number[][];
  /** Hesaba giren randevu sayısı. */
  sample: number;
  weeks: number;
  enough: boolean;
};

function zonedParts(ms: number, formatter: Intl.DateTimeFormat): { day: number; hour: number; minute: number } {
  const parts = formatter.formatToParts(new Date(ms));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day: Math.max(0, weekday), hour: Number(get("hour")) % 24, minute: Number(get("minute")) };
}

/**
 * Randevuların kapladığı saat dilimlerini sayar (30 dk'lık adımlarla; bir saatin yarısını dolduran randevu 0,5 sayılır).
 * İptal ve "gelmedi" sayılmaz. Sonuç en yoğun hücreye göre 0-100'e ölçeklenir; ham sayı dışarı verilmez.
 */
export function computeBusyHours(rows: BusyAppointment[], timeZone = "Europe/Istanbul", weeks = BUSY_WEEKS): BusyHours {
  const counts = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  }
  let sample = 0;
  for (const row of rows) {
    if (["cancelled", "no_show"].includes(String(row.status))) continue;
    if (!Number.isFinite(row.startMs) || row.startMs <= 0) continue;
    const end = Number.isFinite(row.endMs) && row.endMs > row.startMs ? Math.min(row.endMs, row.startMs + 8 * 60 * 60_000) : row.startMs + 30 * 60_000;
    sample += 1;
    for (let cursor = row.startMs; cursor < end; cursor += 30 * 60_000) {
      const { day, hour } = zonedParts(cursor, formatter);
      counts[day][hour] += 0.5;
    }
  }
  const max = Math.max(0, ...counts.flat());
  const grid = counts.map((day) => day.map((value) => (max > 0 ? Math.round((value / max) * 100) : 0)));
  return { grid, sample, weeks, enough: sample >= BUSY_MIN_SAMPLE };
}
