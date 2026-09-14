import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

export type DashboardAppearanceRecord = {
  skin?: string;
  density?: string;
  motion?: string;
  cursor?: string;
  modules?: Array<{ id: string; enabled: boolean }>;
};

const APPEARANCE_DOC_ID = "dashboardAppearance";

export async function getDashboardAppearancePreferences(userId: string): Promise<DashboardAppearanceRecord | null> {
  const snapshot = await getDoc(doc(getDb(), "users", userId, "preferences", APPEARANCE_DOC_ID));
  return snapshot.exists() ? snapshot.data() as DashboardAppearanceRecord : null;
}

export async function saveDashboardAppearancePreferences(userId: string, preferences: Required<DashboardAppearanceRecord>): Promise<void> {
  await setDoc(
    doc(getDb(), "users", userId, "preferences", APPEARANCE_DOC_ID),
    { ...preferences, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
