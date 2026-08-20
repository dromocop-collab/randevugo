import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable as call } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Appointment, AppointmentCreateInput, AppointmentStatus } from "@/types/appointments";

export async function listAppointments(businessId: string): Promise<Appointment[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "appointments");
  const snap = await getDocs(query(ref, orderBy("startAt", "asc")));
  return snap.docs.map((item) => mapDoc<Appointment>(item));
}

export async function listAppointmentsByDateRange(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "appointments");
  const snap = await getDocs(
    query(
      ref,
      where("startAt", ">=", Timestamp.fromDate(startDate)),
      where("startAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("startAt", "asc")
    )
  );
  return snap.docs.map((item) => mapDoc<Appointment>(item));
}

export async function updateAppointmentStatus(
  businessId: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "businesses", businessId, "appointments", appointmentId), {
    status,
    updatedAt: Timestamp.now(),
  });
}

export async function rescheduleAppointment(
  businessId: string,
  appointmentId: string,
  payload: { startAt: Date; endAt: Date; staffId: string }
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, "businesses", businessId, "appointments", appointmentId), {
    startAt: Timestamp.fromDate(payload.startAt),
    endAt: Timestamp.fromDate(payload.endAt),
    staffId: payload.staffId,
    updatedAt: Timestamp.now(),
  });
}

export async function createAppointment(input: AppointmentCreateInput): Promise<string> {
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call(functions, "createAppointment");

  const result = await callable({
    businessId: input.businessId,
    staffId: input.staffId,
    serviceId: input.serviceId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    notes: input.notes,
    startAtMillis: input.startAtMillis,
  });

  return String((result.data as { appointmentId?: string }).appointmentId ?? "");
}

export interface AvailableAppointmentSlot {
  startAtMillis: number;
  label: string;
  staffId?: string;
}

export async function listAvailableSlots(input: {
  businessId: string;
  serviceId: string;
  staffId?: string;
  date: string;
}): Promise<AvailableAppointmentSlot[]> {
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call(functions, "getAvailableSlots");
  const result = await callable(input);
  const slots = (result.data as { slots?: unknown }).slots;
  if (!Array.isArray(slots)) return [];
  return slots.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { startAtMillis?: unknown; label?: unknown; staffId?: unknown };
    return typeof row.startAtMillis === "number" && typeof row.label === "string"
      ? [{
          startAtMillis: row.startAtMillis,
          label: row.label,
          ...(typeof row.staffId === "string" ? { staffId: row.staffId } : {}),
        }]
      : [];
  });
}
