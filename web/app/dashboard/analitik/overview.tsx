"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarCheck2, CalendarClock, ChartColumnBig, Gauge, Layers3, Sparkles, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import type { Appointment } from "@/types/appointments";
import { Notice, Panel, Pill, Segmented, Sk, StatTile, cx, studio } from "@/app/dashboard/_studio";
import { AreaChart, ColumnChart, RankBars, StackBar } from "./charts";
import { buildReport, currency, type RangeDays } from "./report";
import css from "./analitik.module.css";

const RANGES = [
  { value: "7", label: "7 gün" },
  { value: "30", label: "30 gün" },
  { value: "90", label: "90 gün" },
] as const;

export function AnalyticsOverview() {
  const { businessId } = useBusinessContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(""); } });
    Promise.all([listAppointments(businessId), listCustomers(businessId)]).then(([items, customers]) => {
      if (!active) return; setAppointments(items); setCustomerCount(customers.length);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Analitik verileri alınamadı."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId]);

  const days = Number(range) as RangeDays;
  const report = useMemo(() => buildReport(appointments, customerCount, days), [appointments, customerCount, days]);
  if (loading) return <AnalyticsLoading />;

  const period = `Son ${days} gün`;
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
            <h2>Performans görünümü</h2>
            <Pill tone="ok" dot>Canlı</Pill>
          </div>
        </div>
        <Segmented label="Tarih aralığı" options={RANGES} value={range} onChange={setRange} className={css.rangeSeg} />
      </div>

      {error ? <Notice tone="bad" title="Veriler alınamadı">{error}</Notice> : null}

      <div className={studio.stats}>
        <StatTile accent icon={Wallet} label="Dönem geliri" value={currency(report.revenue)} hint={<Delta value={report.revenueChange} note="tamamlanan randevular" />} />
        <StatTile icon={CalendarCheck2} label="Randevu" value={report.total} hint={<Delta value={report.appointmentChange} note={`${report.completed} tamamlandı`} />} />
        <StatTile icon={Gauge} label="Doluluk kalitesi" value={`%${report.completionRate}`} hint={`%${report.noShowRate} gelmedi`} />
        <StatTile icon={UsersRound} label="Müşteri tabanı" value={report.customers} hint="toplam kayıtlı müşteri" />
      </div>

      <div className={css.gridMain}>
        <Panel icon={ChartColumnBig} title="Randevu akışı" description={days === 90 ? "Haftalık randevu sayısı" : "Günlük randevu sayısı"}
          actions={<Pill tone="accent">{report.total} randevu</Pill>}>
          <ColumnChart data={columns} label={`${period} randevu akışı`} labelEvery={labelEvery} />
        </Panel>
        <Panel icon={TrendingUp} title="Gelir eğrisi" description="Tamamlanan randevulardan"
          actions={<Pill tone={report.revenueChange >= 0 ? "ok" : "bad"}>{report.revenueChange >= 0 ? "↑" : "↓"} %{Math.abs(report.revenueChange)}</Pill>}>
          <div className={css.revenueHead}>
            <strong>{currency(report.revenue)}</strong>
            <span>Ortalama işlem {currency(report.averageTicket)}</span>
          </div>
          <AreaChart values={revenueValues} label={`${period} gelir eğrisi`}
            summary={`Toplam ${currency(report.revenue)}. ${revenuePeak && revenuePeak.revenue > 0 ? `En yüksek ${revenuePeak.label}: ${currency(revenuePeak.revenue)}.` : "Henüz tamamlanan randevu geliri yok."}`} />
          <div className={css.areaAxis} aria-hidden>
            <span>{report.buckets[0]?.short}</span>
            <span>{report.buckets[report.buckets.length - 1]?.short}</span>
          </div>
        </Panel>
      </div>

      <div className={css.gridSplit}>
        <Panel icon={CalendarClock} title="Haftanın randevu ritmi" description={`${period}deki gün dağılımı`}
          actions={<Pill tone="accent">Yoğun gün: {report.busiestDay}</Pill>}>
          <ColumnChart data={report.weekdays.map((day) => ({ key: day.label, label: day.label, short: day.label, value: day.value }))} label="Haftanın günlerine göre randevu dağılımı" height={150} />
        </Panel>
        <Panel icon={Layers3} title="Durum dağılımı" description="Operasyon kalitesini izleyin">
          <StackBar data={report.statuses} label="Randevu durum dağılımı" total={report.total} />
        </Panel>
      </div>

      <div className={css.gridSplit}>
        <Panel icon={Sparkles} title="En çok tercih edilen hizmetler" actions={<Pill>{days} gün</Pill>}>
          {report.services.length
            ? <RankBars label="Hizmet sıralaması" data={report.services.map((service) => ({ key: service.name, label: service.name, value: service.count, display: currency(service.revenue), meta: `${service.count} randevu` }))} />
            : <EmptyLine text="Hizmet analizi için tamamlanan randevu bekleniyor." />}
        </Panel>
        <Panel icon={UsersRound} title="Ekip performansı" description="Gerçekleşen ve planlı randevular">
          {report.staff.length
            ? <RankBars label="Ekip sıralaması" data={report.staff.map((member) => ({ key: member.name, label: member.name, value: member.count, display: `${member.count} randevu`, meta: `${currency(member.revenue)} gelir` }))} />
            : <EmptyLine text="Ekip karşılaştırması için randevu verisi bekleniyor." />}
        </Panel>
      </div>

      <Panel icon={Sparkles} title="Akıllı öneriler" description="Verinizden çıkan, hemen uygulayabileceğiniz sıradaki adımlar"
        actions={<Pill tone="accent">{report.insights.length} aksiyon hazır</Pill>}>
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
                <p className={css.insightBenefit}><b>Beklenen fayda:</b> {insight.benefit}</p>
                <Link href={insight.href} className={cx(studio.btn, studio.btnSoft, studio.btnBlock)}>{insight.action}<ArrowRight size={15} aria-hidden /></Link>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Delta({ value, note }: { value: number; note: string }) {
  return <span className={css.delta}><Pill tone={value >= 0 ? "ok" : "bad"}>{value >= 0 ? "↑" : "↓"} %{Math.abs(value)}</Pill><span>{note}</span></span>;
}

function EmptyLine({ text }: { text: string }) {
  return <div className={css.emptyLine}>{text}</div>;
}

function AnalyticsLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Analiz yükleniyor" className={css.stackY}>
      <Sk h={64} r={18} />
      <div className={studio.stats}>{[1, 2, 3, 4].map((i) => <Sk key={i} h={112} r={18} />)}</div>
      <div className={css.gridMain}><Sk h={300} r={26} /><Sk h={300} r={26} /></div>
    </div>
  );
}
