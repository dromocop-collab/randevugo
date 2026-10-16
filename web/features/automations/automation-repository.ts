import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// Sunucu ile aynı liste: functions/src/automation-domain.ts (AUTOMATION_TRIGGERS).
export type AutomationTrigger =
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_completed"
  | "appointment_no_show"
  | "waitlist_created";

export type AutomationCancelledBy = "any" | "customer" | "business";

export type AutomationRuleInput = {
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  title: string;
  message: string;
  customerTitle: string;
  customerMessage: string;
  conditions: { serviceIds: string[]; staffIds: string[]; cancelledBy: AutomationCancelledBy };
  channels: { teamPush: boolean; customerPush: boolean };
};

export type AutomationRule = AutomationRuleInput & {
  id: string;
  runs: number;
  lastRunAt?: string;
  createdAt?: string;
};

export type AutomationRun = {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: AutomationTrigger;
  title: string;
  body: string;
  customerName: string;
  channels: { teamPush: boolean; customerPush: boolean };
  test: boolean;
  createdAt?: string;
};

function iso(value: unknown) {
  const stamp = value as Timestamp | undefined;
  return stamp?.toDate ? stamp.toDate().toISOString() : undefined;
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export async function listAutomationRules(businessId: string): Promise<AutomationRule[]> {
  const snapshot = await getDocs(query(collection(getDb(), "businesses", businessId, "automationRules"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    const conditions = (data.conditions ?? {}) as Record<string, unknown>;
    const channels = (data.channels ?? {}) as Record<string, unknown>;
    return {
      id: item.id,
      name: String(data.name ?? "Otomasyon"),
      trigger: data.trigger as AutomationTrigger,
      enabled: data.enabled !== false,
      title: String(data.title ?? "İşletme bildirimi"),
      message: String(data.message ?? "Yeni bir işlem var."),
      customerTitle: String(data.customerTitle ?? ""),
      customerMessage: String(data.customerMessage ?? ""),
      conditions: {
        serviceIds: strings(conditions.serviceIds),
        staffIds: strings(conditions.staffIds),
        cancelledBy: conditions.cancelledBy === "customer" || conditions.cancelledBy === "business" ? conditions.cancelledBy : "any",
      },
      channels: { teamPush: channels.teamPush === true, customerPush: channels.customerPush === true },
      runs: Number(data.runs ?? 0),
      lastRunAt: iso(data.lastRunAt),
      createdAt: iso(data.createdAt),
    };
  });
}

export async function listAutomationRuns(businessId: string, max = 25): Promise<AutomationRun[]> {
  const snapshot = await getDocs(query(collection(getDb(), "businesses", businessId, "automationRuns"), orderBy("createdAt", "desc"), limit(max)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    const channels = (data.channels ?? {}) as Record<string, unknown>;
    return {
      id: item.id,
      ruleId: String(data.ruleId ?? ""),
      ruleName: String(data.ruleName ?? "Otomasyon"),
      trigger: data.trigger as AutomationTrigger,
      title: String(data.title ?? ""),
      body: String(data.body ?? ""),
      customerName: String(data.customerName ?? ""),
      channels: { teamPush: channels.teamPush === true, customerPush: channels.customerPush === true },
      test: data.test === true,
      createdAt: iso(data.createdAt),
    };
  });
}

function payload(input: AutomationRuleInput) {
  return {
    name: input.name.trim().slice(0, 80) || "Otomasyon",
    trigger: input.trigger,
    enabled: input.enabled,
    title: input.title.trim().slice(0, 120),
    message: input.message.trim().slice(0, 500),
    customerTitle: input.customerTitle.trim().slice(0, 120),
    customerMessage: input.customerMessage.trim().slice(0, 240),
    conditions: input.conditions,
    channels: { teamPush: input.channels.teamPush, customerPush: input.trigger !== "waitlist_created" && input.channels.customerPush },
  };
}

export async function createAutomationRule(businessId: string, input: AutomationRuleInput) {
  await addDoc(collection(getDb(), "businesses", businessId, "automationRules"), { ...payload(input), action: "business_notification", runs: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateAutomationRule(businessId: string, ruleId: string, input: AutomationRuleInput) {
  await updateDoc(doc(getDb(), "businesses", businessId, "automationRules", ruleId), { ...payload(input), updatedAt: serverTimestamp() });
}

export async function setAutomationRuleEnabled(businessId: string, ruleId: string, enabled: boolean) {
  await updateDoc(doc(getDb(), "businesses", businessId, "automationRules", ruleId), { enabled, updatedAt: serverTimestamp() });
}

export async function removeAutomationRule(businessId: string, ruleId: string) {
  await deleteDoc(doc(getDb(), "businesses", businessId, "automationRules", ruleId));
}

export async function testAutomationRule(businessId: string, ruleId: string) {
  const call = httpsCallable<{ businessId: string; ruleId: string }, { success: boolean; title: string; body: string; customerPreview: { title: string; body: string } | null }>(
    getFunctions(getFirebaseApp(), "europe-west1"), "testBusinessAutomation");
  return (await call({ businessId, ruleId })).data;
}
