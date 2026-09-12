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
  /** Service-category branches this employee is qualified to work in. */
  specialtyCategoryIds?: string[];
  expertiseLevel?: "junior" | "specialist" | "senior" | "trainer";
  commissionRate?: number;
  serviceOverrides?: Record<string, { durationMinutes?: number; price?: number }>;
  commissionPayouts?: Array<{
    id: string;
    periodLabel: string;
    grossRevenue: number;
    rate: number;
    amount: number;
    paidAt: string;
  }>;
  permissions?: {
    manageOwnCalendar: boolean;
    viewCustomers: boolean;
    manageAppointments: boolean;
  };
  archivedAt?: string;
  linkedUid?: string;
  isActive: boolean;
  serviceIds: string[];
  workingHours: DaySchedule[];
  breakSchedule?: StaffBreakSchedule[];
  leaveDates: string[];
  appointmentCapacity: number;
  bio?: string;
  sortOrder?: number;
}
