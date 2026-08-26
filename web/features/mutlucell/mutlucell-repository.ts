import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export type MutlucellLastTest = {
  success: boolean;
  phone?: string;
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
