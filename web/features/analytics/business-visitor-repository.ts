import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import type { Journey } from "./visitor-analytics-repository";

// İşletme paneli › Analiz › Ziyaretçiler. Sunucu: functions getBusinessVisitorAnalytics (sayım trackVisit ile sunucuda).

export type BusinessVisitorAnalytics = {
  range: { days: number; since: string; until: string };
  totals: { views: number; visitors: number; sessions: number; newVisitors: number; storefrontVisitors: number; bookingVisitors: number; onlineAppointments: number | null };
  change: { views: number | null; visitors: number | null; sessions: number | null };
  series: Array<{ day: string; views: number; visitors: number; sessions: number; newVisitors: number }>;
  heatmap: number[][];
  live: { count: number; booking: number };
  sources: Array<{ key: string; value: number }>;
  sourceKinds: Record<string, number>;
  devices: Record<string, number>;
  langs: Record<string, number>;
  funnel: Array<{ key: string; label: string; value: number | null }>;
  journeys: Journey[];
};

export async function getBusinessVisitorAnalytics(businessId: string, days: number) {
  return (await httpsCallable<{ businessId: string; days: number }, BusinessVisitorAnalytics>(getFunctions(getFirebaseApp(), "europe-west1"), "getBusinessVisitorAnalytics")({ businessId, days })).data;
}
