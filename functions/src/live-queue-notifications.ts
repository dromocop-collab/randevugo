import type { QueueStatus } from "./live-queue-domain.js";
import type { WaitResult } from "./live-queue-wait-engine.js";

export type QueueNoticeKind = "almost_ready" | "called" | "no_show" | "expired" | "business_cancelled";
export const CALLED_GRACE_MINUTES = 10;
export const ETA_OPTIONS = [5, 10, 15, 20] as const;

export function isDeclaredEta(value: unknown): value is typeof ETA_OPTIONS[number] {
  return typeof value === "number" && ETA_OPTIONS.some((option) => option === value);
}

export function isCalledOverdue(calledAtMs: number | null, nowMs: number): boolean {
  return calledAtMs !== null && Number.isFinite(calledAtMs) &&
    nowMs >= calledAtMs + CALLED_GRACE_MINUTES * 60_000;
}

export function shouldExpirePreviousBusinessDay(status: QueueStatus, businessDayKey: string, todayKey: string): boolean {
  return (status === "waiting" || status === "on_the_way" || status === "called") &&
    /^\d{4}-\d{2}-\d{2}$/.test(businessDayKey) && businessDayKey < todayKey;
}

export function statusNotice(before: QueueStatus | null, after: QueueStatus, cancelledBy?: string): QueueNoticeKind | null {
  if (before === after || before === null) return null;
  if (after === "called") return "called";
  if (after === "no_show") return "no_show";
  if (after === "expired") return "expired";
  if (after === "cancelled" && cancelledBy === "business") return "business_cancelled";
  return null;
}

export function shouldSendAlmostReady(status: QueueStatus, estimate: WaitResult): boolean {
  return (status === "waiting" || status === "on_the_way") &&
    estimate.peopleAhead !== null && estimate.peopleAhead <= 1 &&
    estimate.minWaitMinutes !== null && estimate.minWaitMinutes <= 20;
}

export function noticeCopy(kind: QueueNoticeKind): { title: string; body: string } {
  switch (kind) {
    case "almost_ready": return { title: "Sıran yaklaşıyor", body: "İşletmeye yakın olmanı öneriyoruz. Sıranı kontrol et." };
    case "called": return { title: "Sıran geldi", body: "İşletme seni bekliyor. Sıranı kontrol et." };
    case "no_show": return { title: "Canlı sıran sonlandırıldı", body: "İşletme seni gelmedi olarak işaretledi." };
    case "expired": return { title: "Canlı sıran sona erdi", body: "Sıranın güncel durumunu kontrol et." };
    case "business_cancelled": return { title: "Canlı sıran iptal edildi", body: "Sıranın güncel durumunu kontrol et." };
  }
}
