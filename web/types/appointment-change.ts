export interface RescheduleCustomerAppointmentInput {
  businessId: string;
  appointmentId: string;
  startAtMillis: number;
  staffId?: string;
}

export type ManageAppointmentByTokenInput =
  | { publicToken: string; action: "cancel"; reason?: string }
  | { publicToken: string; action: "reschedule"; startAtMillis: number; staffId?: string };

export interface AppointmentChangeResult {
  success: boolean;
  action?: "cancel" | "reschedule";
  status?: "cancelled" | "rescheduled";
  startAtMillis?: number;
  staffId?: string | null;
  rescheduleCount?: number;
}

/** getAppointmentByPublicToken'ın döndürdüğü müşteri değişiklik kuralları. */
export interface PublicAppointmentPolicy {
  canCancel: boolean;
  canReschedule: boolean;
  cancelBlockedReason: string | null;
  rescheduleBlockedReason: string | null;
  allowCancellation: boolean;
  allowReschedule: boolean;
  deadlineMinutes: number;
  maxReschedules: number;
  maximumBookingDaysAhead: number;
  timeZone: string;
}
