import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import type { SpinResult, WheelSettings, WheelSliceSettings } from "./wheel-domain";

const call = <T,>(name: string, data?: unknown) =>
  httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), name)(data).then((result) => result.data as T);

export type WheelSpinRow = {
  id: string;
  campaignId: string;
  customerName: string;
  phone: string;
  prize: { type: string; value: number; label: string; serviceName: string | null } | null;
  prizeText: string;
  code: string | null;
  status: "won" | "reserved" | "used" | "none" | "points_awarded" | string;
  appointmentId: string | null;
  discountApplied: number | null;
  createdAt: number | null;
  expiresAt: number | null;
  usedAt: number | null;
};

export type WheelSettingsInput = {
  enabled: boolean;
  title: string;
  subtitle: string;
  startsAt: number | null;
  endsAt: number | null;
  prizeValidDays: number;
  slices: Array<Pick<WheelSliceSettings, "id" | "label" | "type" | "value" | "serviceId" | "weight" | "stock" | "color">>;
  newCampaign?: boolean;
};

export const getCampaignWheelSettings = (businessId: string) =>
  call<{ settings: WheelSettings | null }>("getCampaignWheelSettings", { businessId }).then((result) => result.settings);

export const saveCampaignWheelSettings = (businessId: string, settings: WheelSettingsInput) =>
  call<{ settings: WheelSettings | null }>("saveCampaignWheelSettings", { businessId, settings }).then((result) => result.settings);

export const listCampaignWheelSpins = (businessId: string) =>
  call<{ spins: WheelSpinRow[] }>("listCampaignWheelSpins", { businessId }).then((result) => result.spins);

export const spinCampaignWheel = (input: { businessId: string; phone: string; customerName: string }) =>
  call<SpinResult>("spinCampaignWheel", input);

export type CodeChannel = "whatsapp" | "sms";

export const sendWheelVerificationCode = (phone: string, channel?: "sms") =>
  call<{ success: boolean; smsDelivered?: boolean; channel?: CodeChannel; message?: string }>("sendVerificationCode", { phone, ...(channel ? { channel } : {}) });

export const verifyWheelPhoneCode = (phone: string, code: string) =>
  call<{ success: boolean; verified: boolean }>("verifyPhoneCode", { phone, code });

/** Aynı cihazda ikinci açılışta ödülü hemen göstermek için (yalnız kolaylık; asıl kayıt sunucuda). */
const memoryKey = (businessId: string, campaignId: string) => `sr-wheel:${businessId}:${campaignId}`;

export function rememberSpin(businessId: string, campaignId: string, result: SpinResult) {
  try { localStorage.setItem(memoryKey(businessId, campaignId), JSON.stringify(result)); } catch { /* gizli sekme */ }
}

export function recalledSpin(businessId: string, campaignId: string): SpinResult | null {
  try {
    const raw = localStorage.getItem(memoryKey(businessId, campaignId));
    return raw ? JSON.parse(raw) as SpinResult : null;
  } catch {
    return null;
  }
}
