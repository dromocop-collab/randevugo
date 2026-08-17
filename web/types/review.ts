import type { EntityBase } from "@/types/common";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review extends EntityBase {
  businessId: string;
  customerId?: string;
  customerName: string;
  appointmentId: string;
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  rating: number;
  comment?: string;
  imageUrls?: string[];
  ownerReply?: string;
  ownerReplyAt?: string;
  status: ReviewStatus;
  isVisible: boolean;
  isModerated?: boolean;
  moderationNote?: string;
}
