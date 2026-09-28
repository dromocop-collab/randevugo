import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export type AdminSubscriptionMode = "trialing" | "active" | "past_due" | "cancelled" | "expired" | "lifetime";

export async function updateBusinessSubscription(input: {
  businessId: string;
  mode: AdminSubscriptionMode;
  endAtMillis?: number;
}): Promise<{ affectedBranches: number }> {
  const callable = httpsCallable<typeof input, { success: boolean; affectedBranches: number }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "updateBusinessSubscription"
  );
  const result = await callable(input);
  return { affectedBranches: Number(result.data.affectedBranches ?? 1) };
}

export async function ensureAdminOwnedBusinessesLifetime(): Promise<number> {
  const callable = httpsCallable<Record<string, never>, { success: boolean; affectedBusinesses: number }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "ensureAdminOwnedBusinessesLifetime"
  );
  const result = await callable({});
  return Number(result.data.affectedBusinesses ?? 0);
}

export async function backfillLegacyBusinessSubscriptions(): Promise<{ processed: number; updated: number }> {
  const callable = httpsCallable<
    { cursor?: string },
    { success: boolean; processed: number; updated: number; nextCursor: string | null }
  >(getFunctions(getFirebaseApp(), "europe-west1"), "backfillLegacyBusinessSubscriptions");
  let cursor: string | undefined;
  let processed = 0;
  let updated = 0;
  do {
    const result = await callable(cursor ? { cursor } : {});
    processed += Number(result.data.processed ?? 0);
    updated += Number(result.data.updated ?? 0);
    cursor = result.data.nextCursor || undefined;
  } while (cursor);
  return { processed, updated };
}
