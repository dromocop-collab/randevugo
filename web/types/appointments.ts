import type { EntityBase } from "@/types/common";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "deposit_paid" | "paid" | "refunded";

export type AppointmentSource = "online" | "dashboard" | "phone" | "walk_in";

export interface AppointmentServiceLine {
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface Appointment extends EntityBase {
  businessId: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  publicToken?: string;
  serviceName?: string;
  staffName?: string;
  /** Original booked service snapshots, retained while extra services change totals. */
  primaryServicePrice?: number;
  primaryServiceDurationMinutes?: number;
  /** Services performed in addition to the originally booked service. */
  additionalServices?: AppointmentServiceLine[];
  servicePrice?: number;
  serviceDurationMinutes?: number;
  source?: AppointmentSource;
  checkoutReceiptId?: string;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: "cash" | "card" | "transfer" | "other";
  checkedOutAt?: string;
}

export interface AppointmentCreateInput {
  businessId: string;
  staffId: string;
  serviceId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  startAtMillis: number;
}

export interface DashboardAppointmentCreateInput {
  businessId: string;
  startAtMillis: number;
  customerName?: string;
  serviceId?: string;
  staffId?: string;
}

export interface DashboardAppointmentUpdateInput extends DashboardAppointmentCreateInput {
  appointmentId: string;
}
