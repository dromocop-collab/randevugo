import { collection, getDocs, limit, query, where, type Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";

export type AvailabilityAlert = {
  id: string;
  businessId: string;
  serviceId: string;
  staffId: string | null;
  dateKey: string;
  startMinute: number;
  endMinute: number;
  status: "active" | "matched" | "claimed" | "expired" | "cancelled";
  expiresAt: Timestamp | null;
};

export type LastMinuteOpening = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  startAtMillis: number;
  dateKey: string;
  timeZone: string;
};

const functions = () => getFunctions(getFirebaseApp(), "europe-west1");

export async function createAvailabilityAlert(input: {
  businessId: string; serviceId: string; staffId: string | null; dateKey: string;
  startMinute: number; endMinute: number;
}) {
  const call = httpsCallable<typeof input, { alertId: string; alreadyExists: boolean }>(functions(), "createAvailabilityAlert");
  return (await call(input)).data;
}

export async function cancelAvailabilityAlert(alertId: string) {
  const call = httpsCallable<{ alertId: string }, { success: boolean }>(functions(), "cancelAvailabilityAlert");
  return (await call({ alertId })).data;
}

export async function listMyAvailabilityAlerts(uid: string): Promise<AvailabilityAlert[]> {
  const snapshot = await getDocs(query(collection(getDb(), "availabilityAlerts"), where("userId", "==", uid), limit(100)));
  return snapshot.docs.map((item) => ({
    id: item.id, businessId: String(item.data().businessId), serviceId: String(item.data().serviceId),
    staffId: typeof item.data().staffId === "string" ? item.data().staffId : null,
    dateKey: String(item.data().dateKey), startMinute: Number(item.data().startMinute),
    endMinute: Number(item.data().endMinute), status: item.data().status as AvailabilityAlert["status"],
    expiresAt: item.data().expiresAt ?? null,
  }));
}

export async function listLastMinuteOpenings(): Promise<LastMinuteOpening[]> {
  const call = httpsCallable<undefined, { openings: LastMinuteOpening[] }>(functions(), "listLastMinuteOpenings");
  return (await call()).data.openings;
}
