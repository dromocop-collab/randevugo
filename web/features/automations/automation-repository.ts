import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

export type AutomationTrigger = "appointment_created" | "appointment_cancelled" | "appointment_completed" | "waitlist_created";

export type AutomationRule = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  title: string;
  message: string;
  runs: number;
  lastRunAt?: string;
  createdAt?: string;
};

function iso(value: unknown) {
  const stamp = value as Timestamp | undefined;
  return stamp?.toDate ? stamp.toDate().toISOString() : undefined;
}

export async function listAutomationRules(businessId: string): Promise<AutomationRule[]> {
  const snapshot = await getDocs(query(collection(getDb(), "businesses", businessId, "automationRules"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, name: String(data.name ?? "Otomasyon"), trigger: data.trigger as AutomationTrigger, enabled: data.enabled !== false, title: String(data.title ?? "İşletme bildirimi"), message: String(data.message ?? "Yeni bir işlem var."), runs: Number(data.runs ?? 0), lastRunAt: iso(data.lastRunAt), createdAt: iso(data.createdAt) };
  });
}

export async function createAutomationRule(businessId: string, input: Omit<AutomationRule, "id" | "runs" | "lastRunAt" | "createdAt">) {
  await addDoc(collection(getDb(), "businesses", businessId, "automationRules"), { ...input, action: "business_notification", runs: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function setAutomationRuleEnabled(businessId: string, ruleId: string, enabled: boolean) {
  await updateDoc(doc(getDb(), "businesses", businessId, "automationRules", ruleId), { enabled, updatedAt: serverTimestamp() });
}

export async function removeAutomationRule(businessId: string, ruleId: string) {
  await deleteDoc(doc(getDb(), "businesses", businessId, "automationRules", ruleId));
}
