import type { DaySchedule } from "@/types/business";
import type { EntityBase } from "@/types/common";

export interface Staff extends EntityBase {
  fullName: string;
  photoUrl?: string;
  phone: string;
  email: string;
  position: string;
  isActive: boolean;
  serviceIds: string[];
  workingHours: DaySchedule[];
  leaveDates: string[];
  appointmentCapacity: number;
}
