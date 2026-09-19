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

export function waitEstimateLabel(estimate: LiveWaitEstimate | null): string {
  if (!estimate) return "Bekleme süresi şu anda hesaplanamıyor";
  if (estimate.status === "available_now") return "Şimdi müsait";
  if (estimate.minWaitMinutes !== null && estimate.maxWaitMinutes !== null)
    return `Tahmini bekleme: ${estimate.minWaitMinutes}–${estimate.maxWaitMinutes} dk`;
  if (estimate.status === "business_closed") return "Bugün canlı sıra kapalı";
  if (estimate.status === "no_eligible_staff") return "Bugün uygun personel bulunmuyor";
  return "Bekleme süresi şu anda hesaplanamıyor";
}
