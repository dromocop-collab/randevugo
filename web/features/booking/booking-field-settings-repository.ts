import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export type BookingFieldSettings = {
  collectName: boolean;
  collectEmail: boolean;
  collectNotes: boolean;
  phoneRequired: true;
  phoneVerificationRequired: true;
};

export const DEFAULT_BOOKING_FIELD_SETTINGS: BookingFieldSettings = {
  collectName: true,
  collectEmail: true,
  collectNotes: true,
  phoneRequired: true,
  phoneVerificationRequired: true,
};

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function getBookingFieldSettings(): Promise<BookingFieldSettings> {
  const result = await callable<Record<string, never>, BookingFieldSettings>("getBookingFieldSettings")({});
  return { ...DEFAULT_BOOKING_FIELD_SETTINGS, ...result.data };
}

export async function updateBookingFieldSettings(
  settings: Pick<BookingFieldSettings, "collectName" | "collectEmail" | "collectNotes">
): Promise<void> {
  await callable<typeof settings, { success: boolean }>("updateBookingFieldSettings")(settings);
}
