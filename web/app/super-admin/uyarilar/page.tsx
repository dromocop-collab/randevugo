"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection, doc, getDocs, limit, orderBy, query, serverTimestamp, where, writeBatch,
  type FirestoreError, type QueryDocumentSnapshot, type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, BellRing, Building2, CheckCheck, CheckCircle2, CreditCard, Headphones, MessageSquareText, RefreshCw, ShieldAlert, Siren,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { useAuthContext } from "@/features/auth/auth-context";
import { PLATFORM_ALERTS_CHANGED_EVENT } from "@/components/super-admin/admin-sidebar";
import {
  AdminPage, Btn, Chips, ConfirmSheet, CopyButton, EmptyState, ErrorBox, HeroStat, PageHeader, Pill, Segmented, SkeletonList, StatCard, StatGrid,
  Toolbar, ToolbarRow, cx, fullDate, groupByDay, relativeTime, ui, useNow,
} from "../_pages-ui";
import a from "./alerts.module.css";

type AlertRow = {
  id: string; severity: "critical" | "warning"; category: string; title: string; message: string;
  businessId: string | null; reviewId: string | null; appointmentId: string | null;
  isRead: boolean; createdAt: string; createdMillis: number;
};
type Filter = "unread" | "all";

const PAGE_SIZE = 100;
const CATEGORY_LABEL: Record<string, string> = { sms: "SMS", review: "Yorum", support: "Destek", subscription: "Abonelik", business: "İşletme" };
const CATEGORY_ICON: Record<string, typeof AlertTriangle> = { sms: MessageSquareText, review: ShieldAlert, support: Headphones, subscription: CreditCard, business: Building2 };

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
  if (alert.category === "booking_fields") return { href: "/super-admin/randevu-alanlari", label: "Talebi incele" };
  if (alert.category === "support") return { href: "/super-admin/destek", label: "Desteği aç" };
  if (alert.category === "subscription") return { href: "/super-admin/abonelikler", label: "Abonelikleri aç" };
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
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("unread");
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

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

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.category, (counts.get(row.category) ?? 0) + 1));
    return [
      { value: "all", label: "Tümü", count: rows.length },
      ...[...counts.entries()].sort((x, y) => y[1] - x[1]).map(([key, count]) => ({ value: key, label: CATEGORY_LABEL[key] ?? "Diğer", count })),
    ];
  }, [rows]);

  const visible = useMemo(() => rows.filter((row) => (category === "all" || row.category === category) && (!criticalOnly || row.severity === "critical")), [rows, category, criticalOnly]);
  const unreadVisible = useMemo(() => visible.filter((row) => !row.isRead), [visible]);
  const readVisible = useMemo(() => visible.filter((row) => row.isRead), [visible]);
  const unreadIds = useMemo(() => unreadVisible.map((row) => row.id), [unreadVisible]);
  const criticalCount = useMemo(() => rows.filter((row) => !row.isRead && row.severity === "critical").length, [rows]);
  const unreadTotal = useMemo(() => rows.filter((row) => !row.isRead).length, [rows]);
  const last24 = useMemo(() => rows.filter((row) => now - row.createdMillis < 86_400_000).length, [rows, now]);
  const filtersActive = category !== "all" || criticalOnly;

  function renderAlert(alert: AlertRow) {
    const link = alertLink(alert);
    const Icon = CATEGORY_ICON[alert.category] ?? AlertTriangle;
    const critical = alert.severity === "critical";
    return (
      <article key={alert.id} className={cx(a.alert, critical ? a.critical : a.warning, alert.isRead ? a.read : a.unread)}>
        <span className={a.icon}><Icon size={18} aria-hidden /></span>
        <div className={a.body}>
          <div className={a.titleRow}>
            {!alert.isRead && <i className={a.unreadDot} aria-label="Okunmadı" />}
            <p className={a.title}>{alert.title}</p>
            <Pill tone={critical ? "red" : "amber"}>{critical ? "Kritik" : "Uyarı"}</Pill>
            <Pill>{CATEGORY_LABEL[alert.category] ?? alert.category}</Pill>
            {alert.isRead && <Pill tone="green"><CheckCircle2 size={11} /> Okundu</Pill>}
          </div>
          {alert.message && <p className={a.message}>{alert.message}</p>}
          <div className={a.meta}>
            <time title={fullDate(alert.createdMillis)}>{relativeTime(alert.createdMillis, now)} · {alert.createdAt}</time>
            {alert.businessId && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>İşletme <span className={ui.mono}>{alert.businessId.slice(0, 10)}…</span><CopyButton value={alert.businessId} compact label="İşletme kimliğini kopyala" /></span>}
            {alert.appointmentId && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Randevu <span className={ui.mono}>{alert.appointmentId.slice(0, 10)}…</span><CopyButton value={alert.appointmentId} compact label="Randevu kimliğini kopyala" /></span>}
          </div>
        </div>
        <div className={a.actions}>
          {link && <Link href={link.href} className={`${ui.btn} ${ui.btnSm}`}>{link.label} <ArrowRight size={13} /></Link>}
          {!alert.isRead && <Btn size="sm" variant="primary" icon={CheckCircle2} disabled={busyId !== null && busyId !== alert.id} loading={busyId === alert.id} onClick={() => void markRead([alert.id])}>Okundu</Btn>}
        </div>
      </article>
    );
  }

  function renderGroups(items: AlertRow[]) {
    return groupByDay(items, (row) => row.createdMillis, now).map((group) => (
      <div key={group.key} className={a.section}>
        <div className={ui.groupLabel}>{group.label}<span>{group.items.length}</span></div>
        {group.items.map(renderAlert)}
      </div>
    ));
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Platform uyarıları"
        icon={BellRing}
        title="Uyarı gelen kutusu"
        description="Kalıcı SMS hataları, yorum gizleme talepleri ve diğer sistem sinyalleri. Okunmamışlar her zaman en üstte."
        meta={<>
          <HeroStat label="okunmamış" value={loading && !rows.length ? "…" : unreadTotal} />
          <HeroStat label="kritik" value={loading && !rows.length ? "…" : criticalCount} />
        </>}
        actions={<>
          <Btn variant="onDark" icon={CheckCheck} disabled={loading || unreadIds.length === 0 || busyId !== null} loading={busyId === "all"} onClick={() => setConfirmAll(true)}>{category === "all" && !criticalOnly ? "Tümünü okundu say" : "Görünenleri okundu say"}</Btn>
          <Btn variant="lime" icon={RefreshCw} loading={loading} onClick={() => void load(filter)}>Yenile</Btn>
        </>}
      />

      <StatGrid>
        <StatCard label="Okunmamış" value={unreadTotal} hint="incelenmeyi bekliyor" icon={BellRing} tone="amber" onClick={() => { setFilter("unread"); setCriticalOnly(false); }} active={filter === "unread" && !criticalOnly} />
        <StatCard label="Kritik" value={criticalCount} hint="okunmamış kritik uyarı" icon={Siren} tone={criticalCount ? "red" : "neutral"} onClick={() => setCriticalOnly((value) => !value)} active={criticalOnly} />
        <StatCard label="Son 24 saat" value={last24} hint="yüklenen uyarılar içinde" icon={AlertTriangle} tone="blue" />
        <StatCard label="Kategori" value={Math.max(0, categoryOptions.length - 1)} hint="farklı kaynak" icon={ShieldAlert} tone="violet" />
      </StatGrid>

      <Toolbar>
        <Segmented label="Okunma durumu" value={filter} onChange={setFilter} options={[
          { value: "unread", label: "Okunmamış", count: filter === "unread" ? rows.length : undefined, alert: criticalCount > 0 },
          { value: "all", label: "Tümü (son 100)" },
        ]} />
        <ToolbarRow>
          <Chips label="Kategori" value={category} onChange={setCategory} options={categoryOptions} />
          {criticalOnly && <button type="button" className={`${ui.chip} ${ui.chipOn}`} onClick={() => setCriticalOnly(false)}>Yalnız kritik ✕</button>}
        </ToolbarRow>
      </Toolbar>

      {loading && rows.length === 0 ? <SkeletonList rows={4} height={96} />
        : error ? <ErrorBox message={error} onRetry={() => void load(filter)} />
        : visible.length === 0 ? (
          <div className={ui.card}>
            <EmptyState icon={CheckCheck}
              title={filtersActive ? "Bu filtrede uyarı yok" : filter === "unread" ? "Okunmamış uyarı yok" : "Uyarı yok"}
              description={filtersActive ? "Kategori veya kritik filtresini temizleyin." : filter === "unread" ? "Tüm platform uyarıları incelenmiş görünüyor." : "Henüz platform uyarısı oluşmadı."}
              action={filtersActive ? <Btn size="sm" onClick={() => { setCategory("all"); setCriticalOnly(false); }}>Filtreleri temizle</Btn> : filter === "unread" ? <Btn size="sm" onClick={() => setFilter("all")}>Tüm uyarıları göster</Btn> : undefined} />
          </div>
        ) : (
          <div className={a.feed}>
            {unreadVisible.length > 0 && <>
              {filter === "all" && <h2 className={a.sectionTitle}>Okunmamış <Pill tone="amber">{unreadVisible.length}</Pill></h2>}
              {renderGroups(unreadVisible)}
            </>}
            {readVisible.length > 0 && <>
              <h2 className={a.sectionTitle} style={{ marginTop: 14 }}>Okunanlar <Pill>{readVisible.length}</Pill></h2>
              {renderGroups(readVisible)}
            </>}
          </div>
        )}

      <ConfirmSheet open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={() => markRead(unreadIds)} icon={CheckCheck}
        title={`${unreadIds.length} uyarı okundu sayılsın mı?`}
        description={category === "all" && !criticalOnly ? "Yüklenen tüm okunmamış uyarılar okundu olarak işaretlenecek." : "Yalnızca şu an görünen (filtrelenmiş) okunmamış uyarılar işaretlenecek."}
        confirmLabel="Okundu say" />
    </AdminPage>
  );
}
