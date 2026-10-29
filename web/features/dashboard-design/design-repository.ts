// Süper admin › Panel Tasarımı: kaydet + geçmiş. Yazma kuralı: platformSettings ve dashboardDesignHistory yalnız süper admin.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { DASHBOARD_DESIGN_DOC } from "./dashboard-design-context";
import { parseDashboardDesign, type DashboardDesign } from "./design-domain";

export type DesignHistoryEntry = { id: string; design: DashboardDesign; savedAt: number | null; savedBy: string; note: string };

export async function getDashboardDesign(): Promise<{ design: DashboardDesign; updatedAt: number | null; updatedBy: string }> {
  const snapshot = await getDoc(doc(getDb(), ...DASHBOARD_DESIGN_DOC));
  const data = snapshot.data() ?? {};
  return { design: parseDashboardDesign(data), updatedAt: data.updatedAt?.toMillis?.() ?? null, updatedBy: String(data.updatedBy ?? "") };
}

/** Tasarımı yayınlar ve geçmişe bir kopya ekler (tek yazma işlemi). */
export async function saveDashboardDesign(design: DashboardDesign, savedBy: string, note: string): Promise<void> {
  const db = getDb();
  const clean = parseDashboardDesign(design);
  const batch = writeBatch(db);
  batch.set(doc(db, ...DASHBOARD_DESIGN_DOC), { ...clean, updatedAt: serverTimestamp(), updatedBy: savedBy });
  batch.set(doc(collection(db, "dashboardDesignHistory")), { design: clean, savedAt: serverTimestamp(), savedBy, note: note.trim().slice(0, 120) });
  await batch.commit();
}

export async function listDesignHistory(max = 25): Promise<DesignHistoryEntry[]> {
  const snapshot = await getDocs(query(collection(getDb(), "dashboardDesignHistory"), orderBy("savedAt", "desc"), limit(max)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, design: parseDashboardDesign(data.design), savedAt: data.savedAt?.toMillis?.() ?? null, savedBy: String(data.savedBy ?? ""), note: String(data.note ?? "") };
  });
}
