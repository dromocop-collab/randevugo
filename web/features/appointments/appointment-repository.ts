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
import type { Appointment, AppointmentCreateInput, AppointmentServiceLine, AppointmentStatus } from "@/types/appointments";

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

/**
 * Replaces the extra services attached to an appointment while preserving the
 * original booked service as the primary line. Total price, duration and end
 * time are stored as snapshots so reporting and customer views stay in sync.
 */
export async function updateAppointmentAdditionalServices(
  businessId: string,
  appointment: Appointment,
  additionalServices: AppointmentServiceLine[]
): Promise<void> {
  const previousExtras = appointment.additionalServices ?? [];
  const previousExtraPrice = previousExtras.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const previousExtraDuration = previousExtras.reduce((sum, item) => sum + Number(item.durationMinutes || 0), 0);
  const primaryServicePrice = Math.max(
    0,
    appointment.primaryServicePrice ?? Number(appointment.servicePrice ?? 0) - previousExtraPrice
  );
  const primaryServiceDurationMinutes = Math.max(
    0,
    appointment.primaryServiceDurationMinutes ?? Number(appointment.serviceDurationMinutes ?? 0) - previousExtraDuration
  );
  const sanitized = additionalServices.map((item) => ({
    serviceId: String(item.serviceId),
    name: String(item.name).trim(),
    price: Math.max(0, Number(item.price) || 0),
    durationMinutes: Math.max(1, Math.round(Number(item.durationMinutes) || 1)),
  }));
  const servicePrice = primaryServicePrice + sanitized.reduce((sum, item) => sum + item.price, 0);
  const serviceDurationMinutes = primaryServiceDurationMinutes + sanitized.reduce((sum, item) => sum + item.durationMinutes, 0);
  const startAtMillis = new Date(appointment.startAt).getTime();
  if (!Number.isFinite(startAtMillis)) throw new Error("Randevu başlangıç zamanı geçersiz.");

  await updateDoc(doc(getDb(), "businesses", businessId, "appointments", appointment.id), {
    primaryServicePrice,
    primaryServiceDurationMinutes,
    additionalServices: sanitized,
    servicePrice,
    serviceDurationMinutes,
    endAt: Timestamp.fromMillis(startAtMillis + serviceDurationMinutes * 60_000),
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

export interface CreatedAppointment {
  appointmentId: string;
  publicToken: string;
}

export async function createAppointment(input: AppointmentCreateInput): Promise<CreatedAppointment> {
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call(functions, "createAppointment");

  const result = await callable({
    businessId: input.businessId,
    staffId: input.staffId,
    serviceId: input.serviceId,
    ...(input.customerName ? { customerName: input.customerName } : {}),
    customerPhone: input.customerPhone,
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    startAtMillis: input.startAtMillis,
  });

  const data = result.data as { appointmentId?: unknown; publicToken?: unknown };
  return {
    appointmentId: String(data.appointmentId ?? ""),
    publicToken: String(data.publicToken ?? ""),
  };
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

export interface AvailableAppointmentDate {
  date: string;
  slotCount: number;
}

export async function listAvailableDates(input: {
  businessId: string;
  serviceId: string;
  staffId?: string;
  startDate: string;
  endDate: string;
}): Promise<AvailableAppointmentDate[]> {
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call(functions, "getAvailableDates");
  const result = await callable(input);
  const dates = (result.data as { dates?: unknown }).dates;
  if (!Array.isArray(dates)) return [];
  return dates.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { date?: unknown; slotCount?: unknown };
    return typeof row.date === "string" && typeof row.slotCount === "number"
      ? [{ date: row.date, slotCount: Math.max(0, Math.round(row.slotCount)) }]
      : [];
  });
}

export async function joinAppointmentWaitlist(input: { businessId: string; serviceId: string; staffId?: string; preferredDate: string; customerName: string; customerPhone?: string; customerEmail?: string }): Promise<{ waitlistId: string; alreadyJoined: boolean }> {
  const callable = call(getFunctions(getFirebaseApp(), "europe-west1"), "joinWaitlist");
  const result = await callable(input);
  const data = result.data as { waitlistId?: unknown; alreadyJoined?: unknown };
  return { waitlistId: String(data.waitlistId ?? ""), alreadyJoined: data.alreadyJoined === true };
}
