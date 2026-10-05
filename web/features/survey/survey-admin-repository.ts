/**
 * Süper admin → Anket: surveyResponses / surveyEvents okuma (yalnızca platform admin; firestore.rules).
 * Tek alanlı createdAt aralığı + orderBy createdAt → bileşik index gerekmez.
 */

import { Timestamp, collection, getDocs, limit, orderBy, query, where, type QueryConstraint } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { SurveyDevice } from "./survey-repository";
import type { SurveyEventType } from "./survey-events";

export const SURVEY_ADMIN_LIMIT = 2000;

export type AdminSurveyResponse = {
  id: string;
  answers: Record<string, string>;
  resultType: string;
  hoursSaved: number;
  device: SurveyDevice | string;
  createdAtMs: number | null;
};

export type AdminSurveyEvent = {
  id: string;
  type: SurveyEventType | string;
  resultType: string | null;
  device: SurveyDevice | string;
  createdAtMs: number | null;
};

export type SurveyLoadResult<T> = { rows: T[]; truncated: boolean };

function toMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function rangeConstraints(sinceMs: number | null): QueryConstraint[] {
  return [
    ...(sinceMs ? [where("createdAt", ">=", Timestamp.fromMillis(sinceMs))] : []),
    orderBy("createdAt", "desc"),
    limit(SURVEY_ADMIN_LIMIT),
  ];
}

export async function listSurveyResponses(sinceMs: number | null): Promise<SurveyLoadResult<AdminSurveyResponse>> {
  const snapshot = await getDocs(query(collection(getDb(), "surveyResponses"), ...rangeConstraints(sinceMs)));
  const rows = snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      answers: data.answers && typeof data.answers === "object" ? data.answers as Record<string, string> : {},
      resultType: String(data.resultType ?? ""),
      hoursSaved: typeof data.hoursSaved === "number" ? data.hoursSaved : 0,
      device: String(data.device ?? ""),
      createdAtMs: toMs(data.createdAt),
    };
  });
  return { rows, truncated: snapshot.size >= SURVEY_ADMIN_LIMIT };
}

export async function listSurveyEvents(sinceMs: number | null): Promise<SurveyLoadResult<AdminSurveyEvent>> {
  const snapshot = await getDocs(query(collection(getDb(), "surveyEvents"), ...rangeConstraints(sinceMs)));
  const rows = snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      type: String(data.type ?? ""),
      resultType: typeof data.resultType === "string" ? data.resultType : null,
      device: String(data.device ?? ""),
      createdAtMs: toMs(data.createdAt),
    };
  });
  return { rows, truncated: snapshot.size >= SURVEY_ADMIN_LIMIT };
}

export function isPermissionDenied(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "permission-denied");
}
