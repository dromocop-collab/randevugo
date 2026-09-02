"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, getDocs, limit, query, where } from "firebase/firestore";
import {
  Activity, AlertTriangle, ArrowRight, Building2, CalendarDays, CheckCircle2,
  Clock3, Download, Headphones, RefreshCw, ShieldAlert, Sparkles, TrendingUp,
  UsersRound, WalletCards, WifiOff, type LucideIcon,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { PLAN_PRICE } from "@/constants/plans";

type SourceKey = "businesses" | "users" | "appointments" | "subscriptions" | "support" | "categories" | "reviews";
type SourceHealth = Record<SourceKey, boolean>;

interface PlatformStats {
  totalBusinesses: number; activeBusinesses: number; suspendedBusinesses: number; pendingBusinesses: number;
  totalUsers: number; totalAppointments: number; appointmentsLast7Days: number; appointmentsLast30Days: number;
  completedAppointments: number; cancelledAppointments: number; noShowAppointments: number;
  trialingBusinesses: number; subscribedBusinesses: number; pastDueSubscriptions: number;
  openSupportTickets: number; criticalSupportTickets: number; pendingCategoryRequests: number; pendingReviews: number;
  estimatedMRR: number; estimatedARR: number; sourceHealth: SourceHealth; updatedAt: Date;
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  businesses: "İşletmeler", users: "Kullanıcılar", appointments: "Randevular",
  subscriptions: "Abonelikler", support: "Destek", categories: "Kategori kuyruğu", reviews: "Yorumlar",
};

function dateFrom(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setFatalError(null);
    const db = getDb();
    const requests = {
      businesses: getDocs(collection(db, "businesses")),
      users: getDocs(collection(db, "users")),
      appointments: getDocs(query(collectionGroup(db, "appointments"), where("status", "in", ["pending", "confirmed", "completed", "cancelled", "no_show"]))),
      subscriptions: getDocs(collection(db, "subscriptions")),
      support: getDocs(query(collection(db, "supportTickets"), where("status", "in", ["open", "in_progress", "waiting_user"]))),
      categories: getDocs(query(collection(db, "categoryRequests"), where("status", "==", "pending"))),
      reviews: getDocs(query(collectionGroup(db, "reviews"), where("status", "==", "pending"), limit(250))),
    };
    try {
      const keys = Object.keys(requests) as SourceKey[];
      const settled = await Promise.allSettled(keys.map((key) => requests[key]));
      const result = Object.fromEntries(keys.map((key, index) => [key, settled[index]])) as Record<SourceKey, PromiseSettledResult<Awaited<(typeof requests)[SourceKey]>>>;
      const sourceHealth = Object.fromEntries(keys.map((key) => [key, result[key].status === "fulfilled"])) as SourceHealth;
      const docs = (key: SourceKey) => result[key].status === "fulfilled" ? result[key].value.docs : [];
      if (!Object.values(sourceHealth).some(Boolean)) throw new Error("Platform verilerine erişilemedi.");

      const businesses = docs("businesses"); const appointments = docs("appointments");
      const subscriptions = docs("subscriptions"); const supportTickets = docs("support");
      const now = Date.now(); const sevenDaysAgo = now - 7 * 86_400_000; const thirtyDaysAgo = now - 30 * 86_400_000;
      let activeBusinesses = 0, suspendedBusinesses = 0, pendingBusinesses = 0;
      businesses.forEach((item) => {
        const data = item.data(); const status = String(data.status ?? "");
        if (data.isSuspended === true || status === "suspended") suspendedBusinesses++;
        else if (status === "pending_review" || data.approvalStatus === "pending") pendingBusinesses++;
        else if (status === "active") activeBusinesses++;
      });
      let appointmentsLast7Days = 0, appointmentsLast30Days = 0, completedAppointments = 0, cancelledAppointments = 0, noShowAppointments = 0;
      appointments.forEach((item) => {
        const data = item.data(); const status = String(data.status ?? "");
        if (status === "completed") completedAppointments++;
        if (status === "cancelled") cancelledAppointments++;
        if (status === "no_show") noShowAppointments++;
        const appointmentDate = dateFrom(data.startAt) ?? dateFrom(data.createdAt);
        if (appointmentDate && appointmentDate.getTime() >= thirtyDaysAgo) appointmentsLast30Days++;
        if (appointmentDate && appointmentDate.getTime() >= sevenDaysAgo) appointmentsLast7Days++;
      });
      let trialingBusinesses = 0, subscribedBusinesses = 0, pastDueSubscriptions = 0;
      subscriptions.forEach((item) => {
        const status = String(item.data().status ?? "");
        if (status === "trialing") trialingBusinesses++;
        if (status === "active") subscribedBusinesses++;
        if (status === "past_due") pastDueSubscriptions++;
      });
      setStats({
        totalBusinesses: businesses.length, activeBusinesses, suspendedBusinesses, pendingBusinesses,
        totalUsers: docs("users").length, totalAppointments: appointments.length, appointmentsLast7Days, appointmentsLast30Days,
        completedAppointments, cancelledAppointments, noShowAppointments, trialingBusinesses, subscribedBusinesses, pastDueSubscriptions,
        openSupportTickets: supportTickets.length,
        criticalSupportTickets: supportTickets.filter((item) => ["critical", "high"].includes(String(item.data().priority))).length,
        pendingCategoryRequests: docs("categories").length, pendingReviews: docs("reviews").length,
        estimatedMRR: Math.round(subscribedBusinesses * PLAN_PRICE.monthlyEquivalent),
        estimatedARR: subscribedBusinesses * PLAN_PRICE.yearly, sourceHealth, updatedAt: new Date(),
      });
    } catch (error) { setFatalError((error as Error).message || "Platform özeti yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadDashboard(); }); }, [loadDashboard]);

  const insights = useMemo(() => {
    if (!stats) return null;
    const activeRate = stats.totalBusinesses > 0 ? stats.activeBusinesses / stats.totalBusinesses * 100 : 0;
    const subscriptionBase = stats.subscribedBusinesses + stats.trialingBusinesses + stats.pastDueSubscriptions;
    const conversionRate = subscriptionBase > 0 ? stats.subscribedBusinesses / subscriptionBase * 100 : 0;
    const outcomeBase = stats.completedAppointments + stats.cancelledAppointments + stats.noShowAppointments;
    const problemRate = outcomeBase > 0 ? (stats.cancelledAppointments + stats.noShowAppointments) / outcomeBase * 100 : 0;
    const healthySources = Object.values(stats.sourceHealth).filter(Boolean).length;
    const healthScore = Math.round(healthySources / Object.keys(stats.sourceHealth).length * 65 + Math.min(activeRate, 100) * .2 + Math.max(0, 100 - problemRate) * .15);
    return { activeRate, conversionRate, problemRate, healthySources, healthScore };
  }, [stats]);

  function exportSnapshot() {
    if (!stats || !insights) return;
    const rows: Array<[string, string | number]> = [
      ["Metrik", "Değer"], ["Rapor zamanı", stats.updatedAt.toLocaleString("tr-TR")], ["Platform sağlık puanı", insights.healthScore],
      ["Toplam işletme", stats.totalBusinesses], ["Aktif işletme", stats.activeBusinesses], ["Onay bekleyen işletme", stats.pendingBusinesses],
      ["Toplam kullanıcı", stats.totalUsers], ["Toplam randevu", stats.totalAppointments], ["Son 7 gün randevu", stats.appointmentsLast7Days],
      ["Son 30 gün randevu", stats.appointmentsLast30Days], ["Aktif abonelik", stats.subscribedBusinesses], ["Ödeme bekleyen", stats.pastDueSubscriptions],
      ["Tahmini MRR", stats.estimatedMRR], ["Tahmini ARR", stats.estimatedARR], ["Açık destek kaydı", stats.openSupportTickets],
    ];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `seninrandevun-platform-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  if (loading && !stats) return <DashboardSkeleton />;
  if (fatalError && !stats) return <ErrorState title="Komuta merkezi açılamadı" description={fatalError} action={<Button onClick={loadDashboard} iconLeft={<RefreshCw size={16} />}>Yeniden dene</Button>} />;
  if (!stats || !insights) return null;

  const degradedSources = (Object.keys(stats.sourceHealth) as SourceKey[]).filter((key) => !stats.sourceHealth[key]);
  const attention = [
    { label: "İşletme onayı", count: stats.pendingBusinesses, href: "/super-admin/isletmeler", icon: Building2, tone: "amber" },
    { label: "Kritik destek", count: stats.criticalSupportTickets, href: "/super-admin/destek", icon: Headphones, tone: "rose" },
    { label: "Ödeme bekleyen", count: stats.pastDueSubscriptions, href: "/super-admin/abonelikler", icon: WalletCards, tone: "rose" },
    { label: "Yorum moderasyonu", count: stats.pendingReviews, href: "/super-admin/moderasyon", icon: ShieldAlert, tone: "violet" },
    { label: "Kategori isteği", count: stats.pendingCategoryRequests, href: "/super-admin/moderasyon", icon: Sparkles, tone: "sky" },
  ];
  const metrics: Array<{ label: string; value: string; detail: string; icon: LucideIcon; tone: string }> = [
    { label: "Aktif işletme", value: stats.activeBusinesses.toLocaleString("tr-TR"), detail: `%${insights.activeRate.toFixed(1)} aktiflik`, icon: Building2, tone: "emerald" },
    { label: "Toplam kullanıcı", value: stats.totalUsers.toLocaleString("tr-TR"), detail: `${stats.totalBusinesses.toLocaleString("tr-TR")} işletme`, icon: UsersRound, tone: "sky" },
    { label: "Son 7 gün", value: stats.appointmentsLast7Days.toLocaleString("tr-TR"), detail: `${stats.appointmentsLast30Days.toLocaleString("tr-TR")} / son 30 gün`, icon: CalendarDays, tone: "violet" },
    { label: "Tahmini MRR", value: `${stats.estimatedMRR.toLocaleString("tr-TR")} ₺`, detail: `${stats.subscribedBusinesses} aktif abonelik`, icon: TrendingUp, tone: "cyan" },
  ];

  return <div className="admin-dashboard space-y-5">
    <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#071821,#0b3b48_58%,#0e7490)] px-6 py-7 text-white shadow-xl shadow-cyan-950/15 sm:px-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-cyan-200/15 bg-cyan-200/5" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[.18em] text-cyan-200"><Activity size={13} /> CANLI OPERASYON</span><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Platformun tamamını tek bakışta yönet.</h2><p className="mt-2 max-w-2xl text-sm text-cyan-50/65">Riskleri, büyümeyi, randevu kalitesini ve gelir sinyallerini gerçek platform verisiyle izle.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportSnapshot} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"><Download size={15} /> CSV özeti</button><button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Yenile</button></div></div>
    </section>

    <section className={`admin-health-strip ${degradedSources.length ? "!bg-amber-950" : ""}`}><div><span className={`admin-live-dot ${degradedSources.length ? "!bg-amber-400" : ""}`} /> Sistem durumu <strong>{degradedSources.length ? `${degradedSources.length} veri kaynağı kontrol edilmeli` : "Tüm veri kaynakları erişilebilir"}</strong></div><p>Son güncelleme {stats.updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p></section>
    {degradedSources.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950"><WifiOff size={18} /><b>Kısmi veri:</b>{degradedSources.map((key) => <span key={key} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">{SOURCE_LABELS[key]}</span>)}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card title="Operasyon sağlığı" description="Platform kalitesini etkileyen temel oranlar"><div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center"><div className="relative mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(#06b6d4 ${insights.healthScore}%, rgba(148,163,184,.18) 0)` }}><div className="grid h-28 w-28 place-items-center rounded-full bg-[var(--surface-1)] text-center"><div><b className="text-3xl text-[var(--text-1)]">{insights.healthScore}</b><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">Sağlık puanı</p></div></div></div><div className="space-y-4"><ProgressRow label="Aktif işletme oranı" value={insights.activeRate} tone="#10b981" /><ProgressRow label="Abonelik dönüşümü" value={insights.conversionRate} tone="#06b6d4" /><ProgressRow label="Sorunsuz randevu oranı" value={Math.max(0, 100 - insights.problemRate)} tone="#8b5cf6" /><p className="text-xs text-[var(--text-3)]">{insights.healthySources}/{Object.keys(stats.sourceHealth).length} veri kaynağı sağlıklı · İptal/no-show %{insights.problemRate.toFixed(1)}</p></div></div></Card>
      <Card title="Dikkat merkezi" description="Aksiyon bekleyen operasyonlar"><div className="space-y-2">{attention.map((item) => <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 transition hover:-translate-y-0.5 hover:border-cyan-500/30 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-700"><item.icon size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--text-1)]">{item.label}</p><p className="text-xs text-[var(--text-3)]">{item.count === 0 ? "Bekleyen işlem yok" : `${item.count} kayıt aksiyon bekliyor`}</p></div><b className={item.count ? "text-amber-600" : "text-emerald-600"}>{item.count}</b><ArrowRight size={15} className="text-[var(--text-3)] transition group-hover:translate-x-1" /></Link>)}</div></Card>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Randevu sonuçları" description={`${stats.totalAppointments.toLocaleString("tr-TR")} toplam randevunun durum dağılımı`}><div className="grid gap-3 sm:grid-cols-3"><Outcome label="Tamamlandı" value={stats.completedAppointments} icon={CheckCircle2} tone="emerald" /><Outcome label="İptal" value={stats.cancelledAppointments} icon={AlertTriangle} tone="amber" /><Outcome label="Gelmedi" value={stats.noShowAppointments} icon={Clock3} tone="rose" /></div></Card>
      <Card title="Gelir görünümü" description="Aktif ve riskli abonelik özeti"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-emerald-500/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Tahmini ARR</p><b className="mt-2 block text-2xl text-emerald-700">{stats.estimatedARR.toLocaleString("tr-TR")} ₺</b><small className="text-emerald-700/70">{stats.subscribedBusinesses} aktif abonelik</small></div><div className="rounded-2xl bg-amber-500/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Dönüşüm havuzu</p><b className="mt-2 block text-2xl text-amber-700">{stats.trialingBusinesses}</b><small className="text-amber-700/70">deneme sürecindeki işletme</small></div></div></Card>
    </div>

    <Card title="Hızlı yönetim" description="Sık kullanılan platform operasyonları"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { title: "İşletmeleri yönet", detail: "Onay, askıya alma ve plan", href: "/super-admin/isletmeler", icon: Building2 },
      { title: "Destek merkezini aç", detail: `${stats.openSupportTickets} açık kayıt`, href: "/super-admin/destek", icon: Headphones },
      { title: "Moderasyon kuyruğu", detail: `${stats.pendingReviews + stats.pendingCategoryRequests} bekleyen`, href: "/super-admin/moderasyon", icon: ShieldAlert },
      { title: "Abonelikleri incele", detail: `${stats.pastDueSubscriptions} ödeme riski`, href: "/super-admin/abonelikler", icon: WalletCards },
    ].map((item) => <Link key={item.href} href={item.href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-lg"><item.icon size={20} className="text-cyan-600" /><p className="mt-3 text-sm font-semibold text-[var(--text-1)]">{item.title}</p><p className="mt-1 text-xs text-[var(--text-3)]">{item.detail}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-700">Aç <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span></Link>)}</div></Card>
  </div>;
}

function DashboardSkeleton() {
  return <div className="space-y-4" role="status" aria-label="Platform verileri yükleniyor"><div className="h-48 animate-pulse rounded-[28px] bg-slate-200/70" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />)}</div><div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" /></div>;
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon; tone: string }) {
  return <article className="admin-metric rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-3)]">{label}</p><b className="mt-2 block text-2xl text-[var(--text-1)]">{value}</b><p className="mt-1 text-xs text-[var(--text-3)]">{detail}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-700"><Icon size={20} /></span></div></article>;
}

function ProgressRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return <div><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-[var(--text-2)]">{label}</span><b className="text-[var(--text-1)]">%{safeValue.toFixed(1)}</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full transition-all" style={{ width: `${safeValue}%`, background: tone }} /></div></div>;
}

function Outcome({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "emerald" | "amber" | "rose" }) {
  const colors = { emerald: "bg-emerald-500/10 text-emerald-700", amber: "bg-amber-500/10 text-amber-700", rose: "bg-rose-500/10 text-rose-700" };
  return <div className={`rounded-2xl p-4 ${colors[tone]}`}><Icon size={18} /><b className="mt-3 block text-2xl">{value.toLocaleString("tr-TR")}</b><p className="text-xs font-semibold opacity-75">{label}</p></div>;
}
