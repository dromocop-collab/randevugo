import { Timestamp } from "firebase-admin/firestore";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  businessId: string;
  branchId?: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
