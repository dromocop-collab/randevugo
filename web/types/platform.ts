import type { EntityBase } from "@/types/common";

export interface PlatformSeoSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

export interface PlatformSocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  whatsapp?: string;
}

export interface PlatformAnnouncement {
  enabled: boolean;
  message: string;
  linkText?: string;
  linkUrl?: string;
}

export interface PlatformAnalyticsSettings {
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
}

export interface PlatformSettings extends EntityBase {
  platformName: string;
  supportEmail: string;
  supportPhone?: string;
  defaultTimezone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  bookingOpen: boolean;
  defaultPlan: string;
  featureFlags: Record<string, boolean>;
  seo: PlatformSeoSettings;
  social: PlatformSocialLinks;
  announcement: PlatformAnnouncement;
  analytics: PlatformAnalyticsSettings;
}

export interface PlatformAdmin extends EntityBase {
  uid: string;
  email: string;
  displayName?: string;
  addedBy?: string;
}
