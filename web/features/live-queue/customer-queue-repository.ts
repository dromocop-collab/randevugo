import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import type { LiveWaitEstimate } from "./wait-estimate";

export interface CustomerQueueEntry {
  id: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  requestedStaffId: string | null;
  assignedStaffId: string | null;
  assignmentMode: "specific_staff" | "first_available";
  status: "waiting" | "on_the_way" | "called" | "in_service" | "completed" | "cancelled" | "expired" | "no_show";
  joinedAt?: { toDate(): Date };
  onTheWayAt?: { toDate(): Date };
  declaredEtaMinutes?: number | null;
  expectedArrivalAt?: { toDate(): Date } | null;
  presenceConfirmedAt?: { toDate(): Date };
  calledAt?: { toDate(): Date };
}

export interface ActiveQueuePointer { businessId: string; entryId: string; status: CustomerQueueEntry["status"] }
export interface LiveDiscoveryBusiness {
  id: string; name: string; slug: string; category: string; city: string; district: string;
  logoUrl: string | null; serviceCount: number; updatedAt: string | null;
  earliestWait?: (LiveWaitEstimate & { serviceName: string }) | null;
}

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function listLiveDiscovery(businessId?: string): Promise<LiveDiscoveryBusiness[]> {
  return (await callable<{ businessId?: string }, { businesses: LiveDiscoveryBusiness[] }>("listLiveQueueDiscovery")({ businessId })).data.businesses;
}

export async function getMyActiveQueues(): Promise<ActiveQueuePointer[]> {
  return (await callable<Record<string, never>, { entries: ActiveQueuePointer[] }>("getMyActiveQueueEntries")({})).data.entries;
}

export async function getLiveQueueWaitEstimate(input: { businessId: string; serviceId: string; staffId?: string | null; entryId?: string | null }): Promise<LiveWaitEstimate> {
  return (await callable<typeof input, LiveWaitEstimate>("getLiveQueueWaitEstimate")(input)).data;
}

export async function getLiveQueueWaitOptions(businessId: string, serviceId: string): Promise<{ firstAvailable: LiveWaitEstimate; byStaff: Record<string, LiveWaitEstimate> }> {
  return (await callable<{ businessId: string; serviceId: string }, { firstAvailable: LiveWaitEstimate; byStaff: Record<string, LiveWaitEstimate> }>("getLiveQueueWaitOptions")({ businessId, serviceId })).data;
}

export async function joinLiveQueue(businessId: string, serviceId: string, staffId: string | null) {
  return (await callable<{ businessId: string; serviceId: string; staffId: string | null }, { entryId: string; status: string; existing: boolean }>("joinQueue")({ businessId, serviceId, staffId })).data;
}

export async function leaveLiveQueue(businessId: string, entryId: string) {
  return (await callable<{ businessId: string; entryId: string }, { status: string }>("leaveQueue")({ businessId, entryId })).data;
}

export async function markLiveQueueOnTheWay(businessId: string, entryId: string, etaMinutes: 5 | 10 | 15 | 20 | null) {
  return (await callable<{ businessId: string; entryId: string; etaMinutes: number | null }, { status: string }>("markOnTheWay")({ businessId, entryId, etaMinutes })).data;
}

export async function confirmLiveQueuePresence(businessId: string, entryId: string) {
  return (await callable<{ businessId: string; entryId: string }, { confirmed: boolean }>("confirmQueuePresence")({ businessId, entryId })).data;
}

export function watchMyQueueEntry(businessId: string, entryId: string, onData: (entry: CustomerQueueEntry | null) => void, onError: () => void): Unsubscribe {
  return onSnapshot(doc(getDb(), "businesses", businessId, "queueEntries", entryId),
    (snapshot) => onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as CustomerQueueEntry : null), onError);
}

export function queueCustomerError(error: unknown): string {
  const value = error as { code?: string; message?: string };
  const message = String(value?.message ?? "");
  if (value?.code === "functions/unauthenticated") return "Sıraya katılmak için giriş yapmalısın.";
  if (message.includes("FEATURE_DISABLED")) return "Canlı sıra şu anda kullanılamıyor.";
  if (value?.code === "functions/already-exists") return "Bu işletmede zaten aktif bir sıran bulunuyor.";
  if (value?.code === "functions/permission-denied") return "Bu işlem için yetkin bulunmuyor.";
  if (message.includes("kabul etmiyor") || message.includes("uygun değil")) return "İşletme şu anda bu hizmet için yeni canlı sıra müşterisi kabul etmiyor.";
  if (value?.code === "functions/failed-precondition") return "Sıra durumu değişti. Lütfen yenileyip tekrar dene.";
  return "Bağlantı kurulamadı. Lütfen tekrar dene.";
}
