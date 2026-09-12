import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable as call } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { mapDoc } from "@/lib/firebase/mapper";
import type { Appointment, AppointmentCreateInput, AppointmentStatus } from "@/types/appointments";

async function staffScope(businessId: string): Promise<string | null> {
  const user = getAuth(getFirebaseApp()).currentUser;
  if (!user) return null;
  const member = await getDoc(doc(getDb(), "businesses", businessId, "members", user.uid));
  if (!member.exists() || member.data().role !== "staff") return null;
  const staffId = member.data().staffId;
  if (typeof staffId !== "string" || !staffId) throw new Error("Çalışan profiliniz işletme hesabına bağlı değil.");
  return staffId;
}

export async function listAppointments(businessId: string): Promise<Appointment[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "appointments");
  const ownStaffId = await staffScope(businessId);
  const snap = await getDocs(ownStaffId
    ? query(ref, where("staffId", "==", ownStaffId), orderBy("startAt", "asc"))
    : query(ref, orderBy("startAt", "asc")));
  return snap.docs.map((item) => mapDoc<Appointment>(item));
}

export async function listAppointmentsByDateRange(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "appointments");
  const ownStaffId = await staffScope(businessId);
  const snap = await getDocs(
    ownStaffId ? query(
      ref,
      where("staffId", "==", ownStaffId),
      where("startAt", ">=", Timestamp.fromDate(startDate)),
      where("startAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("startAt", "asc")
    ) : query(
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
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call(functions, "rescheduleAppointment");
  await callable({
    businessId,
    appointmentId,
    staffId: payload.staffId,
    startAtMillis: payload.startAt.getTime(),
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
