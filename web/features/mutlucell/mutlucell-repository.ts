import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export type MutlucellLastTest = {
  success: boolean;
  phone?: string;
  senderTitle?: string;
  providerMessageId?: string;
  error?: string;
  testedAt?: { seconds?: number } | null;
};

export type MutlucellSettings = {
  username: string;
  senderTitle: string;
  enabled: boolean;
  fallbackEnabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
  source: "admin" | "secret" | "none";
  lastTest: MutlucellLastTest | null;
};

export type SmsOperation = {
  id: string;
  type: "confirmation" | "reminder" | "cancellation" | "reschedule";
  phoneMasked: string;
  status: "accepted" | "pending" | "delivered" | "failed";
  statusLabel: string;
  credits: number;
  sentAt: string | null;
};

export type SmsOperationsResult = {
  rows: SmsOperation[];
  summary: { total: number; delivered: number; pending: number; failed: number; credits: number };
};

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    name
  );
}

export async function getMutlucellSettings(): Promise<MutlucellSettings> {
  const result = await callable<Record<string, never>, MutlucellSettings>("getMutlucellSettings")({});
  return result.data;
}

export async function updateMutlucellSettings(input: {
  username: string;
  apiKey?: string;
  senderTitle: string;
  enabled: boolean;
  fallbackEnabled: boolean;
}): Promise<void> {
  await callable<typeof input, { success: boolean }>("updateMutlucellSettings")(input);
}

export async function testMutlucellSettings(phone: string): Promise<{ providerMessageId: string }> {
  const result = await callable<{ phone: string }, { success: boolean; providerMessageId: string }>(
    "testMutlucellSettings"
  )({ phone });
  return { providerMessageId: result.data.providerMessageId };
}

export async function getSmsOperations(): Promise<SmsOperationsResult> {
  const result = await callable<Record<string, never>, SmsOperationsResult>("getSmsOperations")({});
  return result.data;
}
