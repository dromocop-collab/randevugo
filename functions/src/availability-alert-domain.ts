export const LAST_MINUTE_WINDOW_HOURS = 24;
export const ALERT_COOLDOWN_MINUTES = 30;

export type AvailabilityAlertStatus = "active" | "matched" | "claimed" | "expired" | "cancelled";

export function liveModuleEnabled(flags: unknown, module: "availabilityAlerts" | "lastMinuteSlots", businessEnabled: unknown): boolean {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) return false;
  const row = flags as Record<string, unknown>;
  const keys = ["liveFeaturesMaster", "liveAvailability", "liveQueue", "lastMinuteSlots", "availabilityAlerts", "liveOperations"];
  return keys.every((key) => typeof row[key] === "boolean") && row.liveFeaturesMaster === true &&
    row[module] === true && businessEnabled === true;
}

export function alertCoversSlot(alert: { dateKey: string; startMinute: number; endMinute: number; staffId: string | null },
  dateKey: string, minute: number, staffId: string | null): boolean {
  return alert.dateKey === dateKey && minute >= alert.startMinute && minute < alert.endMinute &&
    (!alert.staffId || alert.staffId === staffId);
}

export function isNewAlertMatch(lastMatchedAtMillis: number | null, lastMatchedStartAtMillis: number | null,
  candidateStartMillis: number, nowMillis: number): boolean {
  return lastMatchedStartAtMillis !== candidateStartMillis &&
    (lastMatchedAtMillis === null || nowMillis - lastMatchedAtMillis >= ALERT_COOLDOWN_MINUTES * 60_000);
}
