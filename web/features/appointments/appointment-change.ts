import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { userFacingError } from "@/lib/errors/user-facing-error";
import type { AppointmentChangeResult, ManageAppointmentByTokenInput, RescheduleCustomerAppointmentInput } from "@/types/appointment-change";

function functions() {
  return getFunctions(getFirebaseApp(), "europe-west1");
}

export async function rescheduleCustomerAppointment(input: RescheduleCustomerAppointmentInput): Promise<AppointmentChangeResult> {
  const callable = httpsCallable<RescheduleCustomerAppointmentInput, AppointmentChangeResult>(functions(), "rescheduleCustomerAppointment");
  return (await callable(input)).data;
}

export async function manageAppointmentByToken(input: ManageAppointmentByTokenInput): Promise<AppointmentChangeResult> {
  const callable = httpsCallable<ManageAppointmentByTokenInput, AppointmentChangeResult>(functions(), "manageAppointmentByToken");
  return (await callable(input)).data;
}

// Sunucunun iş kuralı mesajları (iptal süresi, değişiklik sınırı, dolu saat) olduğu gibi gösterilir.
const SERVER_MESSAGE_CODES = ["failed-precondition", "already-exists", "invalid-argument", "not-found"];

export function appointmentChangeError(error: unknown, fallback: string): string {
  const value = error as { code?: string; message?: string } | null;
  const code = String(value?.code ?? "").replace(/^functions\//, "");
  const message = String(value?.message ?? "").trim();
  if (SERVER_MESSAGE_CODES.includes(code) && message && !message.toLocaleLowerCase("tr-TR").includes("subscription_required")) {
    return message;
  }
  return userFacingError(error, fallback);
}
