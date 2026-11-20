import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

function functions() {
  return getFunctions(getFirebaseApp(), "europe-west1");
}

export type ArrivalReport = { publicToken: string; status: "on_the_way" | "late" | "clear"; delayMinutes?: number };

/** Müşteri biletten varış durumunu paylaşır (misafir dahil, bağlantı anahtarıyla). */
export async function reportAppointmentArrival(input: ArrivalReport) {
  const callable = httpsCallable<ArrivalReport, { success: boolean }>(functions(), "reportAppointmentArrival");
  return (await callable(input)).data;
}

/** İşletme gecikmesi (0 = kaldır). cascade: aynı uzmanın bugünkü sonraki randevularına da yaz. */
export async function setAppointmentBusinessDelay(input: { businessId: string; appointmentId: string; minutes: number; cascade?: boolean }) {
  const callable = httpsCallable<typeof input, { success: boolean; minutes: number; updated: number }>(functions(), "setAppointmentBusinessDelay");
  return (await callable(input)).data;
}

export type BusyHoursResult = { grid: number[][]; sample: number; weeks: number; enough: boolean; computedAt: string };

const busyCache = new Map<string, Promise<BusyHoursResult>>();

/** Vitrin yoğunluk haritası (sunucuda 12 saat önbellekli; sayfa içinde de bir kez istenir). */
export function getBusinessBusyHours(businessId: string): Promise<BusyHoursResult> {
  const cached = busyCache.get(businessId);
  if (cached) return cached;
  const callable = httpsCallable<{ businessId: string }, BusyHoursResult>(functions(), "getBusinessBusyHours");
  const request = callable({ businessId }).then((result) => result.data);
  request.catch(() => busyCache.delete(businessId));
  busyCache.set(businessId, request);
  return request;
}
