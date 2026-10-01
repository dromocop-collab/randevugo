export const BUSINESS_ONBOARDING_DRAFT_KEY = "sr-business-onboarding-draft-v1";

export interface BusinessOnboardingDraft {
  category: string;
  goals: string[];
  appointmentManagers: "owner" | "team";
  dailyAppointmentVolume: "0-5" | "6-10" | "11-20" | "21+";
  allowOnlineBooking: boolean;
  name: string;
  slug: string;
  city: string;
  phone: string;
}

export function readBusinessOnboardingDraft(): Partial<BusinessOnboardingDraft> {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(BUSINESS_ONBOARDING_DRAFT_KEY);
    return value ? JSON.parse(value) as Partial<BusinessOnboardingDraft> : {};
  } catch {
    return {};
  }
}

export function writeBusinessOnboardingDraft(value: Partial<BusinessOnboardingDraft>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUSINESS_ONBOARDING_DRAFT_KEY, JSON.stringify(value));
}

export function clearBusinessOnboardingDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BUSINESS_ONBOARDING_DRAFT_KEY);
}
