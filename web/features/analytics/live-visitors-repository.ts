import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

// Süper admin › canlı ziyaretçiler: analyticsVisitors (yalnız platform yöneticisi okur). Pencere her dakika kayar.

export type LiveTrailItem = { t: "page"; p: string; pt: string; at: number } | { t: "action"; a: string; at: number };
export type LiveVisitor = {
  id: string; lastSeenAt: number; sessionStartAt: number | null; lastPath: string; lastPageType: string; lastAction: string | null; lastActionAt: number | null;
  sourceKind: string; sourceLabel: string; device: string; browser: string; os: string; lang: string; newVisitor: boolean; views: number; trail: LiveTrailItem[];
};

const ms = (value: unknown) => value instanceof Timestamp ? value.toMillis() : null;

export function subscribeLiveVisitors(windowMs: number, onData: (rows: LiveVisitor[]) => void, onError: (error: Error) => void) {
  const since = Timestamp.fromMillis(Date.now() - windowMs);
  return onSnapshot(query(collection(getDb(), "analyticsVisitors"), where("lastSeenAt", ">=", since), orderBy("lastSeenAt", "desc"), limit(60)), (snapshot) => {
    onData(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id, lastSeenAt: ms(data.lastSeenAt) ?? 0, sessionStartAt: ms(data.sessionStartAt), lastPath: String(data.lastPath ?? "/"),
        lastPageType: String(data.lastPageType ?? "other"), lastAction: typeof data.lastAction === "string" ? data.lastAction : null, lastActionAt: ms(data.lastActionAt),
        sourceKind: String(data.sessionSourceKind ?? "direct"), sourceLabel: String(data.sessionSourceLabel ?? "Doğrudan"), device: String(data.device ?? "desktop"),
        browser: String(data.browser ?? ""), os: String(data.os ?? ""), lang: String(data.lang ?? "tr"), newVisitor: data.newVisitorSession === true,
        views: typeof data.sessionViews === "number" ? data.sessionViews : 1,
        trail: Array.isArray(data.sessionTrail) ? (data.sessionTrail as LiveTrailItem[]) : [],
      };
    }));
  }, onError);
}
