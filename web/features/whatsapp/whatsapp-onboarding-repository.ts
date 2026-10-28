import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

// Süper admin › WhatsApp karşılama akışı (yeni işletme sahibine otomatik mesajlar).
// Sunucu: getWhatsAppOnboarding / updateWhatsAppOnboarding / submitWhatsAppOnboardingTemplates /
// sendWhatsAppOnboardingTest / startWhatsAppOnboardingForBusiness (deploy grubu "sms").

export type OnboardingStepKey = "welcome" | "setup" | "first_booking" | "trial_ending";
export type OnboardingStepStatus = "pending" | "sent" | "skipped" | "failed" | "none";

export type OnboardingJob = {
  businessId: string; businessName: string; slug: string; phone: string; conversationId: string | null;
  status: string; source: string; createdAt: number | null; helpRequestedAt: number | null; helpRequest: string | null;
  steps: Array<{ key: OnboardingStepKey; status: OnboardingStepStatus; dueAt: number | null; at: number | null; reason: string | null; reasonLabel: string | null; error: string | null }>;
};

export type OnboardingOverview = {
  settings: { enabled: boolean; steps: Record<OnboardingStepKey, boolean> };
  channelEnabled: boolean;
  steps: Array<{
    key: OnboardingStepKey; label: string; template: string; delayMs: number; body: string; preview: string;
    buttons: Array<{ type: "URL" | "QUICK_REPLY"; text: string }>;
    templateStatus: { name: string; status: string; category: string; rejectedReason: string | null } | null;
  }>;
  templateError: string | null;
  stats: Array<{ key: OnboardingStepKey; sent: number; skipped: number; failed: number; pending: number }>;
  optOuts: number;
  helpRequests: number;
  jobs: OnboardingJob[];
};

function call<T>(name: string, data: Record<string, unknown> = {}) {
  return httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), name)(data).then((result) => result.data as T);
}

export const getWhatsAppOnboarding = () => call<OnboardingOverview>("getWhatsAppOnboarding");

export const updateWhatsAppOnboarding = (patch: { enabled?: boolean; steps?: Partial<Record<OnboardingStepKey, boolean>> }) =>
  call<{ success: boolean }>("updateWhatsAppOnboarding", patch);

export const submitWhatsAppOnboardingTemplates = () =>
  call<{ results: Array<{ name: string; result: string }> }>("submitWhatsAppOnboardingTemplates");

export const sendWhatsAppOnboardingTest = (step: OnboardingStepKey, phone: string) =>
  call<{ success: boolean }>("sendWhatsAppOnboardingTest", { step, phone });

export const startWhatsAppOnboardingForBusiness = (businessId: string, restart = false) =>
  call<{ success: boolean }>("startWhatsAppOnboardingForBusiness", { businessId, restart });
