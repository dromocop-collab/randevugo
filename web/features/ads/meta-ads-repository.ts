import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

// Süper admin › Reklamlar. Sunucu: functions getMetaAdsOverview / updateMetaAdsSettings / updateMetaAdsEntity.
// Meta erişim anahtarı hiçbir zaman istemciye gelmez; yalnız var/yok bilgisi.

export type MetaStats = { spend: number; impressions: number; reach: number; linkClicks: number; landingPageViews: number; videoViews: number };
export type MetaAdRow = { id: string; name: string; status: string; effectiveStatus: string; thumbnailUrl: string | null; stats: MetaStats };
export type MetaAdSetRow = { id: string; name: string; status: string; effectiveStatus: string; dailyBudget: number | null; lifetimeBudget: number | null; stats: MetaStats; ads: MetaAdRow[] };
export type MetaCampaignRow = {
  id: string; name: string; status: string; effectiveStatus: string; objective: string; dailyBudget: number | null; lifetimeBudget: number | null;
  startTime: string | null; stats: MetaStats; adsets: MetaAdSetRow[];
};
export type SignupChannel = "meta_ads" | "meta_organic" | "google" | "other" | "direct";

export type MetaAdsOverview = {
  range: { since: string; until: string };
  connection: { connected: boolean; hasToken: boolean; adAccountId: string | null; updatedAt: string | null };
  signups: {
    total: number; paid: number; totalBusinesses: number | null; channels: Record<SignupChannel, number>;
    campaigns: Array<{ key: string; source: string; campaign: string | null; channel: SignupChannel; signups: number; paid: number }>;
    recent: Array<{ businessId: string; businessName: string; channel: SignupChannel; source: string | null; medium: string | null; campaign: string | null; content: string | null; paid: boolean; createdAt: string | null }>;
  };
  account: { name: string; currency: string; status: number; amountSpent: number; balance: number; disableReason: number } | null;
  campaigns: MetaCampaignRow[];
  daily: Array<MetaStats & { date: string }>;
  totals: (MetaStats & {
    metaSignups: number; metaPaid: number; cpc: number | null; ctr: number | null; costPerSignup: number | null; costPerPaid: number | null; signupRate: number | null;
  }) | null;
  metaErrors: string[];
};

export type MetaLevel = "campaign" | "adset" | "ad";

const fn = <I, O>(name: string) => httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);

export async function getMetaAdsOverview(days: number) {
  return (await fn<{ days: number }, MetaAdsOverview>("getMetaAdsOverview")({ days })).data;
}

export async function saveMetaAdsSettings(input: { accessToken?: string; adAccountId: string }) {
  return (await fn<typeof input, { connected: boolean; accountName: string; currency: string }>("updateMetaAdsSettings")(input)).data;
}

export async function disconnectMetaAds() {
  await fn<{ disconnect: true }, { connected: boolean }>("updateMetaAdsSettings")({ disconnect: true });
}

export async function updateMetaAdsEntity(input: { id: string; level: MetaLevel; action: "pause" | "resume" | "budget"; dailyBudget?: number }) {
  await fn<typeof input, { success: boolean }>("updateMetaAdsEntity")(input);
}
