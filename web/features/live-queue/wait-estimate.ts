import { interpolate, type TFunction } from "../../i18n/config.ts";

export interface LiveWaitEstimate {
  status: "available_now" | "short_wait" | "waiting" | "temporarily_unavailable" |
    "cannot_fit_before_appointment" | "business_closed" | "no_eligible_staff" | "insufficient_data";
  minWaitMinutes: number | null;
  maxWaitMinutes: number | null;
  estimatedServiceStart: string | null;
  peopleAhead: number | null;
  eligibleStaffCount: number;
  reason: string;
  calculatedAt: string;
}

/** Çeviri verilmezse Türkçe metin döner (t = useT() / getT() sonucu). */
const turkish: TFunction = (source, vars) => interpolate(source, vars);

export function waitEstimateLabel(estimate: LiveWaitEstimate | null, t: TFunction = turkish): string {
  if (!estimate) return t("Bekleme süresi şu anda hesaplanamıyor");
  if (estimate.status === "available_now") return t("Şimdi müsait");
  if (estimate.minWaitMinutes !== null && estimate.maxWaitMinutes !== null)
    return t("Tahmini bekleme: {min}–{max} dk", { min: estimate.minWaitMinutes, max: estimate.maxWaitMinutes });
  if (estimate.status === "business_closed") return t("Bugün canlı sıra kapalı");
  if (estimate.status === "no_eligible_staff") return t("Bugün uygun personel bulunmuyor");
  return t("Bekleme süresi şu anda hesaplanamıyor");
}
