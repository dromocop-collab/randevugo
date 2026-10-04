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
import type { Appointment, AppointmentCreateInput, AppointmentServiceLine, AppointmentStatus, DashboardAppointmentCreateInput, DashboardAppointmentUpdateInput } from "@/types/appointments";

async function staffScope(businessId: string): Promise<string | null> {
  const user = getAuth(getFirebaseApp()).currentUser;
  if (!user) return null;
  const member = await getDoc(doc(getDb(), "businesses", businessId, "members", user.uid));
  if (!member.exists() || member.data().role !== "staff") return null;
  const staffId = member.data().staffId;
  if (typeof staffId !== "string" || !staffId) throw new Error("Çalışan profiliniz işletme hesabına bağlı değil.");
  return staffId;
}

function appointmentPhoneKey(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return String(value ?? "").trim();
}

function isSavedCustomerName(value: unknown): boolean {
  const name = String(value ?? "").trim();
  const normalized = name.toLocaleLowerCase("tr-TR");
  return Boolean(name) && normalized !== "müşteri" && !normalized.startsWith("telefon müşterisi");
}

async function hydrateCurrentCustomerNames(businessId: string, appointments: Appointment[]): Promise<Appointment[]> {
  try {
    const customers = await getDocs(collection(getDb(), "businesses", businessId, "customers"));
    const names = new Map<string, string>();
    customers.docs.forEach((customer) => {
      const row = customer.data();
      const name = row.fullName;
      const phone = appointmentPhoneKey(row.phoneKey ?? row.phone);
      if (phone && isSavedCustomerName(name)) names.set(phone, String(name).trim());
    });
    return appointments.map((appointment) => {
      const currentName = names.get(appointmentPhoneKey(appointment.customerPhone));
      return currentName && currentName !== appointment.customerName
        ? { ...appointment, customerName: currentName }
        : appointment;
    });
  } catch {
    // Some staff roles can read assigned appointments but not the full CRM list.
    return appointments;
  }
}

export async function listAppointments(businessId: string): Promise<Appointment[]> {
  const db = getDb();
  const ref = collection(db, "businesses", businessId, "appointments");
  const ownStaffId = await staffScope(businessId);
  const snap = await getDocs(ownStaffId
    ? query(ref, where("staffId", "==", ownStaffId), orderBy("startAt", "asc"))
    : query(ref, orderBy("startAt", "asc")));
  return hydrateCurrentCustomerNames(businessId, snap.docs.map((item) => mapDoc<Appointment>(item)));
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
  return hydrateCurrentCustomerNames(businessId, snap.docs.map((item) => mapDoc<Appointment>(item)));
}

export async function createDashboardAppointment(
  input: DashboardAppointmentCreateInput,
): Promise<string> {
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call<DashboardAppointmentCreateInput, { appointmentId?: string }>(
    functions,
    "createDashboardAppointment",
  );
  const result = await callable(input);
  return String(result.data.appointmentId ?? "");
}

export async function updateDashboardAppointment(
  input: DashboardAppointmentUpdateInput,
): Promise<void> {
  const functions = getFunctions(getFirebaseApp(), "europe-west1");
  const callable = call<DashboardAppointmentUpdateInput, { success?: boolean }>(
    functions,
    "updateDashboardAppointment",
  );
  await callable(input);
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
/**
 * Ek hizmetleri sunucuda günceller: bitiş saati uzadığında çakışma kontrolü ve gün kilidi
 * transaction içinde yapılır (istemciden doğrudan endAt yazmak çift rezervasyona yol açıyordu).
 */
export async function updateAppointmentAdditionalServices(
  businessId: string,
  appointment: Appointment,
  additionalServices: AppointmentServiceLine[]
): Promise<void> {
  const callable = call(getFunctions(getFirebaseApp(), "europe-west1"), "updateAppointmentServices");
  await callable({
    businessId,
    appointmentId: appointment.id,
    additionalServices: additionalServices.map((item) => ({
      serviceId: String(item.serviceId),
      name: String(item.name).trim(),
      price: Math.max(0, Number(item.price) || 0),
      durationMinutes: Math.max(1, Math.round(Number(item.durationMinutes) || 1)),
    })),
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
