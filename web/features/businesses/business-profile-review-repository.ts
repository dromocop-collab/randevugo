import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getDb } from "@/lib/firebase/firestore";

export type BusinessProfileChangeRequest = {
  id: string;
  businessId: string;
  businessName: string;
  ownerUid: string;
  submittedBy: string;
  status: "pending" | "approved" | "rejected";
  previous: Record<string, unknown>;
  changes: Record<string, unknown>;
  changedFields: string[];
  riskFlags: string[];
  riskLevel: "low" | "review";
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

function timestampToIso(value: unknown): string | undefined {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : undefined;
}

export async function submitBusinessProfileChange(
  businessId: string,
  changes: Record<string, unknown>,
): Promise<{ requestId: string; riskLevel: "low" | "review" }> {
  const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "submitBusinessProfileChange");
  const result = await callable({ businessId, changes });
  return result.data as { requestId: string; riskLevel: "low" | "review" };
}

export async function listBusinessProfileChangeRequests(): Promise<BusinessProfileChangeRequest[]> {
  const snapshot = await getDocs(collection(getDb(), "businessProfileChangeRequests"));
  return snapshot.docs.map((item): BusinessProfileChangeRequest => {
    const data = item.data();
    return {
      id: item.id,
      businessId: String(data.businessId ?? ""),
      businessName: String(data.businessName ?? "İşletme"),
      ownerUid: String(data.ownerUid ?? ""),
      submittedBy: String(data.submittedBy ?? ""),
      status: data.status === "approved" || data.status === "rejected" ? data.status : "pending",
      previous: data.previous ?? {},
      changes: data.changes ?? {},
      changedFields: Array.isArray(data.changedFields) ? data.changedFields.map(String) : [],
      riskFlags: Array.isArray(data.riskFlags) ? data.riskFlags.map(String) : [],
      riskLevel: data.riskLevel === "review" ? "review" as const : "low" as const,
      submittedAt: timestampToIso(data.submittedAt),
      reviewedAt: timestampToIso(data.reviewedAt),
      reviewNote: typeof data.reviewNote === "string" ? data.reviewNote : undefined,
    };
  }).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
}

export async function reviewBusinessProfileChange(
  requestId: string,
  decision: "approved" | "rejected",
  note = "",
): Promise<void> {
  const callable = httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "reviewBusinessProfileChange");
  await callable({ requestId, decision, note });
}
