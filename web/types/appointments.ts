import type { EntityBase } from "@/types/common";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "deposit_paid" | "paid" | "refunded";

export type AppointmentSource = "online" | "dashboard" | "phone" | "walk_in";

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
  servicePrice?: number;
  serviceDurationMinutes?: number;
  source?: AppointmentSource;
}

export interface AppointmentCreateInput {
  businessId: string;
  staffId: string;
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  startAtMillis: number;
}
