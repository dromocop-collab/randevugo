import type { EntityBase } from "@/types/common";

export interface Review extends EntityBase {
  businessId: string;
  customerId: string;
  customerName: string;
  appointmentId: string;
  serviceId?: string;
  staffId?: string;
  rating: number;
  comment?: string;
  isVisible: boolean;
  isModerated?: boolean;
  moderationNote?: string;
}
