"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/i18n/link";
import { ArrowRight, BellRing, CalendarCheck2, CalendarClock, ChartColumnBig, Download, Gauge, HandCoins, Layers3, Sparkles, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listStaff } from "@/features/staff/staff-repository";
import type { Staff } from "@/types/staff";
import { buildCommissionReport, commissionCsv } from "./commission";
import type { Appointment } from "@/types/appointments";
import { Notice, Panel, Pill, Segmented, Sk, StatTile, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { AreaChart, ColumnChart, RankBars, StackBar } from "./charts";
import { buildReport, currency as formatCurrency, type RangeDays } from "./report";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import css from "./analitik.module.css";

const RANGES = [
  { value: "7", label: tk("7 gün") },
  { value: "30", label: tk("30 gün") },
  { value: "90", label: tk("90 gün") },
] as const;

export function AnalyticsOverview() {
  const t = useT();
  const intl = useIntlLocale();
  const currency = (value: number) => formatCurrency(value, intl);
  const { businessId } = useBusinessContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(""); } });
    Promise.all([listAppointments(businessId), listCustomers(businessId), listStaff(businessId).catch(() => [] as Staff[])]).then(([items, customers, members]) => {
      if (!active) return; setAppointments(items); setCustomerCount(customers.length); setStaff(members);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : tk("Analitik verileri alınamadı.")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId]);

  const days = Number(range) as RangeDays;
  const report = useMemo(() => buildReport(appointments, customerCount, days, t, intl), [appointments, customerCount, days, t, intl]);
  const commission = useMemo(() => buildCommissionReport(appointments, staff, days, undefined, t), [appointments, staff, days, t]);
  if (loading) return <AnalyticsLoading />;

  const period = t("Son {days} gün", { days });
  const columns = report.buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, short: bucket.short, value: bucket.count }));
  const revenueValues = report.buckets.map((bucket) => bucket.revenue);
  const revenuePeak = report.buckets.reduce((best, bucket) => bucket.revenue > best.revenue ? bucket : best, report.buckets[0]);
  const labelEvery = days === 30 ? 5 : days === 90 ? 3 : 1;

  return (
    <div className={cx(css.stackY, studio.fadeIn)}>
      <div className={css.rangeBar}>
        <div className={css.rangeTitle}>
          <span className={studio.sectionLabel}>{period}</span>
          <div className={css.rangeHeading}>
            <h2>{t("Performans görünümü")}</h2>
            <Pill tone="ok" dot>{t("Canlı")}</Pill>
          </div>
        </div>
        <Segmented label={t("Tarih aralığı")} options={RANGES.map((item) => ({ ...item, label: t(item.label) }))} value={range} onChange={setRange} className={css.rangeSeg} />
      </div>

      {error ? <Notice tone="bad" title={t("Veriler alınamadı")}>{t(error)}</Notice> : null}

      <div className={studio.stats}>
        <StatTile accent icon={Wallet} label={t("Dönem geliri")} value={currency(report.revenue)} hint={<Delta value={report.revenueChange} note={t("tamamlanan randevular")} />} />
        <StatTile icon={CalendarCheck2} label={t("Randevu")} value={report.total} hint={<Delta value={report.appointmentChange} note={t("{count} tamamlandı", { count: report.completed })} />} />
        <StatTile icon={Gauge} label={t("Doluluk kalitesi")} value={t("%{percent}", { percent: report.completionRate })} hint={t("%{percent} gelmedi", { percent: report.noShowRate })} />
        <StatTile icon={UsersRound} label={t("Müşteri tabanı")} value={report.customers} hint={t("toplam kayıtlı müşteri")} />
      </div>

      <div className={css.gridMain}>
        <Panel icon={ChartColumnBig} title={t("Randevu akışı")} description={days === 90 ? t("Haftalık randevu sayısı") : t("Günlük randevu sayısı")}
          actions={<Pill tone="accent">{t("{count} randevu", { count: report.total })}</Pill>}>
          <ColumnChart data={columns} label={t("{period} randevu akışı", { period })} labelEvery={labelEvery} />
        </Panel>
        <Panel icon={TrendingUp} title={t("Gelir eğrisi")} description={t("Tamamlanan randevulardan")}
          actions={<Pill tone={report.revenueChange >= 0 ? "ok" : "bad"}>{report.revenueChange >= 0 ? "↑" : "↓"} {t("%{percent}", { percent: Math.abs(report.revenueChange) })}</Pill>}>
          <div className={css.revenueHead}>
            <strong>{currency(report.revenue)}</strong>
            <span>{t("Ortalama işlem {amount}", { amount: currency(report.averageTicket) })}</span>
          </div>
          <AreaChart values={revenueValues} label={t("{period} gelir eğrisi", { period })}
            summary={`${t("Toplam {amount}.", { amount: currency(report.revenue) })} ${revenuePeak && revenuePeak.revenue > 0 ? t("En yüksek {label}: {amount}.", { label: revenuePeak.label, amount: currency(revenuePeak.revenue) }) : t("Henüz tamamlanan randevu geliri yok.")}`} />
          <div className={css.areaAxis} aria-hidden>
            <span>{report.buckets[0]?.short}</span>
            <span>{report.buckets[report.buckets.length - 1]?.short}</span>
          </div>
        </Panel>
      </div>

      <div className={css.gridSplit}>
        <Panel icon={CalendarClock} title={t("Haftanın randevu ritmi")} description={t("Son {days} gündeki gün dağılımı", { days })}
          actions={<Pill tone="accent">{t("Yoğun gün: {day}", { day: report.busiestDay })}</Pill>}>
          <ColumnChart data={report.weekdays.map((day) => ({ key: day.label, label: day.label, short: day.label, value: day.value }))} label={t("Haftanın günlerine göre randevu dağılımı")} height={150} />
        </Panel>
        <Panel icon={Layers3} title={t("Durum dağılımı")} description={t("Operasyon kalitesini izleyin")}>
          <StackBar data={report.statuses} label={t("Randevu durum dağılımı")} total={report.total} />
        </Panel>
      </div>

      <div className={css.gridSplit}>
        <Panel icon={Sparkles} title={t("En çok tercih edilen hizmetler")} actions={<Pill>{t("{days} gün", { days })}</Pill>}>
          {report.services.length
            ? <RankBars label={t("Hizmet sıralaması")} data={report.services.map((service) => ({ key: service.name, label: service.name, value: service.count, display: currency(service.revenue), meta: t("{count} randevu", { count: service.count }) }))} />
            : <EmptyLine text={t("Hizmet analizi için tamamlanan randevu bekleniyor.")} />}
        </Panel>
        <Panel icon={UsersRound} title={t("Ekip performansı")} description={t("Gerçekleşen ve planlı randevular")}>
          {report.staff.length
            ? <RankBars label={t("Ekip sıralaması")} data={report.staff.map((member) => ({ key: member.name, label: member.name, value: member.count, display: t("{count} randevu", { count: member.count }), meta: t("{amount} gelir", { amount: currency(member.revenue) }) }))} />
            : <EmptyLine text={t("Ekip karşılaştırması için randevu verisi bekleniyor.")} />}
        </Panel>
      </div>

      <Panel icon={HandCoins} title={t("Prim raporu")} description={t("{period} · tamamlanan randevu cirosu × çalışanın prim oranı", { period })}
        actions={commission.rows.length ? <button type="button" className={cx(studio.btn, studio.btnSoft)} onClick={() => downloadCsv(commissionCsv(commission.rows, period, t, intl), `prim-raporu-${days}-gun.csv`)}><Download size={15} aria-hidden /> {t("CSV indir")}</button> : null}>
        {commission.rows.length ? (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <caption className={studio.srOnly}>{t("{period} prim raporu", { period })}</caption>
              <thead><tr><th scope="col">{t("Çalışan")}</th><th scope="col">{t("Randevu")}</th><th scope="col">{t("Ciro")}</th><th scope="col">{t("Oran")}</th><th scope="col">{t("Hak edilen")}</th><th scope="col" title={t("Tüm zamanlarda hak edilen − ödenen")}>{t("Ödenmemiş")}</th></tr></thead>
              <tbody>
                {commission.rows.map((row) => (
                  <tr key={row.staffId}>
                    <th scope="row">{row.name}</th>
                    <td>{row.completed}</td>
                    <td>{currency(row.revenue)}</td>
                    <td>{t("%{percent}", { percent: row.rate })}</td>
                    <td><b>{currency(row.earned)}</b></td>
                    <td>{row.outstanding > 0 ? <Pill tone="warn">{currency(row.outstanding)}</Pill> : <Pill tone="ok">{t("Ödendi")}</Pill>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row">{t("Toplam")}</th><td /><td>{currency(commission.totals.revenue)}</td><td /><td><b>{currency(commission.totals.earned)}</b></td><td>{currency(commission.totals.outstanding)}</td></tr></tfoot>
            </table>
          </div>
        ) : <EmptyLine text={t("Prim raporu için Çalışanlar sayfasından çalışanlara prim oranı girin; tamamlanan randevular burada hesaplanır.")} />}
        <p className={css.tableNote}>{t("Prim ödemesini çalışanın düzenleme penceresindeki \"Ödendi işaretle\" ile kaydedin; ödenmemiş tutar buradan düşer.")}</p>
      </Panel>

      <Panel icon={Sparkles} title={t("Akıllı öneriler")} description={t("Verinizden çıkan, hemen uygulayabileceğiniz sıradaki adımlar")}
        actions={<Pill tone="accent">{t("{count} aksiyon hazır", { count: report.insights.length })}</Pill>}>
        <div className={css.insights}>
          {report.insights.map((insight, index) => {
            const Icon = [CalendarClock, BellRing, Sparkles][index] ?? Sparkles;
            return (
              <article key={insight.title} className={cx(css.insight, css.tone)} data-tone={insight.tone}>
                <div className={css.insightHead}>
                  <span className={css.insightIcon}><Icon size={20} strokeWidth={2.2} aria-hidden /></span>
                  <span className={css.insightBadge}>{insight.badge}</span>
                </div>
                <h3>{insight.title}</h3>
                <p>{insight.text}</p>
                <p className={css.insightBenefit}><b>{t("Beklenen fayda:")}</b> {insight.benefit}</p>
                <Link href={insight.href} className={cx(studio.btn, studio.btnSoft, studio.btnBlock)}>{insight.action}<ArrowRight size={15} aria-hidden /></Link>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Delta({ value, note }: { value: number; note: string }) {
  const t = useT();
  return <span className={css.delta}><Pill tone={value >= 0 ? "ok" : "bad"}>{value >= 0 ? "↑" : "↓"} {t("%{percent}", { percent: Math.abs(value) })}</Pill><span>{note}</span></span>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className={css.emptyLine}>{text}</div>;
}

function AnalyticsLoading() {
  const t = useT();
  return (
    <div role="status" aria-live="polite" aria-label={t("Analiz yükleniyor")} className={css.stackY}>
      <Sk h={64} r={18} />
      <div className={studio.stats}>{[1, 2, 3, 4].map((i) => <Sk key={i} h={112} r={18} />)}</div>
      <div className={css.gridMain}><Sk h={300} r={26} /><Sk h={300} r={26} /></div>
    </div>
  );
}
