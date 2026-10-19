"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Clock4, Download, ExternalLink, Eye, MonitorSmartphone, MousePointerClick, RefreshCw, Search, TrendingDown, TrendingUp, UsersRound } from "lucide-react";
import { listRecentPageViews, type PlatformPageView } from "@/features/analytics/platform-analytics-repository";
import {
  AdminPage, BarRow, Btn, Card, EmptyState, HeroStat, PageHeader, Segmented, SkeletonList, StatCard, StatGrid, downloadCsv, ui,
} from "../_pages-ui";
import c from "./analytics.module.css";

const DAY = 86_400_000;
type Range = "7" | "30";

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate();
  return null;
}

function labelPath(path: string) {
  if (path === "/") return "Ana sayfa";
  try { return decodeURIComponent(path).replace(/^\//, "").replaceAll("-", " ").replaceAll("/", " › "); }
  catch { return path; }
}

const DEVICE_LABEL: Record<string, string> = { mobile: "Mobil", tablet: "Tablet", desktop: "Masaüstü" };
const DEVICE_COLOR: Record<string, string> = { mobile: "var(--green-2)", tablet: "#d7ff70", desktop: "#5b8def" };

export default function PlatformAnalyticsPage() {
  const [events, setEvents] = useState<PlatformPageView[]>([]);
  const [rangeKey, setRangeKey] = useState<Range>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportTime, setReportTime] = useState(() => Date.now());
  const range = Number(rangeKey) as 7 | 30;

  const load = useCallback(async () => {
    setLoading(true);
    try { setEvents(await listRecentPageViews()); setError(""); setReportTime(Date.now()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Ziyaretçi verileri alınamadı."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const report = useMemo(() => {
    const now = reportTime;
    const filtered = events.filter((event) => (asDate(event.createdAt)?.getTime() ?? 0) >= now - range * DAY);
    const previous = events.filter((event) => { const time = asDate(event.createdAt)?.getTime() ?? 0; return time >= now - range * 2 * DAY && time < now - range * DAY; });
    const sessions = new Set(filtered.map((event) => event.sessionId));
    const previousSessions = new Set(previous.map((event) => event.sessionId));
    const change = previousSessions.size ? Math.round((sessions.size - previousSessions.size) / previousSessions.size * 100) : sessions.size ? 100 : 0;
    const viewChange = previous.length ? Math.round((filtered.length - previous.length) / previous.length * 100) : filtered.length ? 100 : 0;
    const countBy = (key: "path" | "referrer" | "device") => {
      const map = new Map<string, number>(); filtered.forEach((event) => map.set(String(event[key] || "Bilinmiyor"), (map.get(String(event[key] || "Bilinmiyor")) ?? 0) + 1));
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    const dayCount = range;
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(now - (dayCount - 1 - index) * DAY); const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }), weekday: date.toLocaleDateString("tr-TR", { weekday: "short" }), value: 0 };
    });
    const dayIndex = new Map(days.map((day, index) => [day.key, index]));
    const hours = Array.from({ length: 24 }, () => 0);
    filtered.forEach((event) => {
      const date = asDate(event.createdAt);
      if (!date) return;
      const index = dayIndex.get(date.toISOString().slice(0, 10));
      if (index !== undefined) days[index].value += 1;
      hours[date.getHours()] += 1;
    });
    return { filtered, sessions: sessions.size, change, viewChange, pages: countBy("path"), sources: countBy("referrer"), devices: countBy("device"), days, hours };
  }, [events, range, reportTime]);

  function exportCsv() {
    downloadCsv(`ziyaretci-analitigi-${range}-gun.csv`, [
      ["Tarih", "Sayfa", "Kaynak", "Cihaz", "Oturum"],
      ...report.filtered.map((event) => [asDate(event.createdAt)?.toLocaleString("tr-TR") ?? "", String(event.path), String(event.referrer), String(event.device), String(event.sessionId)]),
    ]);
  }

  const mobileShare = report.filtered.length ? Math.round((report.devices.find(([key]) => key === "mobile")?.[1] ?? 0) / report.filtered.length * 100) : 0;
  const perSession = report.sessions ? Number((report.filtered.length / report.sessions).toFixed(1)) : 0;
  const peakHour = report.hours.reduce((best, value, hour) => value > report.hours[best] ? hour : best, 0);
  const empty = !loading && report.filtered.length === 0;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Trafik komuta merkezi"
        icon={BarChart3}
        title="Kullanıcılar sizi nasıl buluyor?"
        description="Ziyaret, tekil oturum, popüler sayfa, cihaz ve yönlendiren kaynakları kişisel veri toplamadan izleyin."
        meta={<><HeroStat label="olay işlendi" value={Math.min(events.length, 2500).toLocaleString("tr-TR")} /><HeroStat label="gün" value={range} /></>}
        actions={<>
          <Btn variant="onDark" icon={Download} disabled={!report.filtered.length} onClick={exportCsv}>CSV</Btn>
          <Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load()}>Yenile</Btn>
        </>}
      />

      <div className={c.rangeRow}>
        <Segmented label="Zaman aralığı" value={rangeKey} onChange={setRangeKey} options={[{ value: "7", label: "Son 7 gün" }, { value: "30", label: "Son 30 gün" }]} />
        <span className={ui.faint} style={{ fontSize: 12 }}>Önceki {range} günle karşılaştırılır</span>
      </div>

      {error && <div className={ui.notice}>{error} Firestore kurallarının yayınlandığını kontrol edin.</div>}

      <StatGrid>
        <StatCard label="Sayfa görüntüleme" value={report.filtered.length.toLocaleString("tr-TR")} hint={<Trend value={report.viewChange} />} icon={Eye} tone="green" />
        <StatCard label="Tekil oturum" value={report.sessions.toLocaleString("tr-TR")} hint={<Trend value={report.change} />} icon={UsersRound} tone="lime" />
        <StatCard label="Oturum başı sayfa" value={perSession.toLocaleString("tr-TR")} hint="etkileşim derinliği" icon={MousePointerClick} tone="blue" />
        <StatCard label="Mobil payı" value={`%${mobileShare}`} hint="mobil ziyaret oranı" icon={MonitorSmartphone} tone="violet" />
      </StatGrid>

      {loading && events.length === 0 ? <SkeletonList rows={3} height={200} /> : empty ? (
        <div className={ui.card}><EmptyState icon={BarChart3} title="Bu aralıkta ziyaret yok" description="Yeni ziyaret verileri geldikçe grafikler burada oluşacak." /></div>
      ) : <>
        <div className={c.grid}>
          <Card title="Ziyaret ritmi" description="Günlük sayfa görüntülemeleri" icon={BarChart3}>
            <DayChart days={report.days} />
          </Card>
          <Card title="Cihaz dağılımı" description="Görüntülemelerin cihaz türüne göre payı" icon={MonitorSmartphone}>
            <Donut rows={report.devices} total={report.filtered.length} />
          </Card>
        </div>

        <Card title="Saatlik yoğunluk" description={`En yoğun saat ${String(peakHour).padStart(2, "0")}:00 – ${String((peakHour + 1) % 24).padStart(2, "0")}:00`} icon={Clock4}>
          <HourStrip hours={report.hours} />
        </Card>

        <div className={c.grid2}>
          <Card title="En çok görüntülenen sayfalar" icon={Search}>
            <div className={c.rank}>{report.pages.slice(0, 8).map(([key, value]) => <BarRow key={key} label={labelPath(key)} value={value} total={report.filtered.length} />)}</div>
          </Card>
          <Card title="Trafik kaynakları" icon={ExternalLink}>
            <div className={c.rank}>{report.sources.slice(0, 8).map(([key, value]) => <BarRow key={key} label={key === "direct" ? "Doğrudan / uygulama" : key} value={value} total={report.filtered.length} />)}</div>
          </Card>
        </div>
      </>}
    </AdminPage>
  );
}

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return <span className={up ? c.up : c.down}>{up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {up ? "+" : ""}%{value} önceki döneme göre</span>;
}

function DayChart({ days }: { days: Array<{ key: string; label: string; weekday: string; value: number }> }) {
  const max = Math.max(...days.map((day) => day.value), 1);
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const labelEvery = days.length > 14 ? Math.ceil(days.length / 7) : days.length > 7 ? 2 : 1;
  return (
    <figure className={c.chart} role="img" aria-label={`Günlük görüntüleme grafiği, en yüksek ${max}`}>
      <div className={c.plot}>
        {[1, 0.75, 0.5, 0.25, 0].map((ratio) => <div key={ratio} className={c.gridLine} style={{ bottom: `${ratio * 100}%` }}><span>{Math.round(niceMax * ratio)}</span></div>)}
        <div className={c.bars}>
          {days.map((day) => (
            <div key={day.key} className={c.barCol} title={`${day.label} (${day.weekday}): ${day.value} görüntüleme`}>
              <span className={c.barTip}>{day.value}</span>
              <i className={c.bar} style={{ height: `${(day.value / niceMax) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className={c.xAxis}>{days.map((day, index) => <span key={day.key}>{index % labelEvery === 0 ? day.label : ""}</span>)}</div>
    </figure>
  );
}

function Donut({ rows, total }: { rows: [string, number][]; total: number }) {
  const radius = 52, circumference = 2 * Math.PI * radius;
  const segments = rows.reduce<Array<{ key: string; value: number; offset: number; length: number }>>((list, [key, value]) => {
    const previous = list.at(-1);
    const offset = previous ? previous.offset + previous.length : 0;
    return [...list, { key, value, offset, length: total ? (value / total) * circumference : 0 }];
  }, []);
  return (
    <div className={c.donutWrap}>
      <svg viewBox="0 0 140 140" className={c.donut} role="img" aria-label="Cihaz dağılımı">
        <circle cx="70" cy="70" r={radius} className={c.donutTrack} />
        {segments.map((segment) => (
          <circle key={segment.key} cx="70" cy="70" r={radius} fill="none" strokeWidth="16" stroke={DEVICE_COLOR[segment.key] ?? "var(--faint)"}
            strokeDasharray={`${Math.max(0, segment.length - 2)} ${circumference}`} strokeDashoffset={-segment.offset} transform="rotate(-90 70 70)" strokeLinecap="round">
            <title>{`${DEVICE_LABEL[segment.key] ?? segment.key}: ${segment.value}`}</title>
          </circle>
        ))}
        <text x="70" y="68" textAnchor="middle" className={c.donutValue}>{total.toLocaleString("tr-TR")}</text>
        <text x="70" y="86" textAnchor="middle" className={c.axis}>görüntüleme</text>
      </svg>
      <ul className={c.legend}>
        {rows.map(([key, value]) => (
          <li key={key}><i style={{ background: DEVICE_COLOR[key] ?? "var(--faint)" }} /> <span>{DEVICE_LABEL[key] ?? key}</span><b>%{total ? Math.round(value / total * 100) : 0}</b><small>{value.toLocaleString("tr-TR")}</small></li>
        ))}
      </ul>
    </div>
  );
}

function HourStrip({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  return (
    <div className={c.hours} role="img" aria-label="Saatlere göre görüntüleme yoğunluğu">
      {hours.map((value, hour) => (
        <div key={hour} className={c.hourCell} title={`${String(hour).padStart(2, "0")}:00 · ${value} görüntüleme`}>
          <span style={{ opacity: value ? 0.18 + (value / max) * 0.82 : 0.06 }} />
          {hour % 3 === 0 && <small>{String(hour).padStart(2, "0")}</small>}
        </div>
      ))}
    </div>
  );
}
