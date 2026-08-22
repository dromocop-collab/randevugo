import type { EntityBase } from "@/types/common";
import type { AnyPlanType } from "@/constants/plans";

export type BusinessCategory =
  | "kuafor"
  | "berber"
  | "guzellik"
  | "nail"
  | "spor"
  | "danismanlik"
  | "veteriner"
  | "servis"
  | "saglik"
  | "egitim"
  | "diger"
  | (string & {}); // Allow dynamic categories from Firestore

export type BusinessStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "suspended"
  | "rejected";

export type BusinessType = "kadin" | "erkek" | "unisex";

export interface SocialMediaLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
}

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
  staffId?: string;
}

export interface Business extends EntityBase {
  ownerUid: string;
  slug: string;
  name: string;
  description?: string;
  category: BusinessCategory;
  businessType?: BusinessType;
  phone: string;
  email: string;
  website?: string;
  address: string;
  city: string;
  district: string;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];
  socialMedia?: SocialMediaLinks;
  isPublished: boolean;
  status: BusinessStatus;
  approvalStatus?: "pending" | "approved" | "rejected";
  storePosition?: number;
  isSuspended?: boolean;
  minimumBookingNoticeMinutes: number;
  maximumBookingDaysAhead: number;
  appointmentBufferMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  slotIntervalMinutes: number;
  allowCancellation?: boolean;
  allowReschedule?: boolean;
  cancellationDeadlineMinutes?: number;
  rating: number;
  reviewCount: number;
  plan: AnyPlanType;
  isVerified?: boolean;
  adminNote?: string;
}
