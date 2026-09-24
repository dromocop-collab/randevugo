import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export type PushPlatform = "all" | "ios" | "android";
export type PushCategory = "service" | "campaign";
export type PushDestination = "discover" | "appointments" | "queue" | "account";

export type PlatformPushInput = {
  title: string;
  body: string;
  platform: PushPlatform;
  category: PushCategory;
  destination: PushDestination;
  templateId: string;
};

export type PlatformPushResult = {
  success: boolean;
  platform: PushPlatform;
  recipients: number;
  successCount: number;
  failureCount: number;
};

export type PlatformPushOperations = {
  summary: { total: number; ios: number; android: number };
  rows: Array<{
    id: string;
    title: string;
    body: string;
    category: PushCategory;
    platform: PushPlatform;
    destination: PushDestination;
    templateId: string;
    recipients: number;
    successCount: number;
    failureCount: number;
    status: string;
    createdAt: string | null;
  }>;
};

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function getPlatformPushOperations(): Promise<PlatformPushOperations> {
  const result = await callable<Record<string, never>, PlatformPushOperations>("getPlatformPushOperations")({});
  return result.data;
}

export async function sendPlatformPush(input: PlatformPushInput): Promise<PlatformPushResult> {
  const result = await callable<PlatformPushInput, PlatformPushResult>("sendPlatformPush")(input);
  return result.data;
}
