import type { EntityBase } from "@/types/common";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "deposit_paid" | "paid" | "refunded";

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
