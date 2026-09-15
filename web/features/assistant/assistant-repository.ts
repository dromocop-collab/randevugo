import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

export type AssistantScope = "business" | "platform";
export type AssistantHistoryRow = { id: string; role: "assistant" | "user"; body: string; createdAt: string };
type AssistantTurn = { role: "assistant" | "user"; body: string };

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

export async function askSmartAssistant(input: {
  scope: AssistantScope;
  businessId?: string;
  message: string;
  history: AssistantTurn[];
  context: Record<string, unknown>;
}) {
  const result = await callable<typeof input, { body: string; conversationId: string; cached: boolean }>("assistantChat")(input);
  return result.data;
}

export async function getSmartAssistantHistory(scope: AssistantScope, businessId?: string) {
  const result = await callable<{ scope: AssistantScope; businessId?: string }, { messages: AssistantHistoryRow[] }>("getAssistantHistory")({ scope, businessId });
  return result.data.messages;
}

export async function clearSmartAssistantHistory(scope: AssistantScope, businessId?: string) {
  await callable<{ scope: AssistantScope; businessId?: string }, { success: boolean }>("clearAssistantHistory")({ scope, businessId });
}
