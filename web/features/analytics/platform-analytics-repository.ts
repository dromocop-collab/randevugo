import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

export type AnalyticsDevice = "mobile" | "tablet" | "desktop";

export interface PlatformPageView {
  id: string;
  path: string;
  title: string;
  referrer: string;
  device: AnalyticsDevice;
  sessionId: string;
  createdAt: unknown;
}

export async function recordPageView(input: Omit<PlatformPageView, "id" | "createdAt">) {
  await addDoc(collection(getDb(), "platformAnalyticsEvents"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function listRecentPageViews(maxResults = 2500): Promise<PlatformPageView[]> {
  const snapshot = await getDocs(query(
    collection(getDb(), "platformAnalyticsEvents"),
    orderBy("createdAt", "desc"),
    limit(Math.min(Math.max(maxResults, 1), 5000)),
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PlatformPageView));
}
