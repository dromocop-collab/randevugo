"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  ArrowRight, BarChart3, Building2, CalendarCheck, Clock4, Compass, Download, File, FileText, Filter, Home, LifeBuoy, LogIn, MapPin,
  Megaphone, Monitor, MousePointerClick, RefreshCw, Route, ShieldCheck, Smartphone, Store, Tablet, Tag, Timer, TrendingDown, TrendingUp,
  UserPlus, UsersRound, type LucideIcon,
} from "lucide-react";
import { getVisitorAnalytics, type FunnelStep, type Journey, type VisitorAnalytics } from "@/features/analytics/visitor-analytics-repository";
import { SOURCE_KIND_LABEL, SourceIcon, sourceName } from "@/components/super-admin/source-icon";
import {
  AdminPage, BarRow, Btn, Card, Chips, EmptyState, HeroStat, PageHeader, Segmented, SkeletonList, StatCard, StatGrid, cx, downloadCsv,
  relativeTime, useNow,
} from "../_pages-ui";
import { CountUp } from "../overview-widgets";
import c from "./analytics.module.css";

type Range = "1" | "7" | "30" | "90";
type JourneyFilter = "all" | "ads" | "social" | "search" | "direct" | "converted";

const PAGE_TYPE: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Ana sayfa", icon: Home }, storefront: { label: "İşletme sayfası", icon: Store }, booking: { label: "Randevu ekranı", icon: CalendarCheck },
  business_signup: { label: "İşletme kaydı", icon: UserPlus }, business_landing: { label: "İşletmeler", icon: Building2 }, pricing: { label: "Fiyatlar", icon: Tag },
  explore: { label: "Keşfet", icon: Compass }, seo: { label: "Şehir / kategori", icon: MapPin }, legal: { label: "Yasal metin", icon: FileText },
  auth: { label: "Giriş / kayıt", icon: LogIn }, app: { label: "Mobil uygulama", icon: Smartphone }, help: { label: "Yardım", icon: LifeBuoy }, other: { label: "Diğer", icon: File },
};
const DEVICE: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  mobile: { label: "Mobil", icon: Smartphone, color: "var(--green-2)" }, desktop: { label: "Masaüstü", icon: Monitor, color: "#5b8def" }, tablet: { label: "Tablet", icon: Tablet, color: "#c9e86a" },
};
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const fmt = (value: number) => value.toLocaleString("tr-TR");

function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) return error.message.replace(/^Firebase:\s*/i, "");
  return error instanceof Error ? error.message : "Veriler alınamadı.";
}

function labelPath(path: string) {
  if (path === "/") return "Ana sayfa";
  try { return decodeURIComponent(path).replace(/^\//, "").replaceAll("-", " ").replaceAll("/", " › "); }
  catch { return path; }
}

function duration(ms: number) {
  if (ms < 60_000) return ms < 5_000 ? "tek sayfa" : `${Math.round(ms / 1000)} sn`;
  const minutes = Math.floor(ms / 60_000);
  return minutes < 60 ? `${minutes} dk` : `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return <span className={cx(c.trend, up ? c.trendUp : c.trendDown)}>{up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}%{Math.abs(value).toLocaleString("tr-TR")}</span>;
}

export default function VisitorAnalyticsPage() {
  const now = useNow(30_000);
  const [range, setRange] = useState<Range>("7");
  const [data, setData] = useState<VisitorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journeyFilter, setJourneyFilter] = useState<JourneyFilter>("all");

  const load = useCallback(async (span: Range, quiet = false) => {
    if (!quiet) setLoading(true);
    try { setData(await getVisitorAnalytics(Number(span))); setError(null); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { if (!quiet) setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(range); }); }, [load, range]);
  // Canlı sayaç ve yolculuklar: sekme görünürken dakikada bir sessizce yenilenir.
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(range, true); }, 60_000);
    return () => window.clearInterval(timer);
  }, [load, range]);

  const journeys = useMemo(() => (data?.journeys ?? []).filter((row) => {
    if (journeyFilter === "all") return true;
    if (journeyFilter === "converted") return row.reachedSignup || row.reachedBooking;
    if (journeyFilter === "direct") return row.sourceKind === "direct" || row.sourceKind === "referral";
    return row.sourceKind === journeyFilter;
  }), [data, journeyFilter]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(`ziyaretci-analitigi-${data.range.since}-${data.range.until}.csv`, [
      ["Gün", "Tekil ziyaretçi", "Görüntüleme", "Oturum", "Yeni ziyaretçi"],
      ...data.series.map((row) => [row.day, String(row.visitors), String(row.views), String(row.sessions), String(row.newVisitors)]),
    ]);
  }

  const totals = data?.totals;
  const returning = totals ? Math.max(0, totals.uniqueVisitors - totals.newVisitors) : 0;

  return (
    <AdminPage>
      <PageHeader eyebrow="Sunucuda sayılır · çerezsiz" icon={BarChart3} title="Ziyaretçi analitiği"
        description="Kim nereden geldi, sitede ne yaptı, nerede bıraktı. Aynı cihaz ve IP tek ziyaretçi sayılır; botlar, otomatik testler ve yöneticiler sayıma girmez."
        meta={<>
          <HeroStat label="şu an sitede" value={data ? <span className={c.heroLive}><i aria-hidden />{fmt(data.live.count)}</span> : "…"} />
          <HeroStat label="tekil ziyaretçi" value={totals ? fmt(totals.uniqueVisitors) : "…"} />
          <HeroStat label="görüntüleme" value={totals ? fmt(totals.views) : "…"} />
        </>}
        actions={<>
          <Segmented label="Tarih aralığı" value={range} onChange={setRange} options={[
            { value: "1", label: "Bugün" }, { value: "7", label: "7 gün" }, { value: "30", label: "30 gün" }, { value: "90", label: "90 gün" },
          ]} />
          <Btn variant="onDark" icon={Download} onClick={exportCsv} disabled={!data}>CSV</Btn>
          <Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load(range)}>Yenile</Btn>
        </>}
      />

      {loading && !data ? <SkeletonList rows={5} height={110} /> : error && !data ? (
        <EmptyState icon={BarChart3} title="Analitik açılamadı" description={`${error} — sunucu fonksiyonları yayınlandı mı?`} />
      ) : data && totals ? (
        <>
          <section className={c.live} aria-label="Canlı ziyaretçiler">
            <div className={c.liveHead}>
              <span className={c.livePulse} aria-hidden><i /></span>
              <b><CountUp value={data.live.count} /> kişi şu an sitede</b>
              <small>son 5 dakikada etkin</small>
            </div>
            {data.live.pages.length ? (
              <div className={c.livePages}>
                {data.live.pages.map((page) => <span key={page.path}><b>{page.count}</b>{labelPath(page.path)}</span>)}
              </div>
            ) : <small className={c.muted}>Şu an sitede kimse yok.</small>}
          </section>

          <StatGrid cols={5}>
            <StatCard icon={UsersRound} label="Tekil ziyaretçi" tone="green" value={<CountUp value={totals.uniqueVisitors} />} hint={<><Trend value={data.change.visitors} /> cihaz + IP başına 1</>} />
            <StatCard icon={MousePointerClick} label="Görüntüleme" tone="blue" value={<CountUp value={totals.views} />} hint={<><Trend value={data.change.views} /> aynı sayfa 30 dk’da 1</>} />
            <StatCard icon={Route} label="Oturum" value={<CountUp value={totals.sessions} />} hint={<><Trend value={data.change.sessions} /> 30 dk ara = yeni oturum</>} />
            <StatCard icon={UserPlus} label="Yeni ziyaretçi" tone="violet" value={<CountUp value={totals.newVisitors} />} hint={`${fmt(returning)} geri dönen`} />
            <StatCard icon={Timer} label="Sayfa / oturum" value={totals.pagesPerSession == null ? "—" : <CountUp value={totals.pagesPerSession} format={(v) => v.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} />} hint="ilgi derinliği" />
          </StatGrid>

          <Card title="Ziyaret ritmi" icon={BarChart3} description={`${data.range.since} – ${data.range.until} · tekil ziyaretçi ve görüntüleme`}>
            <TrendChart key={`${data.range.since}-${data.range.until}`} series={data.series} />
          </Card>

          <div className={c.grid3}>
            <Card title="Nereden geliyorlar?" icon={Compass} description="Oturumu başlatan kaynak">
              <SourceList data={data} />
            </Card>
            <Card title="Cihaz" icon={Smartphone} description="Günlük tekil ziyaretçilere göre">
              <DeviceDonut devices={data.devices} />
              <div className={c.miniLists}>
                <MiniList title="Tarayıcı" rows={data.browsers} />
                <MiniList title="İşletim sistemi" rows={data.os} />
              </div>
            </Card>
            <Card title="Dönüşüm hunileri" icon={Filter} description="Adım adım kaç kişi ilerledi">
              <Funnel title="İşletme kazanımı" steps={data.funnels.business} />
              <Funnel title="Meta reklamından" steps={data.funnels.ads} icon={Megaphone} />
              <Funnel title="Müşteri randevusu" steps={data.funnels.booking} />
            </Card>
          </div>

          <Card title="Ziyaretçi yolculukları" icon={Route} description="Son ziyaretler: kim nereden geldi, hangi sayfalarda gezdi (kişisel veri yok, kimlik kısaltılmış özet)">
            <Chips label="Yolculuk filtresi" value={journeyFilter} onChange={setJourneyFilter} options={[
              { value: "all", label: "Tümü", count: data.journeys.length },
              { value: "ads", label: "Reklam", count: data.journeys.filter((row) => row.sourceKind === "ads").length },
              { value: "social", label: "Sosyal", count: data.journeys.filter((row) => row.sourceKind === "social").length },
              { value: "search", label: "Arama", count: data.journeys.filter((row) => row.sourceKind === "search").length },
              { value: "direct", label: "Doğrudan / site", count: data.journeys.filter((row) => row.sourceKind === "direct" || row.sourceKind === "referral").length },
              { value: "converted", label: "Kayıt / randevuya ulaşan", count: data.journeys.filter((row) => row.reachedSignup || row.reachedBooking).length },
            ]} />
            {journeys.length === 0 ? <EmptyState icon={Route} title="Bu filtrede yolculuk yok" description="Yeni ziyaretler geldikçe burada görünür." /> : (
              <ol className={c.journeys}>
                {journeys.map((journey, index) => <JourneyRow key={journey.session} journey={journey} now={now} index={index} />)}
              </ol>
            )}
          </Card>

          <div className={c.grid2}>
            <Card title="En çok görüntülenen sayfalar" icon={FileText}>
              {data.pages.length ? <div className={c.bars}>{data.pages.map((row) => <BarRow key={row.key} label={labelPath(row.key)} value={row.value} total={totals.views} />)}</div>
                : <EmptyState icon={FileText} title="Henüz veri yok" />}
            </Card>
            <Card title="Giriş sayfaları" icon={ArrowRight} description="Oturumun başladığı ilk sayfa">
              {data.entries.length ? <div className={c.bars}>{data.entries.map((row) => <BarRow key={row.key} label={labelPath(row.key)} value={row.value} total={totals.sessions} />)}</div>
                : <EmptyState icon={ArrowRight} title="Henüz veri yok" />}
            </Card>
          </div>

          <Card title="Saatlik yoğunluk" icon={Clock4} description="Haftanın günü × saat (İstanbul) · görüntüleme">
            <Heatmap matrix={data.heatmap} />
          </Card>

          <p className={c.trust}>
            <ShieldCheck size={14} aria-hidden />
            Bu aralıkta <b>{fmt(totals.excluded)}</b> bot, otomatik test ve yönetici görüntülemesi ayıklandı. IP adresleri saklanmaz; ziyaretçi kimliği geri çözülemeyen bir özettir.
            Dil: TR {fmt(data.langs.tr ?? 0)} · EN {fmt(data.langs.en ?? 0)}.
          </p>
        </>
      ) : null}
    </AdminPage>
  );
}

function TrendChart({ series }: { series: VisitorAnalytics["series"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const width = 760; const height = 220; const pad = { l: 34, r: 10, t: 12, b: 26 };
  const max = Math.max(4, ...series.map((row) => row.views));
  const x = (i: number) => pad.l + (series.length <= 1 ? (width - pad.l - pad.r) / 2 : (i / (series.length - 1)) * (width - pad.l - pad.r));
  const y = (value: number) => pad.t + (1 - value / max) * (height - pad.t - pad.b);
  const line = (key: "views" | "visitors") => series.map((row, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(row[key]).toFixed(1)}`).join(" ");
  const area = (key: "views" | "visitors") => `${line(key)} L${x(series.length - 1).toFixed(1)},${height - pad.b} L${x(0).toFixed(1)},${height - pad.b} Z`;
  const ticks = [0, 0.5, 1].map((part) => Math.round(max * part));
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relative = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((relative - pad.l) / (width - pad.l - pad.r)) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, index)));
  }

  const active = hover !== null ? series[hover] : null;
  return (
    <div className={c.chartWrap}>
      <div className={c.legend}><span><i style={{ background: "var(--green-2)" }} />Tekil ziyaretçi</span><span><i style={{ background: "#5b8def" }} />Görüntüleme</span></div>
      <svg ref={ref} className={c.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Günlük ziyaretçi ve görüntüleme grafiği"
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((tick) => (
          <g key={tick}><line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} className={c.grid} /><text x={pad.l - 6} y={y(tick) + 3} className={c.axis} textAnchor="end">{tick}</text></g>
        ))}
        <path d={area("views")} className={c.areaViews} />
        <path d={area("visitors")} className={c.areaVisitors} />
        <path d={line("views")} className={c.lineViews} pathLength={1} />
        <path d={line("visitors")} className={c.lineVisitors} pathLength={1} />
        {series.map((row, i) => i % labelEvery === 0 || i === series.length - 1 ? (
          <text key={row.day} x={x(i)} y={height - 8} className={c.axis} textAnchor={i === series.length - 1 ? "end" : i === 0 ? "start" : "middle"}>{row.day.slice(8, 10)}.{row.day.slice(5, 7)}</text>
        ) : null)}
        {active && hover !== null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} className={c.cursor} />
            <circle cx={x(hover)} cy={y(active.views)} r={4} fill="#5b8def" />
            <circle cx={x(hover)} cy={y(active.visitors)} r={4} fill="var(--green-2)" />
          </g>
        ) : null}
      </svg>
      {active ? (
        <div className={c.tooltip} style={{ left: `${(x(hover!) / width) * 100}%` }}>
          <b>{new Date(`${active.day}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" })}</b>
          <span>{fmt(active.visitors)} ziyaretçi · {fmt(active.views)} görüntüleme</span>
          <span>{fmt(active.sessions)} oturum · {fmt(active.newVisitors)} yeni</span>
        </div>
      ) : null}
    </div>
  );
}

function SourceList({ data }: { data: VisitorAnalytics }) {
  const total = Object.values(data.sourceKinds).reduce((sum, value) => sum + value, 0);
  const kinds = Object.entries(data.sourceKinds).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  if (!total) return <EmptyState icon={Compass} title="Henüz veri yok" />;
  // Sunucu kaynağı "tür|etiket" olarak tutar (ör. "social|Instagram", "ads|meta").
  const split = (key: string) => { const at = key.indexOf("|"); return at > 0 ? { kind: key.slice(0, at), label: key.slice(at + 1) } : { kind: "referral", label: key }; };
  return (
    <>
      <div className={c.stack} role="img" aria-label="Kaynak türü dağılımı">
        {kinds.map(([kind, value]) => <i key={kind} className={c[`kind-${kind}`]} style={{ flexGrow: value }} title={`${SOURCE_KIND_LABEL[kind] ?? kind}: ${value}`} />)}
      </div>
      <div className={c.stackLegend}>{kinds.map(([kind, value]) => <span key={kind}><i className={c[`kind-${kind}`]} />{SOURCE_KIND_LABEL[kind] ?? kind} %{Math.round((value / total) * 100)}</span>)}</div>
      <ul className={c.sources}>
        {data.sources.map((row) => {
          const { kind, label } = split(row.key);
          const share = (row.value / total) * 100;
          return (
            <li key={row.key}>
              <SourceIcon kind={kind} label={label} size={26} />
              <span className={c.sourceText}><b>{sourceName(kind, label)}</b><i className={c.sourceTrack}><i style={{ width: `${Math.max(2, share)}%` }} /></i></span>
              <b className={c.sourceValue}>{fmt(row.value)}</b>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DeviceDonut({ devices }: { devices: Record<string, number> }) {
  const total = Object.values(devices).reduce((sum, value) => sum + value, 0);
  const radius = 42; const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className={c.donutWrap}>
      <svg viewBox="0 0 110 110" className={c.donut} role="img" aria-label="Cihaz dağılımı">
        <circle cx="55" cy="55" r={radius} className={c.donutTrack} />
        {(["mobile", "desktop", "tablet"] as const).map((key) => {
          const value = devices[key] ?? 0;
          if (!total || !value) return null;
          const length = (value / total) * circumference;
          const element = <circle key={key} cx="55" cy="55" r={radius} fill="none" stroke={DEVICE[key].color} strokeWidth="13"
            strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 55 55)" className={c.donutSeg} />;
          offset += length;
          return element;
        })}
        <text x="55" y="53" textAnchor="middle" className={c.donutValue}>{fmt(total)}</text>
        <text x="55" y="67" textAnchor="middle" className={c.donutLabel}>ziyaretçi</text>
      </svg>
      <ul className={c.donutLegend}>
        {(["mobile", "desktop", "tablet"] as const).map((key) => {
          const Icon = DEVICE[key].icon;
          return <li key={key}><Icon size={14} aria-hidden style={{ color: DEVICE[key].color }} /><span>{DEVICE[key].label}</span><b>%{total ? Math.round(((devices[key] ?? 0) / total) * 100) : 0}</b></li>;
        })}
      </ul>
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: Array<{ key: string; value: number }> }) {
  return (
    <div className={c.mini}>
      <small>{title}</small>
      {rows.length ? rows.slice(0, 4).map((row) => <span key={row.key}><em>{row.key}</em><b>{fmt(row.value)}</b></span>) : <span className={c.muted}>—</span>}
    </div>
  );
}

function Funnel({ title, steps, icon: Icon = Filter }: { title: string; steps: FunnelStep[]; icon?: LucideIcon }) {
  const first = steps[0]?.value ?? 0;
  return (
    <div className={c.funnel}>
      <b className={c.funnelTitle}><Icon size={13} aria-hidden /> {title}</b>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1]!.value : null;
        const rate = step.value != null && previous ? Math.round((step.value / previous) * 1000) / 10 : null;
        const width = step.value != null && first ? Math.max(3, (step.value / first) * 100) : 0;
        return (
          <div key={step.key} className={c.funnelStep}>
            <span className={c.funnelLabel}>{step.label}{rate != null ? <em>%{rate.toLocaleString("tr-TR")}</em> : null}</span>
            <span className={c.funnelBar}><i style={{ width: `${width}%`, animationDelay: `${index * 120}ms` }} /></span>
            <b>{step.value == null ? "—" : fmt(step.value)}</b>
          </div>
        );
      })}
    </div>
  );
}

function JourneyRow({ journey, now, index }: { journey: Journey; now: number; index: number }) {
  const DeviceIcon = DEVICE[journey.device]?.icon ?? Monitor;
  return (
    <li className={c.journey} style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <div className={c.journeyHead}>
        <SourceIcon kind={journey.sourceKind} label={journey.sourceLabel} size={34} />
        <span className={c.journeyWho}>
          <b>{sourceName(journey.sourceKind, journey.sourceLabel)} <small>· {SOURCE_KIND_LABEL[journey.sourceKind] ?? journey.sourceKind}</small></b>
          <span><DeviceIcon size={12} aria-hidden /> {DEVICE[journey.device]?.label ?? journey.device} · {journey.browser} · {journey.os}{journey.lang === "en" ? " · EN" : ""} · ziyaretçi #{journey.visitor}</span>
        </span>
        <span className={c.journeyMeta}>
          {journey.newVisitor ? <em className={c.badgeNew}>yeni</em> : <em className={c.badgeBack}>geri döndü</em>}
          <small>{relativeTime(journey.lastAt, now)} · {duration(journey.durationMs)}</small>
        </span>
      </div>
      <div className={c.steps}>
        {journey.steps.map((step, i) => {
          const meta = PAGE_TYPE[step.pageType] ?? PAGE_TYPE.other!;
          const Icon = meta.icon;
          const goal = step.pageType === "business_signup" || step.pageType === "booking";
          return (
            <span key={`${step.at}-${i}`} className={c.stepWrap}>
              {i > 0 ? <ArrowRight size={12} className={c.stepArrow} aria-hidden /> : null}
              <span className={cx(c.step, goal && c.stepGoal)} title={`${step.path} · ${new Date(step.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`}>
                <Icon size={12} aria-hidden /> {step.pageType === "storefront" || step.pageType === "booking" || step.pageType === "seo" ? labelPath(step.path) : meta.label}
              </span>
            </span>
          );
        })}
      </div>
      {journey.reachedSignup || journey.reachedBooking ? (
        <div className={c.reached}>
          {journey.reachedSignup ? <span><UserPlus size={12} aria-hidden /> İşletme kayıt sayfasına ulaştı</span> : null}
          {journey.reachedBooking ? <span><CalendarCheck size={12} aria-hidden /> Randevu ekranına ulaştı</span> : null}
        </div>
      ) : null}
    </li>
  );
}

function Heatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());
  const busiest = matrix.flatMap((row, day) => row.map((value, hour) => ({ day, hour, value }))).sort((a, b) => b.value - a.value)[0];
  return (
    <>
      <div className={c.heat} role="img" aria-label="Haftanın günü ve saate göre yoğunluk">
        <span />
        {Array.from({ length: 24 }, (_, hour) => <small key={hour} className={c.heatHour}>{hour % 3 === 0 ? hour : ""}</small>)}
        {matrix.map((row, day) => (
          <div key={day} className={c.heatRow}>
            <small>{WEEKDAYS[day]}</small>
            {row.map((value, hour) => (
              <i key={hour} title={`${WEEKDAYS[day]} ${String(hour).padStart(2, "0")}:00 · ${value} görüntüleme`}
                style={{ opacity: value ? 0.18 + (value / max) * 0.82 : 0.06, animationDelay: `${(day * 24 + hour) * 4}ms` }} />
            ))}
          </div>
        ))}
      </div>
      {busiest && busiest.value ? <p className={c.muted}>En yoğun zaman: <b>{WEEKDAYS[busiest.day]} {String(busiest.hour).padStart(2, "0")}:00–{String(busiest.hour + 1).padStart(2, "0")}:00</b></p> : null}
    </>
  );
}
