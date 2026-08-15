import type { DaySchedule } from "@/types/business";
import type { EntityBase } from "@/types/common";

export interface StaffBreakSchedule {
  day: number;
  breakStart: string;
  breakEnd: string;
}

export interface Staff extends EntityBase {
  fullName: string;
  photoUrl?: string;
  phone: string;
  email: string;
  position: string;
  isActive: boolean;
  serviceIds: string[];
  workingHours: DaySchedule[];
  breakSchedule?: StaffBreakSchedule[];
  leaveDates: string[];
  appointmentCapacity: number;
  bio?: string;
  sortOrder?: number;
}
