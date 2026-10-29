import type { DaySchedule } from "@/types/business";
import type { EntityBase } from "@/types/common";
import type { ServicePriceType } from "@/types/service";

/** Bu uzmana özel süre/fiyat; boş alan hizmetin varsayılanını kullanır. */
export interface StaffServiceOverride {
  durationMinutes?: number;
  price?: number;
  /** Bu uzmanda fiyat tipi (ör. "quote" = görüşmede). Yoksa hizmetin tipi. */
  priceType?: ServicePriceType;
  /** Yalnız aralık fiyatında üst sınır. */
  priceMax?: number;
}

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
  serviceOverrides?: Record<string, StaffServiceOverride>;
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
    manageCheckout: boolean;
    manageCatalog: boolean;
    managePackages: boolean;
    manageFinance: boolean;
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
