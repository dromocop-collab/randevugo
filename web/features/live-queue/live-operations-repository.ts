import { collection, doc, getDocs, onSnapshot, orderBy, query, Timestamp, where, type Unsubscribe } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Business } from "@/types/business";
import type { Staff } from "@/types/staff";
import type { Service } from "@/types/service";
import type { Appointment } from "@/types/appointments";
import type { LiveWaitEstimate } from "./wait-estimate";

export interface QueueEntry {
  id: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  requestedStaffId: string | null;
  assignedStaffId: string | null;
  assignmentMode: "specific_staff" | "first_available";
  status: string;
  joinedAt: string;
  calledAt?: string;
  declaredEtaMinutes?: number | null;
  presenceConfirmedAt?: string;
  businessDayKey: string;
}

export interface LiveOperationsCapabilities {
  activeStatuses: string[];
  transitions: Record<string, string[]>;
  calledGraceMinutes: number;
}

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function getLiveOperationsCapabilities(businessId: string): Promise<LiveOperationsCapabilities> {
  return (await callable<{ businessId: string }, LiveOperationsCapabilities>("getLiveOperationsCapabilities")({ businessId })).data;
}

export async function transitionQueueEntry(businessId: string, entryId: string, status: string, staffId?: string) {
  await callable<{ businessId: string; entryId: string; status: string; staffId?: string }, unknown>("transitionQueueEntry")({ businessId, entryId, status, staffId });
}

export async function callNextCustomer(businessId: string, staffId: string) {
  return (await callable<{ businessId: string; staffId: string }, { entryId: string }>("callNextCustomer")({ businessId, staffId })).data;
}

export async function getBusinessLiveWaitEstimates(businessId: string): Promise<Record<string, LiveWaitEstimate>> {
  return (await callable<{ businessId: string }, { estimates: Record<string, LiveWaitEstimate> }>("getBusinessLiveWaitEstimates")({ businessId })).data.estimates;
}

export function watchActiveQueue(businessId: string, statuses: string[], onData: (entries: QueueEntry[]) => void, onError: () => void): Unsubscribe {
  const ref = collection(getDb(), "businesses", businessId, "queueEntries");
  return onSnapshot(query(ref, where("status", "in", statuses), orderBy("joinedAt", "asc")),
    (snapshot) => onData(snapshot.docs.map((item) => mapDoc<QueueEntry>(item))), onError);
}

export async function listActiveQueueOnce(businessId: string, statuses: string[]): Promise<QueueEntry[]> {
  const ref = collection(getDb(), "businesses", businessId, "queueEntries");
  const snapshot = await getDocs(query(ref, where("status", "in", statuses), orderBy("joinedAt", "asc")));
  return snapshot.docs.map((item) => mapDoc<QueueEntry>(item));
}

export function watchBusinessLiveSettings(businessId: string, onData: (business: Business | null) => void, onError: () => void): Unsubscribe {
  return onSnapshot(doc(getDb(), "businesses", businessId), (snapshot) =>
    onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Business : null), onError);
}

export function watchStaff(businessId: string, onData: (staff: Staff[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(collection(getDb(), "businesses", businessId, "staff"),
    (snapshot) => onData(snapshot.docs.map((item) => mapDoc<Staff>(item))), onError);
}

export function watchNearbyAppointments(businessId: string, onData: (appointments: Appointment[]) => void, onError: () => void): Unsubscribe {
  const now = Date.now();
  const ref = collection(getDb(), "businesses", businessId, "appointments");
  return onSnapshot(query(ref,
    where("startAt", ">=", Timestamp.fromMillis(now - 8 * 60 * 60_000)),
    where("startAt", "<", Timestamp.fromMillis(now + 24 * 60 * 60_000)),
    orderBy("startAt", "asc")),
  (snapshot) => onData(snapshot.docs.map((item) => mapDoc<Appointment>(item))), onError);
}

export async function listQueueServices(businessId: string): Promise<Service[]> {
  const snapshot = await getDocs(collection(getDb(), "businesses", businessId, "services"));
  return snapshot.docs.map((item) => mapDoc<Service>(item));
}
