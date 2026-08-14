import type { EntityBase } from "@/types/common";
import type { PlanType } from "@/constants/plans";

export type BusinessCategory =
  | "kuafor"
  | "berber"
  | "guzellik"
  | "nail"
  | "spor"
  | "danismanlik"
  | "veteriner"
  | "servis"
  | "diger";

export interface DaySchedule {
  day: number;
  isOpen: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface SpecialDay extends EntityBase {
  date: string;
  type: "holiday" | "leave" | "closed" | "custom";
  start?: string;
  end?: string;
  description?: string;
}

export interface Business extends EntityBase {
  ownerUid: string;
  slug: string;
  name: string;
  category: BusinessCategory;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  logoUrl?: string;
  coverUrl?: string;
  isPublished: boolean;
  isSuspended?: boolean;
  minimumBookingNoticeMinutes: number;
  maximumBookingDaysAhead: number;
  appointmentBufferMinutes: number;
  plan: PlanType;
}
