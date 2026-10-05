/**
 * Anonim anket cevapları (surveyResponses). Kişisel veri YOK: yalnızca seçenek kimlikleri,
 * sonuç tipi, tahmini saat ve cihaz sınıfı. Kurallar: firestore.rules → match /surveyResponses.
 * Firebase SDK yalnızca kayıt anında, dinamik olarak yüklenir (sayfa paketi hafif kalsın).
 */

export type SurveyDevice = "mobile" | "tablet" | "desktop";

export type SurveyResponseInput = {
  surveyId: string;
  answers: Record<string, string>;
  resultType: string;
  hoursSaved: number;
  device: SurveyDevice;
};

export function detectSurveyDevice(): SurveyDevice {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

/** Hata fırlatmaz; kayıt başarısız olsa da deneyim bozulmaz. */
export async function saveSurveyResponse(input: SurveyResponseInput): Promise<boolean> {
  try {
    const [{ addDoc, collection, serverTimestamp }, { getDb }] = await Promise.all([
      import("firebase/firestore"),
      import("@/lib/firebase/firestore"),
    ]);
    await addDoc(collection(getDb(), "surveyResponses"), {
      surveyId: input.surveyId,
      answers: input.answers,
      resultType: input.resultType,
      hoursSaved: Math.round(input.hoursSaved),
      device: input.device,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}
