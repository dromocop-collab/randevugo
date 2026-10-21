import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

// Süper admin › Ziyaretçi analitiği. Sunucu: functions getVisitorAnalytics (sayım trackVisit ile sunucuda yapılır).

export type Entry = { key: string; value: number };
export type FunnelStep = { key: string; label: string; value: number | null };
export type JourneyStep = { path: string; pageType: string; at: number };
export type Journey = {
  session: string; visitor: string; sourceKind: string; sourceLabel: string; device: string; browser: string; os: string; lang: string;
  newVisitor: boolean; startedAt: number; lastAt: number; durationMs: number; steps: JourneyStep[]; reachedSignup: boolean; reachedBooking: boolean;
};

export type VisitorAnalytics = {
  range: { days: number; since: string; until: string };
  totals: { views: number; visitors: number; sessions: number; newVisitors: number; excluded: number; uniqueVisitors: number; pagesPerSession: number | null };
  change: { views: number | null; visitors: number | null; sessions: number | null; newVisitors: number | null };
  series: Array<{ day: string; views: number; visitors: number; sessions: number; newVisitors: number }>;
  heatmap: number[][];
  live: { count: number; pages: Array<{ path: string; count: number }> };
  pages: Entry[]; entries: Entry[]; sources: Entry[]; sourceKinds: Record<string, number>;
  devices: Record<string, number>; browsers: Entry[]; os: Entry[]; langs: Record<string, number>; pageTypes: Record<string, number>;
  funnels: { business: FunnelStep[]; booking: FunnelStep[]; ads: FunnelStep[] };
  journeys: Journey[];
  recent: Array<{ id: string; at: string | null; path: string; lang: string; pageType: string; device: string; browser: string; sourceKind: string; sourceLabel: string; newVisitor: boolean; visitor: string }>;
};

export async function getVisitorAnalytics(days: number) {
  return (await httpsCallable<{ days: number }, VisitorAnalytics>(getFunctions(getFirebaseApp(), "europe-west1"), "getVisitorAnalytics")({ days })).data;
}
