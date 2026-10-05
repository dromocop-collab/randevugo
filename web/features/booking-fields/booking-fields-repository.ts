import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection, getDocs, limit, orderBy, query, where,
  type FirestoreError, type QueryDocumentSnapshot, type Timestamp,
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { parseCustomFields, type CustomBookingField } from "./booking-fields-domain";

export {
  getBookingFieldSettings,
  updateBookingFieldSettings,
  DEFAULT_BOOKING_FIELD_SETTINGS,
  type BookingFieldSettings,
  type PlatformBookingFieldToggles,
} from "@/features/booking/booking-field-settings-repository";

export type BookingFieldRequestStatus = "pending" | "approved" | "rejected" | "superseded";

/** businesses/{id}.bookingFieldsRequest — işletmenin son talebinin özeti. */
export type BusinessBookingFieldsRequest = {
  status: "pending" | "approved" | "rejected";
  requestId: string | null;
  note: string | null;
  fields: CustomBookingField[];
  updatedAtMillis: number | null;
};

export type BookingFieldRequest = {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string | null;
  category: string | null;
  fields: CustomBookingField[];
  currentFields: CustomBookingField[];
  approvedFields: CustomBookingField[];
  status: BookingFieldRequestStatus;
  note: string | null;
  requestedBy: string | null;
  reviewedBy: string | null;
  createdAtMillis: number;
  reviewedAtMillis: number | null;
};

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

function millis(value: unknown): number | null {
  const stamp = value as Timestamp | undefined;
  if (stamp && typeof stamp.toMillis === "function") return stamp.toMillis();
  if (typeof value === "string") { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null; }
  return null;
}

/** Sunucunun Türkçe HttpsError mesajlarını gösterir; altyapı hatalarında genel metne düşer. */
export function bookingFieldsErrorMessage(error: unknown, fallback: string): string {
  const value = error as { code?: string; message?: string } | null;
  const code = String(value?.code ?? "").replace(/^functions\//, "");
  const message = String(value?.message ?? "").trim();
  if (["invalid-argument", "failed-precondition", "already-exists", "not-found", "out-of-range"].includes(code) && message && message.toLowerCase() !== code) {
    return message;
  }
  return userFacingError(error, fallback);
}

export function parseBusinessFieldsRequest(input: unknown): BusinessBookingFieldsRequest | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const status = data.status === "pending" || data.status === "approved" || data.status === "rejected" ? data.status : null;
  if (!status) return null;
  return {
    status,
    requestId: typeof data.requestId === "string" ? data.requestId : null,
    note: typeof data.note === "string" && data.note ? data.note : null,
    fields: parseCustomFields(data.fields),
    updatedAtMillis: millis(data.updatedAt),
  };
}

export async function submitBookingFieldRequest(businessId: string, fields: CustomBookingField[]): Promise<{ status: "pending" | "approved"; requestId: string | null }> {
  const result = await callable<{ businessId: string; fields: CustomBookingField[] }, { status: "pending" | "approved"; requestId: string | null }>("submitBookingFieldRequest")({ businessId, fields });
  return { status: result.data.status === "approved" ? "approved" : "pending", requestId: result.data.requestId ?? null };
}

export async function reviewBookingFieldRequest(input: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
  fields?: CustomBookingField[];
}): Promise<void> {
  await callable<typeof input, { success: boolean }>("reviewBookingFieldRequest")(input);
}

function toRequest(item: QueryDocumentSnapshot): BookingFieldRequest {
  const data = item.data();
  const status = ["pending", "approved", "rejected", "superseded"].includes(data.status) ? data.status as BookingFieldRequestStatus : "pending";
  return {
    id: item.id,
    businessId: String(data.businessId ?? ""),
    businessName: String(data.businessName ?? "İşletme"),
    businessSlug: typeof data.businessSlug === "string" && data.businessSlug ? data.businessSlug : null,
    category: typeof data.category === "string" && data.category ? data.category : null,
    fields: parseCustomFields(data.fields),
    currentFields: parseCustomFields(data.currentFields),
    approvedFields: parseCustomFields(data.approvedFields),
    status,
    note: typeof data.note === "string" && data.note ? data.note : null,
    requestedBy: typeof data.requestedBy === "string" ? data.requestedBy : null,
    reviewedBy: typeof data.reviewedBy === "string" ? data.reviewedBy : null,
    createdAtMillis: millis(data.createdAt) ?? 0,
    reviewedAtMillis: millis(data.reviewedAt),
  };
}

const PAGE_SIZE = 100;

/** Bekleyen talepler (en yeni üstte). (status, createdAt desc) bileşik index'i yoksa istemcide sıralanır. */
export async function listPendingBookingFieldRequests(): Promise<BookingFieldRequest[]> {
  const ref = collection(getDb(), "bookingFieldRequests");
  try {
    return (await getDocs(query(ref, where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(PAGE_SIZE)))).docs.map(toRequest);
  } catch (error) {
    if ((error as FirestoreError).code !== "failed-precondition") throw error;
    const snapshot = await getDocs(query(ref, where("status", "==", "pending"), limit(PAGE_SIZE)));
    return snapshot.docs.map(toRequest).sort((a, b) => b.createdAtMillis - a.createdAtMillis);
  }
}

/** Karara bağlanmış talepler (onaylı + reddedilen), en son karar üstte. */
export async function listReviewedBookingFieldRequests(): Promise<BookingFieldRequest[]> {
  const ref = collection(getDb(), "bookingFieldRequests");
  const sortReviewed = (rows: BookingFieldRequest[]) => rows.sort((a, b) => (b.reviewedAtMillis ?? b.createdAtMillis) - (a.reviewedAtMillis ?? a.createdAtMillis));
  try {
    return (await getDocs(query(ref, where("status", "in", ["approved", "rejected"]), orderBy("reviewedAt", "desc"), limit(PAGE_SIZE)))).docs.map(toRequest);
  } catch (error) {
    if ((error as FirestoreError).code !== "failed-precondition") throw error;
    const snapshot = await getDocs(query(ref, where("status", "in", ["approved", "rejected"]), limit(PAGE_SIZE)));
    return sortReviewed(snapshot.docs.map(toRequest));
  }
}
