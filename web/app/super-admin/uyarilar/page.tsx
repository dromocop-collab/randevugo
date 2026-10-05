"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection, doc, getDocs, limit, orderBy, query, serverTimestamp, where, writeBatch,
  type FirestoreError, type QueryDocumentSnapshot, type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, BellRing, CheckCheck, CheckCircle2, MessageSquareText, RefreshCw, ShieldAlert } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAuthContext } from "@/features/auth/auth-context";
import { PLATFORM_ALERTS_CHANGED_EVENT } from "@/components/super-admin/admin-sidebar";

type AlertRow = {
  id: string; severity: "critical" | "warning"; category: string; title: string; message: string;
  businessId: string | null; reviewId: string | null; appointmentId: string | null;
  isRead: boolean; createdAt: string; createdMillis: number;
};
type Filter = "unread" | "all";

const PAGE_SIZE = 100;
const CATEGORY_LABEL: Record<string, string> = { sms: "SMS", review: "Yorum", support: "Destek", subscription: "Abonelik", business: "İşletme" };

function toRow(item: QueryDocumentSnapshot): AlertRow {
  const data = item.data();
  const stamp = data.createdAt as Timestamp | undefined;
  return {
    id: item.id,
    severity: data.severity === "critical" ? "critical" : "warning",
    category: String(data.category ?? "other"),
    title: String(data.title ?? "Platform uyarısı"),
    message: String(data.message ?? ""),
    businessId: typeof data.businessId === "string" ? data.businessId : null,
    reviewId: typeof data.reviewId === "string" ? data.reviewId : null,
    appointmentId: typeof data.appointmentId === "string" ? data.appointmentId : null,
    isRead: data.isRead === true,
    createdAt: stamp?.toDate ? stamp.toDate().toLocaleString("tr-TR") : "Şimdi",
    createdMillis: stamp?.toMillis?.() ?? Date.now(),
  };
}

function alertLink(alert: AlertRow): { href: string; label: string } | null {
  if (alert.category === "review") return { href: "/super-admin/moderasyon", label: "Moderasyona git" };
  if (alert.category === "sms") return { href: "/super-admin/sms", label: "SMS merkezini aç" };
  if (alert.businessId) return { href: `/super-admin/isletmeler?q=${encodeURIComponent(alert.businessId)}`, label: "İşletmeyi aç" };
  return null;
}

async function fetchAlerts(filter: Filter): Promise<AlertRow[]> {
  const alerts = collection(getDb(), "platformAlerts");
  if (filter === "all") return (await getDocs(query(alerts, orderBy("createdAt", "desc"), limit(PAGE_SIZE)))).docs.map(toRow);
  try {
    return (await getDocs(query(alerts, where("isRead", "==", false), orderBy("createdAt", "desc"), limit(PAGE_SIZE)))).docs.map(toRow);
  } catch (error) {
    // (isRead, createdAt) bileşik index'i henüz yoksa sıralamasız okunup istemcide sıralanır.
    if ((error as FirestoreError).code !== "failed-precondition") throw error;
    const snapshot = await getDocs(query(alerts, where("isRead", "==", false), limit(PAGE_SIZE)));
    return snapshot.docs.map(toRow).sort((a, b) => b.createdMillis - a.createdMillis);
  }
}

export default function SuperAdminAlertsPage() {
  const { user } = useAuthContext();
  const [filter, setFilter] = useState<Filter>("unread");
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (target: Filter) => {
    setLoading(true); setError("");
    try { setRows(await fetchAlerts(target)); }
    catch (reason) { setError((reason as Error).message || "Uyarılar yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(filter); }); }, [filter, load]);

  async function markRead(ids: string[]) {
    if (!user || ids.length === 0) return;
    setBusyId(ids.length === 1 ? ids[0] : "all");
    try {
      const db = getDb();
      for (let start = 0; start < ids.length; start += 400) {
        const batch = writeBatch(db);
        ids.slice(start, start + 400).forEach((id) => batch.update(doc(db, "platformAlerts", id), { isRead: true, readAt: serverTimestamp(), readBy: user.uid }));
        await batch.commit();
      }
      const done = new Set(ids);
      setRows((current) => filter === "unread" ? current.filter((row) => !done.has(row.id)) : current.map((row) => done.has(row.id) ? { ...row, isRead: true } : row));
      window.dispatchEvent(new Event(PLATFORM_ALERTS_CHANGED_EVENT));
      toast.success(ids.length === 1 ? "Uyarı okundu olarak işaretlendi." : `${ids.length} uyarı okundu olarak işaretlendi.`);
    } catch (reason) { toast.error((reason as Error).message); }
    finally { setBusyId(null); }
  }

  const unreadIds = useMemo(() => rows.filter((row) => !row.isRead).map((row) => row.id), [rows]);
  const criticalCount = useMemo(() => rows.filter((row) => !row.isRead && row.severity === "critical").length, [rows]);

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(125deg,#111827,#173a46_58%,#155e75)] px-6 py-6 text-white shadow-xl shadow-slate-950/10">
      <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-cyan-200"><BellRing size={14}/> PLATFORM UYARILARI</span><h1 className="mt-3 text-2xl font-semibold">Uyarı gelen kutusu</h1><p className="mt-1 text-sm text-cyan-50/60">Kalıcı SMS hataları, yorum gizleme talepleri ve diğer sistem sinyalleri.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void markRead(unreadIds)} disabled={loading || unreadIds.length === 0 || busyId !== null} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40"><CheckCheck size={14}/> Tümünü okundu say</button><button type="button" onClick={() => void load(filter)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Yenile</button></div></div>
    </section>
    <Card title="Son uyarılar" description={filter === "unread" ? `${rows.length} okunmamış uyarı${criticalCount ? ` · ${criticalCount} kritik` : ""}` : `Son ${rows.length} uyarı`} headerAction={<div className="flex gap-2"><Button size="sm" variant={filter === "unread" ? "secondary" : "ghost"} onClick={() => setFilter("unread")}>Okunmamış</Button><Button size="sm" variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>Tümü</Button></div>}>
      {loading && rows.length === 0 ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]" />)}</div>
      ) : error ? (
        <ErrorState title="Uyarılar yüklenemedi" description={error} action={<Button onClick={() => void load(filter)} iconLeft={<RefreshCw size={15}/>}>Yeniden dene</Button>}/>
      ) : rows.length === 0 ? (
        <EmptyState title={filter === "unread" ? "Okunmamış uyarı yok" : "Uyarı yok"} description={filter === "unread" ? "Tüm platform uyarıları incelenmiş görünüyor." : "Henüz platform uyarısı oluşmadı."}/>
      ) : (
        <div className="space-y-2">{rows.map((alert) => {
          const link = alertLink(alert);
          const critical = alert.severity === "critical";
          const Icon = alert.category === "review" ? ShieldAlert : alert.category === "sms" ? MessageSquareText : AlertTriangle;
          return <article key={alert.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${alert.isRead ? "border-[var(--border)] bg-[var(--surface-2)] opacity-70" : critical ? "border-rose-300/60 bg-rose-50/60" : "border-amber-300/60 bg-amber-50/50"}`}>
            <div className="flex min-w-0 gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${critical ? "bg-rose-500/15 text-rose-700" : "bg-amber-500/15 text-amber-700"}`}><Icon size={18}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-[var(--text-1)]">{alert.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${critical ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>{critical ? "KRİTİK" : "UYARI"}</span><span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-3)]">{CATEGORY_LABEL[alert.category] ?? alert.category}</span>{alert.isRead && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 size={12}/> Okundu</span>}</div>{alert.message && <p className="mt-1 break-words text-sm text-[var(--text-2)]">{alert.message}</p>}<p className="mt-1 text-xs text-[var(--text-3)]">{alert.createdAt}{alert.businessId ? ` · İşletme: ${alert.businessId}` : ""}{alert.appointmentId ? ` · Randevu: ${alert.appointmentId}` : ""}</p></div></div>
            <div className="flex shrink-0 flex-wrap gap-2">{link && <Link href={link.href} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-bold text-[var(--text-2)] transition hover:text-[var(--accent)]">{link.label} <ArrowRight size={13}/></Link>}{!alert.isRead && <Button size="sm" variant="secondary" disabled={busyId !== null} loading={busyId === alert.id} onClick={() => void markRead([alert.id])} iconLeft={<CheckCircle2 size={14}/>}>Okundu</Button>}</div>
          </article>;
        })}</div>
      )}
    </Card>
  </div>;
}
