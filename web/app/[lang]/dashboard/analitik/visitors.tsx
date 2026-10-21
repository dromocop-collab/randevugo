"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarCheck, Eye, Filter, Monitor, MousePointerClick, Route, ShieldCheck, Smartphone, Store, Tablet, TrendingDown, TrendingUp, UsersRound, type LucideIcon } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { getBusinessVisitorAnalytics, type BusinessVisitorAnalytics } from "@/features/analytics/business-visitor-repository";
import type { Journey } from "@/features/analytics/visitor-analytics-repository";
import { SOURCE_KIND_LABEL, SourceIcon, sourceName } from "@/components/super-admin/source-icon";
import { EmptyState, Panel, Segmented, Sk, StatTile, cx, studio } from "@/app/[lang]/dashboard/_studio";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import v from "./visitors.module.css";

// Mağaza ve randevu sayfalarının ziyaretçileri (sunucuda sayılır: cihaz + IP başına 1, işletme ekibi ve botlar hariç).

const RANGES = [
  { value: "1", label: tk("Bugün") }, { value: "7", label: tk("7 gün") }, { value: "30", label: tk("30 gün") }, { value: "90", label: tk("90 gün") },
] as const;
type Range = (typeof RANGES)[number]["value"];

const DEVICE: Record<string, { label: string; icon: LucideIcon }> = {
  mobile: { label: tk("Mobil"), icon: Smartphone }, desktop: { label: tk("Masaüstü"), icon: Monitor }, tablet: { label: tk("Tablet"), icon: Tablet },
};
const WEEKDAYS = [tk("Pzt"), tk("Sal"), tk("Çar"), tk("Per"), tk("Cum"), tk("Cmt"), tk("Paz")];
const FUNNEL_LABEL: Record<string, string> = {
  storefront: tk("Mağaza sayfasını gördü"), booking: tk("Randevu ekranını açtı"), appointment: tk("Online randevu aldı"),
};

function useCount(value: number) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { queueMicrotask(() => setShown(value)); from.current = value; return; }
    const start = performance.now(); const origin = from.current; let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 800);
      setShown(Math.round(origin + (value - origin) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick); else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    // Sekme arka plandayken requestAnimationFrame çalışmaz; süre dolunca son değer yine de gösterilir.
    const fallback = window.setTimeout(() => { cancelAnimationFrame(frame); setShown(value); from.current = value; }, 950);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(fallback); };
  }, [value]);
  return shown;
}

function Count({ value, intl }: { value: number; intl: string }) {
  return <>{useCount(value).toLocaleString(intl)}</>;
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return <span className={cx(v.change, up ? v.up : v.down)}>{up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}%{Math.abs(value)}</span>;
}

export function StorefrontVisitors() {
  const t = useT();
  const intl = useIntlLocale();
  const { businessId } = useBusinessContext();
  const [range, setRange] = useState<Range>("7");
  const [data, setData] = useState<BusinessVisitorAnalytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    const load = (quiet: boolean) => {
      if (!quiet) { setLoading(true); setError(""); }
      getBusinessVisitorAnalytics(businessId, Number(range))
        .then((value) => { if (active) setData(value); })
        .catch((reason: unknown) => { if (active && !quiet) setError(reason instanceof Error ? reason.message : t("Ziyaretçi verileri alınamadı.")); })
        .finally(() => { if (active && !quiet) setLoading(false); });
    };
    queueMicrotask(() => load(false));
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(true); }, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [businessId, range, t]);

  const fmt = (value: number) => value.toLocaleString(intl);

  if (loading && !data) {
    return <div className={v.stack}><div className={v.stats}>{Array.from({ length: 4 }, (_, i) => <Sk key={i} h={110} r={20} />)}</div><Sk h={260} r={22} /></div>;
  }
  if (error && !data) return <EmptyState title={t("Ziyaretçi verileri alınamadı.")} description={error} mood="thinking" />;
  if (!data) return null;
  const totals = data.totals;
  const empty = totals.views === 0;

  return (
    <div className={cx(v.stack, studio.fadeIn)}>
      <div className={v.toolbar}>
        <div className={v.live} role="status">
          <span className={v.pulse} aria-hidden><i /></span>
          <b>{t("{count} kişi şu an mağazanızda", { count: data.live.count })}</b>
          {data.live.booking ? <small>{t("{count} kişi randevu ekranında", { count: data.live.booking })}</small> : null}
        </div>
        <Segmented label={t("Tarih aralığı")} options={RANGES.map((item) => ({ ...item, label: t(item.label) }))} value={range} onChange={setRange} />
      </div>

      <div className={v.stats}>
        <StatTile icon={UsersRound} accent label={t("Tekil ziyaretçi")} value={<Count value={totals.visitors} intl={intl} />} hint={<><Change value={data.change.visitors} /> {t("cihaz + IP başına 1")}</>} />
        <StatTile icon={Eye} label={t("Görüntüleme")} value={<Count value={totals.views} intl={intl} />} hint={<><Change value={data.change.views} /> {t("aynı sayfa 30 dk’da 1")}</>} />
        <StatTile icon={MousePointerClick} label={t("Randevu ekranını açan")} value={<Count value={totals.bookingVisitors} intl={intl} />}
          hint={totals.storefrontVisitors ? t("ziyaretçilerin %{rate}'i", { rate: Math.round((totals.bookingVisitors / Math.max(1, totals.visitors)) * 100) }) : "—"} />
        <StatTile icon={CalendarCheck} label={t("Online randevu")} value={totals.onlineAppointments == null ? "—" : <Count value={totals.onlineAppointments} intl={intl} />}
          hint={totals.onlineAppointments && totals.visitors ? t("dönüşüm %{rate}", { rate: Math.round((totals.onlineAppointments / totals.visitors) * 1000) / 10 }) : t("bu aralıkta")} />
      </div>

      {empty ? (
        <EmptyState title={t("Henüz ziyaret yok")} description={t("Mağaza bağlantınızı Instagram biyografinize, WhatsApp durumunuza ve Google profilinize ekleyin; gelen her ziyaret burada görünür.")} mood="wave" />
      ) : (
        <>
          <Panel title={t("Ziyaret ritmi")} description={t("Tekil ziyaretçi ve görüntüleme")} icon={TrendingUp}>
            <Chart series={data.series} intl={intl} />
          </Panel>

          <div className={v.grid}>
            <Panel title={t("Müşteriler nereden geliyor?")} description={t("Ziyareti başlatan kaynak")} icon={Store}>
              <Sources data={data} fmt={fmt} />
            </Panel>
            <Panel title={t("Randevu hunisi")} description={t("Mağazadan randevuya kaç kişi ilerledi")} icon={Filter}>
              <div className={v.funnel}>
                {data.funnel.map((step, index) => {
                  const first = data.funnel[0]?.value ?? 0;
                  const prev = index ? data.funnel[index - 1]!.value : null;
                  const rate = step.value != null && prev ? Math.round((step.value / prev) * 1000) / 10 : null;
                  return (
                    <div key={step.key} className={v.funnelStep}>
                      <span>{t(FUNNEL_LABEL[step.key] ?? step.label)}{rate != null ? <em>%{rate}</em> : null}</span>
                      <i><i style={{ width: `${step.value != null && first ? Math.max(3, (step.value / first) * 100) : 0}%`, animationDelay: `${index * 120}ms` }} /></i>
                      <b>{step.value == null ? "—" : fmt(step.value)}</b>
                    </div>
                  );
                })}
              </div>
              <Devices devices={data.devices} fmt={fmt} />
            </Panel>
          </div>

          <Panel title={t("Ziyaretçi yolculukları")} description={t("Son ziyaretler: nereden geldi, mağazanızda neye baktı")} icon={Route}>
            {data.journeys.length ? (
              <ol className={v.journeys}>{data.journeys.map((journey, index) => <JourneyCard key={journey.session} journey={journey} index={index} />)}</ol>
            ) : <p className={v.muted}>{t("Henüz yolculuk yok.")}</p>}
          </Panel>

          <Panel title={t("En yoğun saatler")} description={t("Haftanın günü × saat · mağaza görüntülemesi")} icon={Eye}>
            <Heat matrix={data.heatmap} />
          </Panel>
        </>
      )}
      <p className={v.trust}><ShieldCheck size={14} aria-hidden /> {t("Sizin ve ekibinizin ziyaretleri, botlar ve otomatik testler sayılmaz. Ziyaretçilerin IP adresi saklanmaz, kişisel veri gösterilmez.")}</p>
    </div>
  );
}

function Chart({ series, intl }: { series: BusinessVisitorAnalytics["series"]; intl: string }) {
  const t = useT();
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const width = 640; const height = 190; const pad = { l: 30, r: 8, t: 10, b: 24 };
  const max = Math.max(3, ...series.map((row) => row.views));
  const x = (i: number) => pad.l + (series.length <= 1 ? (width - pad.l - pad.r) / 2 : (i / (series.length - 1)) * (width - pad.l - pad.r));
  const y = (value: number) => pad.t + (1 - value / max) * (height - pad.t - pad.b);
  const path = (key: "views" | "visitors") => series.map((row, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(row[key]).toFixed(1)}`).join(" ");
  const area = (key: "views" | "visitors") => `${path(key)} L${x(series.length - 1)},${height - pad.b} L${x(0)},${height - pad.b} Z`;
  const every = Math.max(1, Math.ceil(series.length / 7));
  const active = hover !== null ? series[hover] : null;
  return (
    <div className={v.chartWrap}>
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} className={v.chart} role="img" aria-label={t("Günlük ziyaretçi grafiği")}
        onPointerMove={(event) => {
          const rect = ref.current?.getBoundingClientRect(); if (!rect) return;
          const rel = ((event.clientX - rect.left) / rect.width) * width;
          setHover(Math.max(0, Math.min(series.length - 1, Math.round(((rel - pad.l) / (width - pad.l - pad.r)) * (series.length - 1)))));
        }} onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((part) => <g key={part}><line x1={pad.l} x2={width - pad.r} y1={y(max * part)} y2={y(max * part)} className={v.gridLine} /><text x={pad.l - 5} y={y(max * part) + 3} textAnchor="end" className={v.axis}>{Math.round(max * part)}</text></g>)}
        <path d={area("views")} className={v.areaA} />
        <path d={area("visitors")} className={v.areaB} />
        <path d={path("views")} className={v.lineA} pathLength={1} />
        <path d={path("visitors")} className={v.lineB} pathLength={1} />
        {series.map((row, i) => i % every === 0 || i === series.length - 1 ? <text key={row.day} x={x(i)} y={height - 6} textAnchor={i === series.length - 1 ? "end" : i === 0 ? "start" : "middle"} className={v.axis}>{row.day.slice(8, 10)}.{row.day.slice(5, 7)}</text> : null)}
        {active && hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} className={v.cursor} /> : null}
      </svg>
      {active ? (
        <div className={v.tip} style={{ left: `${(x(hover!) / width) * 100}%` }}>
          <b>{new Date(`${active.day}T12:00:00`).toLocaleDateString(intl, { day: "numeric", month: "long", weekday: "short" })}</b>
          <span>{t("{visitors} ziyaretçi · {views} görüntüleme", { visitors: active.visitors, views: active.views })}</span>
        </div>
      ) : null}
      <div className={v.legend}><span><i className={v.dotB} />{t("Tekil ziyaretçi")}</span><span><i className={v.dotA} />{t("Görüntüleme")}</span></div>
    </div>
  );
}

function splitSource(key: string) {
  const at = key.indexOf("|");
  return at > 0 ? { kind: key.slice(0, at), label: key.slice(at + 1) } : { kind: "referral", label: key };
}

function Sources({ data, fmt }: { data: BusinessVisitorAnalytics; fmt: (value: number) => string }) {
  const t = useT();
  const total = Object.values(data.sourceKinds).reduce((sum, value) => sum + value, 0);
  if (!total) return <p className={v.muted}>{t("Henüz veri yok.")}</p>;
  return (
    <ul className={v.sources}>
      {data.sources.map((row) => {
        const { kind, label } = splitSource(row.key);
        return (
          <li key={row.key}>
            <SourceIcon kind={kind} label={label} size={28} />
            <span className={v.sourceText}>
              <b>{t(sourceName(kind, label))} <small>{t(SOURCE_KIND_LABEL[kind] ?? kind)}</small></b>
              <i><i style={{ width: `${Math.max(3, (row.value / total) * 100)}%` }} /></i>
            </span>
            <b>{fmt(row.value)}</b>
          </li>
        );
      })}
    </ul>
  );
}

function Devices({ devices, fmt }: { devices: Record<string, number>; fmt: (value: number) => string }) {
  const t = useT();
  const total = Object.values(devices).reduce((sum, value) => sum + value, 0);
  if (!total) return null;
  return (
    <div className={v.devices}>
      {(["mobile", "desktop", "tablet"] as const).map((key) => {
        const Icon = DEVICE[key]!.icon;
        return <span key={key}><Icon size={14} aria-hidden /> {t(DEVICE[key]!.label)} <b>%{Math.round(((devices[key] ?? 0) / total) * 100)}</b> <small>{fmt(devices[key] ?? 0)}</small></span>;
      })}
    </div>
  );
}

function JourneyCard({ journey, index }: { journey: Journey; index: number }) {
  const t = useT();
  const intl = useIntlLocale();
  const DeviceIcon = DEVICE[journey.device]?.icon ?? Monitor;
  const when = new Date(journey.lastAt).toLocaleString(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <li className={v.journey} style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
      <SourceIcon kind={journey.sourceKind} label={journey.sourceLabel} size={34} />
      <div className={v.journeyBody}>
        <div className={v.journeyHead}>
          <b>{t(sourceName(journey.sourceKind, journey.sourceLabel))}</b>
          <small><DeviceIcon size={12} aria-hidden /> {t(DEVICE[journey.device]?.label ?? journey.device)} · {when}</small>
          {journey.newVisitor ? <em className={v.new}>{t("yeni")}</em> : <em className={v.back}>{t("geri döndü")}</em>}
        </div>
        <div className={v.steps}>
          {journey.steps.map((step, i) => (
            <span key={`${step.at}-${i}`} className={v.stepWrap}>
              {i ? <ArrowRight size={12} aria-hidden className={v.arrow} /> : null}
              <span className={cx(v.step, step.pageType === "booking" && v.goal)}>
                {step.pageType === "booking" ? <CalendarCheck size={12} aria-hidden /> : <Store size={12} aria-hidden />}
                {step.pageType === "booking" ? t("Randevu ekranı") : t("Mağaza sayfası")}
              </span>
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

function Heat({ matrix }: { matrix: number[][] }) {
  const t = useT();
  const max = useMemo(() => Math.max(1, ...matrix.flat()), [matrix]);
  return (
    <div className={v.heat}>
      <span />
      {Array.from({ length: 24 }, (_, hour) => <small key={hour}>{hour % 3 === 0 ? hour : ""}</small>)}
      {matrix.map((row, day) => [
        <small key={`d${day}`} className={v.heatDay}>{t(WEEKDAYS[day]!)}</small>,
        ...row.map((value, hour) => <i key={`${day}-${hour}`} title={`${t(WEEKDAYS[day]!)} ${String(hour).padStart(2, "0")}:00 · ${value}`} style={{ opacity: value ? 0.2 + (value / max) * 0.8 : 0.07, animationDelay: `${(day * 24 + hour) * 3}ms` }} />),
      ])}
    </div>
  );
}
