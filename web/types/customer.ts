import type { EntityBase } from "@/types/common";

export interface Customer extends EntityBase {
  fullName: string;
  phone: string;
  email?: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalSpent: number;
  lastVisitAt?: string;
  notes?: string;
}
