/**
 * Anket hunisi olayları (surveyEvents). Kişisel veri YOK: yalnızca olay tipi, (varsa) sonuç tipi
 * ve cihaz sınıfı. Kurallar: firestore.rules → match /surveyEvents (create-only, sıkı doğrulama).
 *
 * "complete" olayı ayrıca LOGLANMAZ: tamamlanma surveyResponses kayıtlarından sayılır.
 * Fire-and-forget: hata fırlatmaz, Firebase SDK yalnızca ilk olayda dinamik yüklenir.
 */

import { detectSurveyDevice } from "./survey-repository";

export type SurveyEventType = "view" | "start" | "complete" | "cta_signup" | "cta_customer" | "share" | "restart";

const SURVEY_ID = "isletme-anketi-v1";
const VIEW_SESSION_KEY = "sr-anket-view-v1";

/** Sayfa yüklemesi başına olay tipi üst sınırı (spam/çift tık koruması). */
const MAX_PER_LOAD: Record<SurveyEventType, number> = {
  view: 1, start: 1, complete: 3, cta_signup: 3, cta_customer: 3, share: 3, restart: 5,
};
const sentThisLoad = new Map<SurveyEventType, number>();

function viewAlreadyLogged(): boolean {
  try {
    if (window.sessionStorage.getItem(VIEW_SESSION_KEY)) return true;
    window.sessionStorage.setItem(VIEW_SESSION_KEY, "1");
  } catch { /* gizli sekme vb.: sayfa yüklemesi sınırı yeterli */ }
  return false;
}

export function logSurveyEvent(type: SurveyEventType, resultType?: string): void {
  if (typeof window === "undefined") return;
  const count = sentThisLoad.get(type) ?? 0;
  if (count >= MAX_PER_LOAD[type]) return;
  sentThisLoad.set(type, count + 1);
  if (type === "view" && viewAlreadyLogged()) return;

  void (async () => {
    try {
      const [{ addDoc, collection, serverTimestamp }, { getDb }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase/firestore"),
      ]);
      await addDoc(collection(getDb(), "surveyEvents"), {
        surveyId: SURVEY_ID,
        type,
        ...(resultType ? { resultType } : {}),
        device: detectSurveyDevice(),
        createdAt: serverTimestamp(),
      });
    } catch { /* ölçüm deneyimi asla bozmaz */ }
  })();
}
