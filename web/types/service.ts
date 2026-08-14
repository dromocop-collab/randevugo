import type { EntityBase } from "@/types/common";

export interface Service extends EntityBase {
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  currency: "TRY" | "USD" | "EUR";
  isActive: boolean;
  isBookableOnline: boolean;
  requiresDeposit: boolean;
  depositAmount: number;
  assignableStaffIds: string[];
  imageUrl?: string;
  sortOrder: number;
}
