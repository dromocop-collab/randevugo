"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, doc, getCountFromServer, getDoc, getDocs, limit, query, Timestamp, where, type DocumentData, type Firestore, type Query } from "firebase/firestore";
import {
  AlertTriangle, ArrowRight, BellRing, Building2, CalendarDays, CheckCircle2, Clock3, CreditCard, Download,
  EyeOff, Headphones, MessageSquareWarning, PackagePlus, RefreshCw, ShieldAlert, Siren, Sparkles, TrendingUp,
  UsersRound, WalletCards, WifiOff, type LucideIcon,
} from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { isStaleSupportTicket, SUPPORT_NEEDS_ADMIN_STATUSES, estimateRecurringRevenue, type RevenueSubscriptionInput } from "@/features/platform/admin-ops";
import { defaultPlatformPlan, listPlatformPlansWithSource, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import {
  AdminButton, AdminPage, Badge, Callout, EmptyState, PageHeader, Panel, Skeleton, StatCard, StatGrid, toneClassName, type AdminTone,
} from "@/components/super-admin/ui";
import styles from "./dashboard.module.css";

type SourceKey = "businesses" | "users" | "appointments" | "subscriptions" | "support" | "categories" | "reviews";
type SourceHealth = Record<SourceKey, boolean>;
type DataDoc = { id?: string; data: () => DocumentData };

type RecentBusiness = { id: string; name: string; city: string; category: string; status: string; createdAt: Date | null };

interface PlatformStats {
  totalBusinesses: number; activeBusinesses: number; suspendedBusinesses: number; pendingBusinesses: number;
  newBusinesses30: number; newBusinessesPrev30: number;
  totalUsers: number; totalAppointments: number; appointmentsLast7Days: number; appointmentsPrev7Days: number | null; appointmentsLast30Days: number;
  completedAppointments: number; cancelledAppointments: number; noShowAppointments: number;
  trialingBusinesses: number; subscribedBusinesses: number; pastDueSubscriptions: number; expiringSoon: number;
  openSupportTickets: number; staleSupportTickets: number; pendingCategoryRequests: number; pendingReviews: number;
  pendingHideRequests: number; unreadAlerts: number; criticalUnreadAlerts: number; unreadSmsAlerts: number; pendingPurchases: number;
  estimatedMRR: number; estimatedARR: number; payingAccounts: number; skippedLifetime: number; skippedAdmin: number;
  plansFromFallback: boolean; recentBusinesses: RecentBusiness[];
  sourceHealth: SourceHealth; updatedAt: Date;
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  businesses: "İşletmeler", users: "Kullanıcılar", appointments: "Randevular",
  subscriptions: "Abonelikler", support: "Destek", categories: "Kategori kuyruğu", reviews: "Yorumlar",
};

const STATUS_BADGE: Record<string, { label: string; tone: AdminTone }> = {
  active: { label: "Aktif", tone: "green" },
  pending_review: { label: "Onay bekliyor", tone: "amber" },
  rejected: { label: "Reddedildi", tone: "red" },
  suspended: { label: "Askıda", tone: "red" },
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
const fmt = (value: number) => value.toLocaleString("tr-TR");
const pctChange = (current: number, previous: number | null) => previous === null ? null : previous === 0 ? (current > 0 ? 100 : 0) : (current - previous) / previous * 100;

async function readBusinessChildren(db: Firestore, businessIds: string[], child: "appointments" | "reviews"): Promise<DataDoc[]> {
  const settled = await Promise.allSettled(businessIds.map((businessId) => getDocs(collection(db, "businesses", businessId, child))));
  const rejected = settled.find((result) => result.status === "rejected");
  if (rejected) throw rejected.reason;
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value.docs : []);
}

async function readBusinessSubscriptions(db: Firestore, businessIds: string[]): Promise<DataDoc[]> {
  const settled = await Promise.allSettled(businessIds.map((businessId) => getDoc(doc(db, "subscriptions", businessId))));
  const rejected = settled.find((result) => result.status === "rejected");
  if (rejected) throw rejected.reason;
  return settled.flatMap((result) => result.status === "fulfilled" && result.value.exists() ? [result.value] : []);
}

type AppointmentCounts = { total: number; last7: number; prev7: number | null; last30: number; completed: number; cancelled: number; noShow: number };
const COUNTED_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];

function countAppointmentDocs(docs: DataDoc[], fourteenDaysAgo: number, sevenDaysAgo: number, thirtyDaysAgo: number): AppointmentCounts {
  const counts: AppointmentCounts = { total: 0, last7: 0, prev7: 0, last30: 0, completed: 0, cancelled: 0, noShow: 0 };
  docs.forEach((item) => {
    const data = item.data(); const status = String(data.status ?? "");
    if (!COUNTED_STATUSES.includes(status)) return;
    counts.total++;
    if (status === "completed") counts.completed++;
    if (status === "cancelled") counts.cancelled++;
    if (status === "no_show") counts.noShow++;
    const time = (dateFrom(data.startAt) ?? dateFrom(data.createdAt))?.getTime();
    if (time === undefined) return;
    if (time >= thirtyDaysAgo) counts.last30++;
    if (time >= sevenDaysAgo) counts.last7++;
    else if (time >= fourteenDaysAgo) counts.prev7 = (counts.prev7 ?? 0) + 1;
  });
  return counts;
}

// Tüm randevu belgelerini indirmek yerine sunucu tarafı sayım kullanılır; index yoksa eski okuma yoluna düşer.
async function loadAppointmentCounts(db: Firestore, businessIds: string[], fourteenDaysAgo: number, sevenDaysAgo: number, thirtyDaysAgo: number): Promise<AppointmentCounts> {
  const group = collectionGroup(db, "appointments");
  const count = (target: Query) => getCountFromServer(target).then((snapshot) => snapshot.data().count);
  try {
    const [total, completed, cancelled, noShow, last30, last7] = await Promise.all([
      count(query(group, where("status", "in", COUNTED_STATUSES))),
      count(query(group, where("status", "==", "completed"))),
      count(query(group, where("status", "==", "cancelled"))),
      count(query(group, where("status", "==", "no_show"))),
      count(query(group, where("startAt", ">=", Timestamp.fromMillis(thirtyDaysAgo)))),
      count(query(group, where("startAt", ">=", Timestamp.fromMillis(sevenDaysAgo)))),
    ]);
    // Önceki 7 gün yalnızca trend için; başarısız olursa trend gösterilmez.
    const prev7 = await count(query(group, where("startAt", ">=", Timestamp.fromMillis(fourteenDaysAgo)), where("startAt", "<", Timestamp.fromMillis(sevenDaysAgo)))).catch(() => null);
    return { total, completed, cancelled, noShow, last30, last7, prev7 };
  } catch {
    return countAppointmentDocs(await readBusinessChildren(db, businessIds, "appointments"), fourteenDaysAgo, sevenDaysAgo, thirtyDaysAgo);
  }
}

async function withFallback(primary: Promise<{ docs: DataDoc[] }>, fallback: () => Promise<DataDoc[]>): Promise<DataDoc[]> {
  try { return (await primary).docs; }
  catch { return fallback(); }
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const viewerUid = user?.uid ?? null;
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setFatalError(null);
    const db = getDb();
    let businessDocs: Array<DataDoc & { id: string }> = [];
    let businessIds: string[] = [];
    try {
      const snapshot = await getDocs(collection(db, "businesses"));
      businessDocs = snapshot.docs;
      businessIds = snapshot.docs.map((item) => item.id);
    } catch (error) {
      setFatalError((error as Error).message || "İşletme verilerine erişilemedi.");
      setLoading(false);
      return;
    }
    const now = Date.now(); const day = 86_400_000;
    const sevenDaysAgo = now - 7 * day; const fourteenDaysAgo = now - 14 * day; const thirtyDaysAgo = now - 30 * day; const sixtyDaysAgo = now - 60 * day;
    const appointmentCountsRequest = loadAppointmentCounts(db, businessIds, fourteenDaysAgo, sevenDaysAgo, thirtyDaysAgo);
    const userCountRequest = getCountFromServer(collection(db, "users")).then((snapshot) => snapshot.data().count);
    const hideRequestCountRequest = getCountFromServer(query(collectionGroup(db, "reviews"), where("hideRequest.status", "==", "pending")))
      .then((snapshot) => snapshot.data().count).catch(() => 0);
    const alerts = collection(db, "platformAlerts");
    const alertCountsRequest = Promise.all([
      getCountFromServer(query(alerts, where("isRead", "==", false))),
      getCountFromServer(query(alerts, where("isRead", "==", false), where("severity", "==", "critical"))),
      // Kalıcı SMS hataları backend tarafından platformAlerts'e "sms" kategorisiyle yazılır.
      getCountFromServer(query(alerts, where("isRead", "==", false), where("category", "==", "sms"))).catch(() => null),
    ]).then(([unread, critical, sms]) => ({ unread: unread.data().count, critical: critical.data().count, sms: sms?.data().count ?? 0 }))
      .catch(() => ({ unread: 0, critical: 0, sms: 0 }));
    const plansRequest = listPlatformPlansWithSource().catch(() => ({ plans: [defaultPlatformPlan()], fromFallback: true }));
    const adminUidsRequest = getDocs(collection(db, "platformAdmins")).then((snapshot) => snapshot.docs.map((item) => item.id)).catch(() => [] as string[]);
    const purchaseRequestsRequest = getDocs(collection(db, "subscriptionPurchaseRequests")).then((snapshot) => snapshot.docs).catch(() => [] as DataDoc[]);
    const requests = {
      users: userCountRequest.then((): DataDoc[] => []),
      businesses: Promise.resolve(businessDocs as DataDoc[]),
      appointments: appointmentCountsRequest.then((): DataDoc[] => []),
      subscriptions: withFallback(
        getDocs(collection(db, "subscriptions")),
        () => readBusinessSubscriptions(db, businessIds),
      ),
      support: getDocs(query(collection(db, "supportTickets"), where("status", "in", SUPPORT_NEEDS_ADMIN_STATUSES))).then((snapshot) => snapshot.docs as DataDoc[]),
      categories: getDocs(query(collection(db, "categoryRequests"), where("status", "==", "pending"))).then((snapshot) => snapshot.docs as DataDoc[]),
      reviews: withFallback(
        getDocs(query(collectionGroup(db, "reviews"), where("status", "==", "pending"), limit(250))),
        async () => (await readBusinessChildren(db, businessIds, "reviews")).filter((item) => String(item.data().status ?? "") === "pending").slice(0, 250),
      ),
    };
    try {
      const keys = Object.keys(requests) as SourceKey[];
      const settled = await Promise.allSettled(keys.map((key) => requests[key]));
      const result = Object.fromEntries(keys.map((key, index) => [key, settled[index]])) as Record<SourceKey, PromiseSettledResult<DataDoc[]>>;
      const sourceHealth = Object.fromEntries(keys.map((key) => [key, result[key].status === "fulfilled"])) as SourceHealth;
      const docs = (key: SourceKey): DataDoc[] => { const item = result[key]; return item.status === "fulfilled" ? item.value : []; };
      if (!Object.values(sourceHealth).some(Boolean)) throw new Error("Platform verilerine erişilemedi.");

      const businessInfo = new Map<string, { organizationId: string | null; ownerUid: string }>();
      let activeBusinesses = 0, suspendedBusinesses = 0, pendingBusinesses = 0, newBusinesses30 = 0, newBusinessesPrev30 = 0;
      const recent: RecentBusiness[] = [];
      businessDocs.forEach((item) => {
        const data = item.data(); const status = String(data.status ?? "");
        businessInfo.set(item.id, { organizationId: typeof data.organizationId === "string" ? data.organizationId : null, ownerUid: String(data.ownerUid ?? "") });
        const suspended = data.isSuspended === true || status === "suspended";
        if (suspended) suspendedBusinesses++;
        else if (status === "pending_review" || data.approvalStatus === "pending") pendingBusinesses++;
        else if (status === "active") activeBusinesses++;
        const createdAt = dateFrom(data.createdAt);
        if (createdAt && createdAt.getTime() >= thirtyDaysAgo) newBusinesses30++;
        else if (createdAt && createdAt.getTime() >= sixtyDaysAgo) newBusinessesPrev30++;
        recent.push({ id: item.id, name: String(data.name ?? "İsimsiz"), city: String(data.city ?? ""), category: String(data.category ?? ""), status: suspended ? "suspended" : status, createdAt });
      });
      recent.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

      const appointmentCounts = await appointmentCountsRequest.catch((): AppointmentCounts => ({ total: 0, last7: 0, prev7: null, last30: 0, completed: 0, cancelled: 0, noShow: 0 }));
      const [{ plans, fromFallback }, adminUidList, purchaseDocs, alertCounts] = await Promise.all([plansRequest, adminUidsRequest, purchaseRequestsRequest, alertCountsRequest]);

      // Yıllık/aylık döngü: tamamlanan satın alma talebinden okunur; bilinmiyorsa aylık sayılır.
      const billingCycle = new Map<string, "monthly" | "yearly">();
      let pendingPurchases = 0;
      purchaseDocs.forEach((item) => {
        const data = item.data();
        const businessId = String(data.businessId ?? item.id ?? "");
        if (data.status === "pending_payment") pendingPurchases++;
        if (data.status === "completed") billingCycle.set(businessId, data.billingCycle === "yearly" ? "yearly" : "monthly");
      });

      let trialingBusinesses = 0, subscribedBusinesses = 0, pastDueSubscriptions = 0, expiringSoon = 0;
      const revenueInputs: RevenueSubscriptionInput[] = [];
      docs("subscriptions").forEach((item) => {
        const data = item.data();
        const status = String(data.status ?? "");
        const businessId = String(data.businessId ?? item.id ?? "");
        const info = businessInfo.get(businessId);
        const isLifetime = data.isLifetime === true || data.accessMode === "lifetime";
        if (status === "trialing") trialingBusinesses++;
        if (status === "active") subscribedBusinesses++;
        if (status === "past_due") pastDueSubscriptions++;
        const end = dateFrom(status === "trialing" ? data.trialEndsAt : data.subscriptionEndsAt);
        if (!isLifetime && (status === "active" || status === "trialing") && end && end.getTime() >= now && end.getTime() - now <= 7 * day) expiringSoon++;
        revenueInputs.push({
          businessId, organizationId: info?.organizationId ?? (typeof data.organizationId === "string" ? data.organizationId : null),
          plan: String(data.plan ?? "RANDEVUGO"), status, isLifetime, ownerUid: info?.ownerUid ?? String(data.userId ?? ""),
          billingCycle: billingCycle.get(businessId),
        });
      });
      const adminUids = new Set(adminUidList);
      if (viewerUid) adminUids.add(viewerUid);
      const fallbackPlan = plans.find((plan) => plan.id === "RANDEVUGO") ?? defaultPlatformPlan();
      const revenue = estimateRecurringRevenue(revenueInputs, plans as PlatformPlan[], fallbackPlan, adminUids);

      const supportTickets = docs("support");
      setStats({
        totalBusinesses: businessDocs.length, activeBusinesses, suspendedBusinesses, pendingBusinesses, newBusinesses30, newBusinessesPrev30,
        totalUsers: await userCountRequest.catch(() => 0), totalAppointments: appointmentCounts.total,
        appointmentsLast7Days: appointmentCounts.last7, appointmentsPrev7Days: appointmentCounts.prev7, appointmentsLast30Days: appointmentCounts.last30,
        completedAppointments: appointmentCounts.completed, cancelledAppointments: appointmentCounts.cancelled, noShowAppointments: appointmentCounts.noShow,
        trialingBusinesses, subscribedBusinesses, pastDueSubscriptions, expiringSoon,
        openSupportTickets: supportTickets.length,
        // Backend öncelik yazmadığı için "kritik" yerine 24 saati aşan, ekip yanıtı bekleyen talepler sayılır.
        staleSupportTickets: supportTickets.filter((item) => {
          const data = item.data();
          const lastActivity = dateFrom(data.updatedAt) ?? dateFrom(data.createdAt);
          return isStaleSupportTicket(String(data.status ?? ""), lastActivity ? lastActivity.getTime() : null, now);
        }).length,
        pendingCategoryRequests: docs("categories").length, pendingReviews: docs("reviews").length,
        pendingHideRequests: await hideRequestCountRequest,
        unreadAlerts: alertCounts.unread, criticalUnreadAlerts: alertCounts.critical, unreadSmsAlerts: alertCounts.sms, pendingPurchases,
        estimatedMRR: revenue.mrr, estimatedARR: revenue.arr, payingAccounts: revenue.payingAccounts,
        skippedLifetime: revenue.skippedLifetime, skippedAdmin: revenue.skippedAdmin,
        plansFromFallback: fromFallback, recentBusinesses: recent.slice(0, 6),
        sourceHealth, updatedAt: new Date(),
      });
    } catch (error) { setFatalError((error as Error).message || "Platform özeti yüklenemedi."); }
    finally { setLoading(false); }
  }, [viewerUid]);

  useEffect(() => { queueMicrotask(() => { void loadDashboard(); }); }, [loadDashboard]);

  const insights = useMemo(() => {
    if (!stats) return null;
    const activeRate = stats.totalBusinesses > 0 ? stats.activeBusinesses / stats.totalBusinesses * 100 : 0;
    const outcomeBase = stats.completedAppointments + stats.cancelledAppointments + stats.noShowAppointments;
    const problemRate = outcomeBase > 0 ? (stats.cancelledAppointments + stats.noShowAppointments) / outcomeBase * 100 : 0;
    return { activeRate, problemRate, outcomeBase };
  }, [stats]);

  function exportSnapshot() {
    if (!stats) return;
    const rows: Array<[string, string | number]> = [
      ["Metrik", "Değer"], ["Rapor zamanı", stats.updatedAt.toLocaleString("tr-TR")],
      ["Toplam işletme", stats.totalBusinesses], ["Aktif işletme", stats.activeBusinesses], ["Onay bekleyen işletme", stats.pendingBusinesses],
      ["Son 30 gün yeni işletme", stats.newBusinesses30], ["Toplam kullanıcı", stats.totalUsers], ["Toplam randevu", stats.totalAppointments],
      ["Son 7 gün randevu", stats.appointmentsLast7Days], ["Son 30 gün randevu", stats.appointmentsLast30Days],
      ["Aktif abonelik", stats.subscribedBusinesses], ["Ödeyen hesap", stats.payingAccounts], ["Ödeme bekleyen", stats.pastDueSubscriptions],
      ["Tahmini MRR", stats.estimatedMRR], ["Tahmini ARR", stats.estimatedARR],
      ["Yanıt bekleyen destek kaydı", stats.openSupportTickets], ["24 saati aşan destek", stats.staleSupportTickets],
      ["Gizleme talebi", stats.pendingHideRequests], ["Okunmamış uyarı", stats.unreadAlerts], ["Okunmamış SMS hatası", stats.unreadSmsAlerts],
    ];
    const blob = new Blob(["﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `seninrandevun-platform-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  const headerActions = <>
    <AdminButton variant="glass" icon={Download} onClick={exportSnapshot} disabled={!stats}>CSV</AdminButton>
    <AdminButton variant="lime" icon={RefreshCw} loading={loading} onClick={() => void loadDashboard()}>Yenile</AdminButton>
  </>;
  const header = (
    <PageHeader
      eyebrow="Platform özeti"
      title="Platform komuta merkezi"
      description={stats ? `Son güncelleme ${stats.updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · Gerçek zamanlı sayımlar, sunucu tarafında hesaplanır.` : "Platform verileri hazırlanıyor…"}
      actions={headerActions}
    />
  );

  if (loading && !stats) return <AdminPage>{header}<DashboardSkeleton /></AdminPage>;
  if (fatalError && !stats) {
    return <AdminPage>{header}<Panel><EmptyState icon={WifiOff} title="Platform özeti açılamadı" description={fatalError} action={<AdminButton variant="primary" icon={RefreshCw} onClick={() => void loadDashboard()}>Yeniden dene</AdminButton>} /></Panel></AdminPage>;
  }
  if (!stats || !insights) return null;

  const degradedSources = (Object.keys(stats.sourceHealth) as SourceKey[]).filter((key) => !stats.sourceHealth[key]);
  const attention: Array<{ label: string; detail: string; count: number; href: string; icon: LucideIcon; tone: AdminTone }> = [
    { label: "İşletme onayı", detail: "Yayına alınmayı bekleyen mağazalar", count: stats.pendingBusinesses, href: "/super-admin/isletmeler?durum=pending", icon: Building2, tone: "amber" },
    { label: "Kritik uyarı", detail: "Okunmamış kritik platform uyarıları", count: stats.criticalUnreadAlerts, href: "/super-admin/uyarilar", icon: Siren, tone: "red" },
    { label: "Başarısız SMS", detail: "Kalıcı olarak gönderilemeyen SMS uyarıları", count: stats.unreadSmsAlerts, href: "/super-admin/uyarilar", icon: MessageSquareWarning, tone: "red" },
    { label: "24 saati aşan destek", detail: `${fmt(stats.openSupportTickets)} talep ekip yanıtı bekliyor`, count: stats.staleSupportTickets, href: "/super-admin/destek", icon: Headphones, tone: "red" },
    { label: "Yorum gizleme talebi", detail: "İşletmelerin gizlenmesini istediği yorumlar", count: stats.pendingHideRequests, href: "/super-admin/moderasyon", icon: EyeOff, tone: "violet" },
    { label: "Ödeme onayı", detail: "Satın alma talebi ödeme kontrolü bekliyor", count: stats.pendingPurchases, href: "/super-admin/abonelikler", icon: CreditCard, tone: "blue" },
    { label: "Ödeme gecikmesi", detail: "past_due durumundaki abonelikler", count: stats.pastDueSubscriptions, href: "/super-admin/abonelikler", icon: WalletCards, tone: "amber" },
    { label: "Yorum moderasyonu", detail: "Yayın kararı bekleyen yorumlar", count: stats.pendingReviews, href: "/super-admin/moderasyon", icon: ShieldAlert, tone: "violet" },
    { label: "Kategori isteği", detail: "Yeni kategori önerileri", count: stats.pendingCategoryRequests, href: "/super-admin/moderasyon", icon: Sparkles, tone: "blue" },
  ];
  const open = attention.filter((item) => item.count > 0).sort((a, b) => (b.tone === "red" ? 1 : 0) - (a.tone === "red" ? 1 : 0));
  const clear = attention.filter((item) => item.count === 0);
  const appointmentTrend = pctChange(stats.appointmentsLast7Days, stats.appointmentsPrev7Days);
  const businessTrend = pctChange(stats.newBusinesses30, stats.newBusinessesPrev30);

  return (
    <AdminPage>
      {header}

      {degradedSources.length > 0 && (
        <Callout tone="amber" icon={WifiOff} title="Kısmi veri gösteriliyor">
          <span className="mt-1 flex flex-wrap gap-1.5">{degradedSources.map((key) => <Badge key={key} size="sm">{SOURCE_LABELS[key]}</Badge>)}</span>
        </Callout>
      )}
      {stats.plansFromFallback && (
        <Callout tone="blue" icon={PackagePlus} title="Paket koleksiyonu boş" action={<AdminButton size="sm" variant="primary" href="/super-admin/abonelikler">Paketi oluştur</AdminButton>}>
          Gelir tahmini varsayılan SeninRandevun fiyatıyla (500 ₺/ay) hesaplanıyor. Abonelikler sayfasından varsayılan paketi kalıcı olarak oluşturun.
        </Callout>
      )}

      <StatGrid columns={4}>
        <StatCard label="Aktif işletme" value={fmt(stats.activeBusinesses)} icon={Building2} tone="green" href="/super-admin/isletmeler"
          trend={businessTrend === null ? null : { value: businessTrend, label: "son 30 gün yeni işletme, önceki 30 güne göre" }}
          hint={`${fmt(stats.newBusinesses30)} yeni · ${fmt(stats.totalBusinesses)} toplam`} />
        <StatCard label="Randevu (7 gün)" value={fmt(stats.appointmentsLast7Days)} icon={CalendarDays} tone="violet"
          trend={appointmentTrend === null ? null : { value: appointmentTrend, label: "önceki 7 güne göre" }}
          hint={`${fmt(stats.appointmentsLast30Days)} / 30 gün`} />
        <StatCard label="Tahmini MRR" value={`${fmt(stats.estimatedMRR)} ₺`} icon={TrendingUp} tone="lime" href="/super-admin/abonelikler"
          hint={`${fmt(stats.payingAccounts)} ödeyen hesap · ARR ${fmt(stats.estimatedARR)} ₺`} />
        <StatCard label="Kullanıcı" value={fmt(stats.totalUsers)} icon={UsersRound} tone="blue" href="/super-admin/kullanicilar"
          hint={`${fmt(stats.trialingBusinesses)} işletme denemede`} />
      </StatGrid>

      <div className={styles.split}>
        <Panel
          title="Dikkat merkezi"
          description={open.length ? `${open.length} başlık aksiyon bekliyor` : "Her şey yolunda — bekleyen işlem yok."}
          actions={stats.unreadAlerts > 0 ? <AdminButton size="sm" variant="secondary" icon={BellRing} href="/super-admin/uyarilar">{fmt(stats.unreadAlerts)} uyarı</AdminButton> : undefined}
          flush
        >
          {open.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Kuyruk temiz" description="Onay, destek, moderasyon ve ödeme kuyruklarında bekleyen iş yok." compact />
          ) : (
            <ul className={styles.attention}>
              {open.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={styles.attentionRow}>
                    <span className={`${styles.attentionIcon} ${toneClassName(item.tone)}`}><item.icon size={18} aria-hidden /></span>
                    <span className="min-w-0 flex-1"><b className={styles.attentionTitle}>{item.label}</b><span className={styles.attentionDetail}>{item.detail}</span></span>
                    <b className={`${styles.attentionCount} ${toneClassName(item.tone)}`}>{fmt(item.count)}</b>
                    <ArrowRight size={15} className={styles.attentionArrow} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {clear.length > 0 && (
            <div className={styles.clearRow}>
              <CheckCircle2 size={14} aria-hidden /> Temiz: {clear.map((item) => item.label).join(", ")}
            </div>
          )}
        </Panel>

        <Panel title="Hızlı işlemler" description="Sık kullanılan platform operasyonları">
          <div className={styles.quickGrid}>
            {[
              { title: "Onay bekleyenler", detail: `${fmt(stats.pendingBusinesses)} işletme`, href: "/super-admin/isletmeler?durum=pending", icon: Building2 },
              { title: "Destek kuyruğu", detail: `${fmt(stats.openSupportTickets)} yanıt bekliyor`, href: "/super-admin/destek", icon: Headphones },
              { title: "Moderasyon", detail: `${fmt(stats.pendingReviews + stats.pendingHideRequests + stats.pendingCategoryRequests)} bekleyen`, href: "/super-admin/moderasyon", icon: ShieldAlert },
              { title: "Abonelikler", detail: `${fmt(stats.expiringSoon)} yakında doluyor`, href: "/super-admin/abonelikler", icon: WalletCards },
            ].map((item) => (
              <Link key={item.title} href={item.href} className={styles.quick}>
                <item.icon size={19} aria-hidden />
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className={styles.split}>
        <Panel title="Son kaydolan işletmeler" description="En yeni 6 mağaza" actions={<AdminButton size="sm" variant="ghost" href="/super-admin/isletmeler" icon={ArrowRight}>Tümü</AdminButton>} flush>
          {stats.recentBusinesses.length === 0 ? <EmptyState title="Henüz işletme yok" compact /> : (
            <ul className={styles.recent}>
              {stats.recentBusinesses.map((business) => {
                const badge = STATUS_BADGE[business.status] ?? { label: business.status || "—", tone: "neutral" as AdminTone };
                return (
                  <li key={business.id}>
                    <Link href={`/super-admin/isletmeler?q=${encodeURIComponent(business.id)}&ac=1`} className={styles.recentRow}>
                      <span className={styles.avatar} aria-hidden>{business.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
                      <span className="min-w-0 flex-1">
                        <b className={styles.attentionTitle}>{business.name}</b>
                        <span className={styles.attentionDetail}>{[business.city, business.category].filter(Boolean).join(" · ") || "Konum yok"}</span>
                      </span>
                      <span className={styles.recentMeta}>
                        <Badge tone={badge.tone} size="sm" dot>{badge.label}</Badge>
                        <small>{business.createdAt ? business.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—"}</small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Randevu sonuçları" description={`${fmt(stats.totalAppointments)} randevunun durum dağılımı`}>
          <div className={styles.outcomes}>
            <Outcome label="Tamamlandı" value={stats.completedAppointments} total={insights.outcomeBase} icon={CheckCircle2} tone="green" />
            <Outcome label="İptal" value={stats.cancelledAppointments} total={insights.outcomeBase} icon={AlertTriangle} tone="amber" />
            <Outcome label="Gelmedi" value={stats.noShowAppointments} total={insights.outcomeBase} icon={Clock3} tone="red" />
          </div>
          <p className={styles.footnote}>
            Aktif işletme oranı %{insights.activeRate.toFixed(1)} · İptal/gelmedi oranı %{insights.problemRate.toFixed(1)}
            {stats.skippedLifetime + stats.skippedAdmin > 0 && ` · MRR'ye ${fmt(stats.skippedLifetime + stats.skippedAdmin)} süresiz/yönetici aboneliği dahil edilmedi`}
          </p>
        </Panel>
      </div>
    </AdminPage>
  );
}

function Outcome({ label, value, total, icon: Icon, tone }: { label: string; value: number; total: number; icon: LucideIcon; tone: AdminTone }) {
  const share = total > 0 ? value / total * 100 : 0;
  return (
    <div className={styles.outcome}>
      <span className={`${styles.attentionIcon} ${toneClassName(tone)}`}><Icon size={16} aria-hidden /></span>
      <b>{fmt(value)}</b>
      <span>{label}</span>
      <i className={styles.bar}><i className={toneClassName(tone)} style={{ width: `${share}%` }} /></i>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Platform verileri yükleniyor">
      <StatGrid columns={4}>{Array.from({ length: 4 }).map((_, index) => <StatCard key={index} label="—" value="" loading />)}</StatGrid>
      <div className={styles.split}><Skeleton height={320} radius={22} /><Skeleton height={320} radius={22} /></div>
    </div>
  );
}
