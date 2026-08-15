import type { EntityBase } from "@/types/common";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketCategory =
  | "billing"
  | "technical"
  | "account"
  | "feature_request"
  | "bug_report"
  | "other";

export interface SupportTicket extends EntityBase {
  title: string;
  category: TicketCategory;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  businessId: string;
  userId: string;
  userEmail?: string;
  assignedTo?: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface TicketMessage extends EntityBase {
  ticketId: string;
  senderId: string;
  senderRole: "user" | "admin";
  message: string;
}
