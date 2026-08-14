import type { EntityBase } from "@/types/common";

export type NotificationType =
  | "new_appointment"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "upcoming_appointment"
  | "payment"
  | "system";

export interface NotificationItem extends EntityBase {
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  relatedAppointmentId?: string;
}
