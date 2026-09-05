"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, ExternalLink, Eye, MonitorSmartphone, MousePointerClick, RefreshCw, Search, UsersRound } from "lucide-react";
import { listRecentPageViews, type PlatformPageView } from "@/features/analytics/platform-analytics-repository";
import { Button } from "@/components/ui/button";

const DAY = 86_400_000;

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate();
  return null;
}

function labelPath(path: string) {
  if (path === "/") return "Ana sayfa";
  return decodeURIComponent(path).replace(/^\//, "").replaceAll("-", " ").replaceAll("/", " › ");
}

export default function PlatformAnalyticsPage() {
  const [events, setEvents] = useState<PlatformPageView[]>([]);
  const [range, setRange] = useState<7 | 30>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportTime] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try { setEvents(await listRecentPageViews()); setError(""); }
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
    const countBy = (key: "path" | "referrer" | "device") => {
      const map = new Map<string, number>(); filtered.forEach((event) => map.set(String(event[key] || "Bilinmiyor"), (map.get(String(event[key] || "Bilinmiyor")) ?? 0) + 1));
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    const days = Array.from({ length: Math.min(range, 14) }, (_, index) => {
      const date = new Date(now - (Math.min(range, 14) - 1 - index) * DAY); const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }), value: filtered.filter((event) => asDate(event.createdAt)?.toISOString().slice(0, 10) === key).length };
    });
    return { filtered, sessions: sessions.size, change, pages: countBy("path"), sources: countBy("referrer"), devices: countBy("device"), days };
  }, [events, range, reportTime]);

  function exportCsv() {
    const header = "Tarih;Sayfa;Kaynak;Cihaz;Oturum";
    const rows = report.filtered.map((event) => [asDate(event.createdAt)?.toLocaleString("tr-TR") ?? "", event.path, event.referrer, event.device, event.sessionId].map((value) => `"${String(value).replaceAll('"','""')}"`).join(";"));
    const url = URL.createObjectURL(new Blob(["\uFEFF" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `ziyaretci-analitigi-${range}-gun.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const maxDay = Math.max(...report.days.map((day) => day.value), 1);
  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(120deg,#061a22,#0e5265_58%,#22b8cf)] p-7 text-white shadow-xl sm:p-9"><div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-cyan-100/15 bg-white/5"/><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[.16em]"><BarChart3 size={14}/> TRAFİK KOMUTA MERKEZİ</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Kullanıcılar sizi nasıl buluyor?</h1><p className="mt-3 max-w-2xl text-sm text-cyan-50/70">Ziyaret, tekil oturum, popüler sayfa, cihaz ve yönlendiren kaynakları kişisel veri toplamadan izleyin.</p></div><div className="flex gap-2"><Button onClick={exportCsv} variant="secondary" iconLeft={<Download size={15}/>}>CSV</Button><Button onClick={load} disabled={loading} iconLeft={<RefreshCw size={15} className={loading ? "animate-spin" : ""}/>}>Yenile</Button></div></div></section>
    <div className="flex items-center justify-between gap-3"><div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">{([7,30] as const).map((day) => <button key={day} onClick={() => setRange(day)} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${range === day ? "bg-cyan-600 text-white shadow" : "text-[var(--text-3)]"}`}>Son {day} gün</button>)}</div><span className="text-xs text-[var(--text-3)]">Son {Math.min(events.length,2500)} olay işlendi</span></div>
    {error && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">{error} Firestore kurallarının yayınlandığını kontrol edin.</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Eye} label="Sayfa görüntüleme" value={report.filtered.length} note={`${range} günlük trafik`}/><Metric icon={UsersRound} label="Tekil oturum" value={report.sessions} note={`${report.change >= 0 ? "+" : ""}%${report.change} önceki döneme göre`}/><Metric icon={MousePointerClick} label="Oturum başı sayfa" value={report.sessions ? Number((report.filtered.length / report.sessions).toFixed(1)) : 0} note="etkileşim derinliği"/><Metric icon={MonitorSmartphone} label="Mobil payı" value={report.filtered.length ? Math.round((report.devices.find(([key]) => key === "mobile")?.[1] ?? 0) / report.filtered.length * 100) : 0} suffix="%" note="mobil ziyaret oranı"/></section>
    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><div><h2 className="font-extrabold text-[var(--text-1)]">Ziyaret ritmi</h2><p className="text-xs text-[var(--text-3)]">Günlük sayfa görüntülemeleri</p></div><div className="mt-8 flex h-64 items-end gap-2">{report.days.map((day) => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center"><small className="text-[9px] font-bold text-[var(--text-3)]">{day.value}</small><div className="relative h-[80%] overflow-hidden rounded-xl bg-[var(--surface-3)]"><i className="absolute inset-x-0 bottom-0 rounded-xl bg-[linear-gradient(180deg,#67e8f9,#0891b2)] transition-all duration-700" style={{height:`${Math.max(day.value ? 8 : 0, day.value / maxDay * 100)}%`}}/></div><span className="truncate text-[8px] text-[var(--text-3)]">{day.label}</span></div>)}</div></article><Ranking title="Trafik kaynakları" icon={ExternalLink} rows={report.sources} total={report.filtered.length} format={(value) => value === "direct" ? "Doğrudan / uygulama" : value}/></section>
    <section className="grid gap-5 lg:grid-cols-2"><Ranking title="En çok görüntülenen sayfalar" icon={Search} rows={report.pages} total={report.filtered.length} format={labelPath}/><Ranking title="Cihaz dağılımı" icon={MonitorSmartphone} rows={report.devices} total={report.filtered.length} format={(value) => ({mobile:"Mobil",tablet:"Tablet",desktop:"Masaüstü"}[value] ?? value)}/></section>
  </div>;
}

function Metric({ icon: Icon, label, value, note, suffix = "" }: { icon: typeof Eye; label: string; value: number; note: string; suffix?: string }) { return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700"><Icon size={18}/></span><p className="mt-4 text-[10px] font-black uppercase tracking-[.13em] text-[var(--text-3)]">{label}</p><b className="mt-1 block text-3xl text-[var(--text-1)]">{value.toLocaleString("tr-TR")}{suffix}</b><small className="text-[var(--text-3)]">{note}</small></article>; }
function Ranking({ title, icon: Icon, rows, total, format }: { title: string; icon: typeof Search; rows: [string,number][]; total: number; format: (value:string)=>string }) { return <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700"><Icon size={18}/></span><h2 className="font-extrabold text-[var(--text-1)]">{title}</h2></div><div className="mt-5 space-y-4">{rows.slice(0,7).map(([key,value]) => <div key={key}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate font-semibold capitalize text-[var(--text-2)]">{format(key)}</span><b className="text-[var(--text-1)]">{value}</b></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><i className="block h-full rounded-full bg-cyan-500" style={{width:`${total ? Math.max(4,value/total*100) : 0}%`}}/></div></div>)}{!rows.length && <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-3)]">Yeni ziyaret verileri burada görünecek.</p>}</div></article>; }
