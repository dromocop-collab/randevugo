import type { EntityBase } from "@/types/common";

export interface PlatformSettings extends EntityBase {
  platformName: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  bookingOpen: boolean;
  defaultPlan: string;
  featureFlags: Record<string, boolean>;
}

export interface PlatformAdmin extends EntityBase {
  uid: string;
  email: string;
  displayName?: string;
  addedBy?: string;
}
