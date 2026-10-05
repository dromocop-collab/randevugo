import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDocFromServer, type DocumentSnapshot } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";

// Süper admin işletme işlemleri: hepsi callable üzerinden; istemci doğrudan yazmaz.
function callable<I, O>(name: string) {
  return httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

/** Sunucudaki güncel işletme belgesi (önbellek değil). */
export function readBusinessFromServer(businessId: string): Promise<DocumentSnapshot> {
  return getDocFromServer(doc(getDb(), "businesses", businessId));
}

export async function setBusinessDiscoveryVisibility(businessId: string, hidden: boolean) {
  const result = await callable<{ businessId: string; hidden: boolean }, { success: boolean; hiddenFromDiscovery: boolean; changed: boolean }>(
    "setBusinessDiscoveryVisibility",
  )({ businessId, hidden });
  return result.data;
}

export async function setBusinessSuspension(businessId: string, suspended: boolean) {
  const result = await callable<{ businessId: string; suspended: boolean }, { success: boolean; isSuspended: boolean; status: string; changed: boolean }>(
    "setBusinessSuspension",
  )({ businessId, suspended });
  return result.data;
}

export async function assignBusinessPlan(businessId: string, plan: string) {
  const result = await callable<{ businessId: string; plan: string }, { success: boolean; plan: string; affectedBranches: number }>(
    "assignBusinessPlan",
  )({ businessId, plan });
  return result.data;
}

export async function reviewBusiness(businessId: string, decision: "approved" | "rejected", note?: string) {
  const result = await callable<{ businessId: string; decision: string; note?: string }, { success: boolean; status: string }>(
    "reviewBusiness",
  )({ businessId, decision, ...(note ? { note } : {}) });
  return result.data;
}
