import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { parseCustomFields, type CustomBookingField } from "@/features/booking-fields/booking-fields-domain";

export type BookingFieldSettings = {
  collectName: boolean;
  collectEmail: boolean;
  collectNotes: boolean;
  /** İşletmelerin süper admin onaylı ek alan ekleyebilmesi (platform anahtarı). */
  businessCustomFieldsEnabled: boolean;
  /** businessId verildiğinde: işletmenin yayındaki onaylı ek alanları. */
  customFields: CustomBookingField[];
  phoneRequired: true;
  phoneVerificationRequired: true;
};

export type PlatformBookingFieldToggles = Pick<BookingFieldSettings, "collectName" | "collectEmail" | "collectNotes" | "businessCustomFieldsEnabled">;

export const DEFAULT_BOOKING_FIELD_SETTINGS: BookingFieldSettings = {
  collectName: true,
  collectEmail: true,
  collectNotes: true,
  businessCustomFieldsEnabled: true,
  customFields: [],
  phoneRequired: true,
  phoneVerificationRequired: true,
};

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function getBookingFieldSettings(businessId?: string): Promise<BookingFieldSettings> {
  const result = await callable<{ businessId?: string }, Partial<BookingFieldSettings>>("getBookingFieldSettings")(businessId ? { businessId } : {});
  const data = result.data ?? {};
  return {
    ...DEFAULT_BOOKING_FIELD_SETTINGS,
    ...data,
    businessCustomFieldsEnabled: data.businessCustomFieldsEnabled !== false,
    customFields: parseCustomFields(data.customFields),
    phoneRequired: true,
    phoneVerificationRequired: true,
  };
}

export async function updateBookingFieldSettings(settings: PlatformBookingFieldToggles): Promise<PlatformBookingFieldToggles> {
  const payload: PlatformBookingFieldToggles = {
    collectName: settings.collectName,
    collectEmail: settings.collectEmail,
    collectNotes: settings.collectNotes,
    businessCustomFieldsEnabled: settings.businessCustomFieldsEnabled,
  };
  await callable<PlatformBookingFieldToggles, { success: boolean }>("updateBookingFieldSettings")(payload);
  return payload;
}
