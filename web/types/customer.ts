import type { EntityBase } from "@/types/common";

export interface Customer extends EntityBase {
  fullName: string;
  phone: string;
  email?: string;
  userId?: string | null;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalSpent: number;
  lastVisitAt?: string;
  notes?: string;
}
