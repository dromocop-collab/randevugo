import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

// Arkadaşını getir (referans). Sunucu: functions/src/referral-domain.ts + index.ts (getReferralProgram, checkReferralCode,
// adminListReferrals, adminUpdateReferrals). Davet linki ?ref=KOD tarayıcıda 30 gün tutulur, işletme açılırken gönderilir.

const KEY = "sr_referral";
const MAX_AGE_MS = 30 * 86_400_000;

const call = <I, O>(name: string) => httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);

/** "salon-7k2 " → "SALON7K2" (sunucu normalizeReferralCode ile aynı kural; Türkçe harfler sadeleşir). */
export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toLocaleUpperCase("tr-TR").replace(/İ/g, "I").replace(/Ğ/g, "G").replace(/Ü/g, "U").replace(/Ş/g, "S").replace(/Ö/g, "O").replace(/Ç/g, "C")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return /^[A-Z0-9]{5,12}$/.test(code) ? code : null;
}

/** Sayfa açılışında: linkte ?ref= varsa saklar (son davet geçerli). */
export function captureReferral() {
  try {
    const code = normalizeReferralCode(new URLSearchParams(window.location.search).get("ref"));
    if (code) window.localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch { /* depolama kapalı */ }
}

export function readReferralCode(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { code?: string; at?: number };
    if (!value.code || !value.at || Date.now() - value.at > MAX_AGE_MS) return null;
    return normalizeReferralCode(value.code);
  } catch { return null; }
}

export function saveReferralCode(code: string | null) {
  try {
    if (code) window.localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    else window.localStorage.removeItem(KEY);
  } catch { /* depolama kapalı */ }
}

export type ReferralCheck = { valid: boolean; enabled: boolean; code?: string; businessName?: string; city?: string; bonusDays?: number };
export async function checkReferralCode(code: string) {
  return (await call<{ code: string }, ReferralCheck>("checkReferralCode")({ code })).data;
}

export type ReferralRow = { id: string; businessName: string; status: "pending" | "rewarded" | "blocked" | "rejected" | string; reason: string | null; rewardMonths: number; createdAt: number | null; rewardedAt: number | null };
export type ReferralProgram = {
  code: string; link: string; enabled: boolean; rewardMonths: number; referredBonusDays: number; yearlyCap: number;
  stats: { invited: number; pending: number; rewarded: number; monthsEarned: number };
  referrals: ReferralRow[];
};
export async function getReferralProgram(businessId: string) {
  return (await call<{ businessId: string }, ReferralProgram>("getReferralProgram")({ businessId })).data;
}

export type ReferralSettings = { enabled: boolean; rewardMonths: number; yearlyCap: number; referredBonusDays: number };
export type AdminReferralRow = {
  id: string; code: string; channel: string; status: string; reason: string | null; reasonText: string | null;
  referredBusinessId: string; referredBusinessName: string; referrerBusinessId: string; referrerName: string; referrerOrganizationId: string;
  rewardMonths: number; bonusDays: number; createdAt: number | null; rewardedAt: number | null; forced: boolean;
};
export type AdminReferrals = {
  settings: ReferralSettings; referrals: AdminReferralRow[];
  leaders: Array<{ organizationId: string; name: string; businessId: string; invited: number; rewarded: number; months: number }>;
  totals: { invited: number; rewarded: number; pending: number; blocked: number; monthsGiven: number };
};
export async function adminListReferrals() {
  return (await call<Record<string, never>, AdminReferrals>("adminListReferrals")({})).data;
}
export async function adminSaveReferralSettings(settings: ReferralSettings) {
  return (await call<{ settings: ReferralSettings }, { settings: ReferralSettings }>("adminUpdateReferrals")({ settings })).data.settings;
}
export async function adminResolveReferral(businessId: string, action: "reward" | "reject") {
  await call<{ businessId: string; action: string }, { success: boolean }>("adminUpdateReferrals")({ businessId, action });
}
