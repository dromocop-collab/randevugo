"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { ClipboardList, Download, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";

interface AuditLogItem {
  id: string; action: string; actorUid?: string; actorRole?: string; businessId?: string;
  entityType?: string; entityId?: string; createdAt?: string;
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const snap = await getDocs(query(collection(getDb(), "platformAuditLogs"), orderBy("createdAt", "desc"), limit(250)));
      setLogs(snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id, action: String(data.action ?? "Bilinmeyen işlem"),
          actorUid: data.actorUid ? String(data.actorUid) : undefined,
          actorRole: data.actorRole ? String(data.actorRole) : undefined,
          businessId: data.businessId ? String(data.businessId) : undefined,
          entityType: data.entityType ? String(data.entityType) : undefined,
          entityId: data.entityId ? String(data.entityId) : undefined,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleString("tr-TR") : undefined,
        };
      }));
    } catch (loadError) { setError((loadError as Error).message || "Audit kayıtları yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadLogs(); }); }, [loadLogs]);

  const filtered = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase("tr-TR");
    if (!term) return logs;
    return logs.filter((log) => [log.action, log.actorUid, log.actorRole, log.businessId, log.entityType, log.entityId]
      .filter(Boolean).some((value) => String(value).toLocaleLowerCase("tr-TR").includes(term)));
  }, [logs, searchText]);

  function exportLogs() {
    const rows = [["Tarih", "İşlem", "Aktör rolü", "Aktör UID", "İşletme", "Varlık türü", "Varlık ID"], ...filtered.map((log) => [log.createdAt ?? "", log.action, log.actorRole ?? "", log.actorUid ?? "", log.businessId ?? "", log.entityType ?? "", log.entityId ?? ""] )];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `seninrandevun-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(125deg,#111827,#173a46_58%,#155e75)] px-6 py-6 text-white shadow-xl shadow-slate-950/10">
      <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-cyan-200"><ShieldCheck size={14} /> GÜVENLİK İZİ</span><h1 className="mt-3 text-2xl font-semibold">Platform işlem geçmişi</h1><p className="mt-1 text-sm text-cyan-50/60">Kritik yönetim hareketlerini aktör, işletme ve varlık bazında incele.</p></div><div className="flex gap-2"><button type="button" onClick={exportLogs} disabled={filtered.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40"><Download size={14} /> CSV</button><button type="button" onClick={() => void loadLogs()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile</button></div></div>
    </section>
    <Card title="Audit kayıtları" description={`${filtered.length} / ${logs.length} kayıt gösteriliyor`} headerAction={<ClipboardList size={19} className="text-cyan-700" />}>
      <label className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"><Search size={16} className="text-[var(--text-3)]" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="İşlem, aktör, işletme veya varlık ara…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)]" /></label>
      {loading && logs.length === 0 ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-200/70" />)}</div>
        : error ? <ErrorState title="Audit kayıtları yüklenemedi" description={error} action={<Button onClick={loadLogs} iconLeft={<RefreshCw size={15} />}>Yeniden dene</Button>} />
        : filtered.length === 0 ? <EmptyState title={logs.length ? "Eşleşen kayıt yok" : "Henüz audit kaydı yok"} description={logs.length ? "Arama ifadesini değiştirerek tekrar deneyin." : "Platform işlemleri kaydedildiğinde burada görünecek."} />
        : <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">{filtered.map((log) => <article key={log.id} className="grid gap-3 bg-[var(--surface-1)] p-4 transition hover:bg-cyan-500/5 md:grid-cols-[1.4fr_1fr_auto] md:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--text-1)]">{log.action}</p><p className="mt-1 truncate font-mono text-[10px] text-[var(--text-3)]">{log.id}</p></div><div className="flex flex-wrap gap-1.5">{[log.actorRole, log.entityType, log.businessId ? `İşletme ${log.businessId.slice(0, 8)}…` : undefined].filter(Boolean).map((label) => <span key={label} className="rounded-full bg-[var(--surface-3)] px-2 py-1 text-[10px] font-semibold text-[var(--text-2)]">{label}</span>)}</div><time className="text-xs text-[var(--text-3)]">{log.createdAt ?? "Tarih yok"}</time></article>)}</div>}
    </Card>
  </div>;
}
