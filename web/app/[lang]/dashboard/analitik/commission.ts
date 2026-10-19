// Prim (komisyon) raporu — saf hesap. Çalışan düzenleme penceresindeki hesapla aynı kural:
// ciro = tamamlanan randevuların servicePrice toplamı, prim = ciro × oran.
// Test: commission.test.mjs

// Saf modül (node testinde alias çözülmediği için i18n içe aktarılmaz): çeviri fonksiyonu parametre olarak gelir.
type TFunction = (source: string) => string;
const identity: TFunction = (source) => source;

type CommissionAppointment = { staffId: string; status: string; startAt: string; servicePrice?: number };
type CommissionStaff = { id: string; fullName: string; commissionRate?: number; isActive?: boolean; commissionPayouts?: Array<{ amount: number }> };

export type CommissionRow = {
  staffId: string;
  name: string;
  rate: number;
  completed: number;
  revenue: number;
  earned: number;
  /** Tüm zamanlar: hak edilen − ödenen (dönemden bağımsız). */
  outstanding: number;
};

const clampRate = (value: unknown) => {
  const rate = Number(value);
  return Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : 0;
};
const round2 = (value: number) => Math.round(value * 100) / 100;

export function buildCommissionReport(appointments: readonly CommissionAppointment[], staff: readonly CommissionStaff[], days: number, nowMillis = Date.now(), t: TFunction = identity) {
  const from = nowMillis - days * 86_400_000;
  const rows: CommissionRow[] = staff
    .filter((member) => member.isActive !== false || (member.commissionPayouts?.length ?? 0) > 0)
    .map((member) => {
      const rate = clampRate(member.commissionRate);
      const done = appointments.filter((item) => item.staffId === member.id && item.status === "completed");
      const inRange = done.filter((item) => {
        const at = new Date(item.startAt).getTime();
        return at >= from && at <= nowMillis;
      });
      const revenue = inRange.reduce((sum, item) => sum + Number(item.servicePrice ?? 0), 0);
      const allTimeEarned = done.reduce((sum, item) => sum + Number(item.servicePrice ?? 0), 0) * rate / 100;
      const paid = (member.commissionPayouts ?? []).reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);
      return {
        staffId: member.id, name: member.fullName || t("Çalışan"), rate, completed: inRange.length,
        revenue: round2(revenue), earned: round2(revenue * rate / 100), outstanding: round2(Math.max(0, allTimeEarned - paid)),
      };
    })
    .filter((row) => row.completed > 0 || row.outstanding > 0 || row.rate > 0)
    .sort((a, b) => b.earned - a.earned || b.revenue - a.revenue);
  const totals = rows.reduce((sum, row) => ({
    revenue: round2(sum.revenue + row.revenue), earned: round2(sum.earned + row.earned), outstanding: round2(sum.outstanding + row.outstanding),
  }), { revenue: 0, earned: 0, outstanding: 0 });
  return { rows, totals };
}

/** Excel'in Türkçe ayarlarında açılan CSV (noktalı virgül + BOM). */
export function commissionCsv(rows: readonly CommissionRow[], periodLabel: string, t: TFunction = identity, locale = "tr-TR"): string {
  const cell = (value: string | number) => {
    const text = typeof value === "number" ? value.toLocaleString(locale, { maximumFractionDigits: 2 }) : value;
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [
    [t("Dönem"), t("Çalışan"), t("Tamamlanan randevu"), t("Ciro (₺)"), t("Prim oranı (%)"), t("Hak edilen prim (₺)"), t("Ödenmemiş prim - tüm zamanlar (₺)")],
    ...rows.map((row) => [periodLabel, row.name, row.completed, row.revenue, row.rate, row.earned, row.outstanding]),
  ];
  return "﻿" + lines.map((line) => line.map(cell).join(";")).join("\r\n");
}
