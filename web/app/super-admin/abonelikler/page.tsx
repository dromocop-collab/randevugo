"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { collection, doc, getDoc, getDocs, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import {
  BadgeCheck, CalendarClock, CircleAlert, Clock3, Copy, Crown, PackagePlus, PencilLine, Plus, ReceiptText,
  RefreshCw, Save, Store, Trash2, UsersRound, WalletCards,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS } from "@/constants/subscription-entitlements";
import {
  DEFAULT_PLATFORM_PLAN_ID, defaultPlatformPlan, ensureDefaultPlatformPlans, isLegacyPlanId, listPlatformPlansWithSource,
  planDisplayLabel, refreshPublicPricingPages, removePlatformPlan, savePlatformPlan, type PlatformPlan,
} from "@/features/subscriptions/platform-plan-repository";
import { backfillLegacyBusinessSubscriptions, completeSubscriptionPurchase, deleteBusinessPermanently, ensureAdminOwnedBusinessesLifetime, updateBusinessSubscription, type AdminSubscriptionMode } from "@/features/subscriptions/admin-subscription-repository";
import { getDb } from "@/lib/firebase/firestore";
import type { PaymentProviderKey, SubscriptionStatus } from "@/types/subscription";
import {
  AdminButton, AdminPage, Badge, Callout, ConfirmSheet, DataTable, EmptyState, PageHeader, Panel, SearchField,
  SegmentedControl, SelectField, Sheet, StatCard, StatGrid, Toolbar, type AdminTone, type DataColumn,
} from "@/components/super-admin/ui";
import styles from "./subscriptions.module.css";

type SubscriptionRow = {
  id: string;
  businessId: string;
  businessName: string;
  ownerUid: string;
  plan: string;
  status: SubscriptionStatus;
  paymentProvider: PaymentProviderKey;
  renewalEnabled: boolean;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  accessMode: "timed" | "lifetime";
  isLifetime: boolean;
};

type PurchaseRequestRow = { businessId: string; businessName: string; planId: string; planLabel: string; billingCycle: "monthly" | "yearly"; amount: number; currency: string; status: string; updatedAt?: string };
type SubFilter = "all" | "active" | "trialing" | "expiring" | "closed" | "lifetime";

function readDate(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  return undefined;
}

function mapSubscription(id: string, data: DocumentData, businesses: Map<string, { name: string; ownerUid: string }>): SubscriptionRow {
  const businessId = String(data.businessId ?? id);
  const business = businesses.get(businessId);
  const isLifetime = data.isLifetime === true || data.accessMode === "lifetime";
  return { id, businessId, businessName: business?.name ?? "İşletme kaydı bulunamadı", ownerUid: business?.ownerUid ?? "", plan: String(data.plan ?? DEFAULT_PLATFORM_PLAN_ID), status: String(data.status ?? "trialing") as SubscriptionStatus, paymentProvider: String(data.paymentProvider ?? "manual") as PaymentProviderKey, renewalEnabled: data.renewalEnabled === true, trialEndsAt: readDate(data.trialEndsAt), subscriptionEndsAt: readDate(data.subscriptionEndsAt), accessMode: isLifetime ? "lifetime" : "timed", isLifetime };
}

type BusinessDocs = QuerySnapshot<DocumentData>["docs"];

// Abonelikler tek koleksiyon okumasıyla alınır; işletme başına getDoc yalnızca liste okuması hata verirse kullanılır.
async function fetchSubscriptions(businessDocs: BusinessDocs): Promise<SubscriptionRow[]> {
  const db = getDb();
  const businesses = new Map(businessDocs.map((item) => [item.id, { name: String(item.data().name ?? "İsimsiz işletme"), ownerUid: String(item.data().ownerUid ?? "") }]));
  const placeholder = (business: BusinessDocs[number]) => mapSubscription(business.id, { businessId: business.id, status: "expired", plan: business.data().plan ?? DEFAULT_PLATFORM_PLAN_ID, paymentProvider: "manual" }, businesses);
  try {
    const subscriptionSnapshot = await getDocs(collection(db, "subscriptions"));
    const subscriptionsByBusiness = new Map(subscriptionSnapshot.docs.map((item) => [String(item.data().businessId ?? item.id), item]));
    const rows = businessDocs.map((business) => {
      const subscription = subscriptionsByBusiness.get(business.id);
      return subscription ? mapSubscription(subscription.id, subscription.data(), businesses) : placeholder(business);
    });
    const orphaned = subscriptionSnapshot.docs
      .filter((item) => !businesses.has(String(item.data().businessId ?? item.id)))
      .map((item) => mapSubscription(item.id, item.data(), businesses));
    return [...rows, ...orphaned];
  } catch {
    const snapshots = await Promise.all(businessDocs.map((business) => getDoc(doc(db, "subscriptions", business.id))));
    return snapshots.map((item, index) => item.exists() ? mapSubscription(item.id, item.data(), businesses) : placeholder(businessDocs[index]));
  }
}

async function fetchPurchaseRequests(businessDocs: BusinessDocs): Promise<PurchaseRequestRow[]> {
  const requests = await getDocs(collection(getDb(), "subscriptionPurchaseRequests"));
  const names = new Map(businessDocs.map((item) => [item.id, String(item.data().name ?? "İsimsiz işletme")]));
  return requests.docs.map((item) => { const data = item.data(); const businessId = String(data.businessId ?? item.id); return { businessId, businessName: names.get(businessId) ?? "İşletme", planId: String(data.planId ?? ""), planLabel: String(data.planLabel ?? data.planId ?? "Paket"), billingCycle: data.billingCycle === "yearly" ? "yearly" : "monthly", amount: Number(data.amount ?? 0), currency: String(data.currency ?? "TRY"), status: String(data.status ?? "pending_payment"), updatedAt: readDate(data.updatedAt) }; });
}

// Eski kayıt göçü ve yönetici süresiz erişim eşitlemesi her ziyarette değil, tarayıcı oturumu başına bir kez çalışır.
const SUBSCRIPTION_SYNC_SESSION_KEY = "superAdmin.subscriptionSync.v1";
function subscriptionSyncDoneThisSession(): boolean {
  try { return window.sessionStorage.getItem(SUBSCRIPTION_SYNC_SESSION_KEY) === "done"; } catch { return false; }
}
function markSubscriptionSyncDone() {
  try { window.sessionStorage.setItem(SUBSCRIPTION_SYNC_SESSION_KEY, "done"); } catch { /* depolama kapalıysa bellek içi bayrak yeterli */ }
}

function subscriptionEnd(item: SubscriptionRow) {
  return item.status === "trialing" ? item.trialEndsAt : item.subscriptionEndsAt;
}

function remainingDays(item: SubscriptionRow, now: number): number | null {
  if (item.isLifetime) return null;
  const end = subscriptionEnd(item);
  if (!end) return Number.NaN;
  return Math.ceil((new Date(end).getTime() - now) / 86_400_000);
}

const STATUS_PILL: Record<SubscriptionStatus, { label: string; tone: AdminTone }> = {
  trialing: { label: "Deneme", tone: "amber" },
  active: { label: "Aktif", tone: "green" },
  past_due: { label: "Ödeme bekliyor", tone: "red" },
  cancelled: { label: "İptal", tone: "neutral" },
  expired: { label: "Süresi doldu", tone: "red" },
};

const freshPlan = (): PlatformPlan => { const { isFallback: _ignored, ...plan } = defaultPlatformPlan(); void _ignored; return plan; };

export default function SuperAdminSubscriptionsPage() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [plansFromFallback, setPlansFromFallback] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestRow[]>([]);
  const [editing, setEditing] = useState<PlatformPlan>(freshPlan);
  const [busy, setBusy] = useState(false);
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PlatformPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [searchText, setSearchText] = useState("");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [subscriptionEditor, setSubscriptionEditor] = useState<SubscriptionRow | null>(null);
  const [subscriptionMode, setSubscriptionMode] = useState<AdminSubscriptionMode>("active");
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState(DEFAULT_PLATFORM_PLAN_ID);
  const [businessDeleteCandidate, setBusinessDeleteCandidate] = useState<SubscriptionRow | null>(null);
  const [businessDeleteConfirmation, setBusinessDeleteConfirmation] = useState("");
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const adminLifetimeSynced = useRef(false);

  function startNewPlan(source?: PlatformPlan) {
    setEditingPlanId(null);
    setEditing(source
      ? { ...source, isFallback: undefined, id: `${source.id}_KOPYA`, label: `${source.label} Kopya`, isRecommended: false, features: [...source.features], entitlements: [...source.entitlements] }
      : { ...freshPlan(), id: "", label: "", isRecommended: false });
    setPlanEditorOpen(true);
  }

  function startEditing(plan: PlatformPlan) {
    // Yerleşik (kaydedilmemiş) paket düzenlenirse kaydetme işlemi onu oluşturur.
    setEditingPlanId(plan.isFallback ? null : plan.id);
    setEditing({ ...plan, isFallback: undefined, features: [...plan.features], entitlements: plan.entitlements.length ? [...plan.entitlements] : [...ALL_SUBSCRIPTION_ENTITLEMENTS] });
    setPlanEditorOpen(true);
  }

  const reload = useCallback(async (syncAdminLifetime = false) => {
    setLoading(true);
    setLoadWarning("");
    if (syncAdminLifetime && !adminLifetimeSynced.current && !subscriptionSyncDoneThisSession()) {
      try {
        // Sıralı kalmalı: göç, abonelik belgesi olmayan işletmeye (merge'süz) deneme kaydı yazar;
        // eşitleme ile paralel koşarsa yöneticinin yeni yazılan süresiz erişimini ezebilir.
        await ensureAdminOwnedBusinessesLifetime();
        await backfillLegacyBusinessSubscriptions();
        adminLifetimeSynced.current = true;
        markSubscriptionSyncDone();
      } catch {
        setLoadWarning("Yönetici hesabına ait işletmelerin süresiz erişimi eşitlenemedi. Yeniden deneyin.");
      }
    }
    // İşletmeler tek seferde okunur; abonelik ve satın alma talepleri aynı listeyi paylaşır.
    const businessRequest = getDocs(collection(getDb(), "businesses")).then((snapshot) => snapshot.docs);
    const [planResult, subscriptionResult, purchaseResult] = await Promise.allSettled([
      listPlatformPlansWithSource(),
      businessRequest.then(fetchSubscriptions),
      businessRequest.then(fetchPurchaseRequests),
    ]);
    if (planResult.status === "fulfilled") { setPlans(planResult.value.plans); setPlansFromFallback(planResult.value.fromFallback); }
    else { setPlans([defaultPlatformPlan()]); setPlansFromFallback(true); }
    setSubscriptions(subscriptionResult.status === "fulfilled" ? subscriptionResult.value : []);
    setPurchaseRequests(purchaseResult.status === "fulfilled" ? purchaseResult.value : []);
    if (planResult.status === "rejected" || subscriptionResult.status === "rejected" || purchaseResult.status === "rejected") setLoadWarning("Bazı canlı abonelik verilerine erişilemedi. Yetkileri kontrol edip yeniden deneyin.");
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void reload(true); });
  }, [reload]);

  async function createDefaultPlan() {
    setCreatingDefault(true);
    try {
      const result = await ensureDefaultPlatformPlans();
      toast.success(result.created ? "Varsayılan SeninRandevun paketi oluşturuldu." : "Varsayılan paket zaten mevcut.");
      void refreshPublicPricingPages();
      await reload();
    } catch (error) {
      toast.error((error as Error).message || "Varsayılan paket oluşturulamadı.");
    } finally {
      setCreatingDefault(false);
    }
  }

  function openSubscriptionEditor(item: SubscriptionRow) {
    const mode: AdminSubscriptionMode = item.isLifetime ? "lifetime" : item.status;
    const end = subscriptionEnd(item);
    setSubscriptionEditor(item);
    setSubscriptionMode(mode);
    setSubscriptionPlanId(isLegacyPlanId(item.plan) ? DEFAULT_PLATFORM_PLAN_ID : item.plan);
    setSubscriptionEndDate(end ? new Date(end).toISOString().slice(0, 10) : "");
  }

  function addSubscriptionDays(days: number) {
    const current = subscriptionEndDate ? new Date(`${subscriptionEndDate}T23:59:59`).getTime() : 0;
    const base = Math.max(Date.now(), current);
    setSubscriptionMode("active");
    setSubscriptionEndDate(new Date(base + days * 86_400_000).toISOString().slice(0, 10));
  }

  async function saveSubscriptionAccess() {
    if (!subscriptionEditor) return;
    const timed = subscriptionMode === "active" || subscriptionMode === "trialing";
    const endAtMillis = subscriptionEndDate ? new Date(`${subscriptionEndDate}T23:59:59`).getTime() : undefined;
    if (timed && (!endAtMillis || endAtMillis <= Date.now())) {
      toast.error("Aktif veya deneme erişimi için gelecekte bir bitiş tarihi seçin.");
      return;
    }
    setBusy(true);
    try {
      const result = await updateBusinessSubscription({ businessId: subscriptionEditor.businessId, mode: subscriptionMode, planId: subscriptionPlanId, ...(timed && endAtMillis ? { endAtMillis } : {}) });
      toast.success(subscriptionMode === "lifetime" ? `Süresiz erişim tanımlandı (${result.affectedBranches} mağaza).` : `Abonelik güncellendi (${result.affectedBranches} mağaza).`);
      setSubscriptionEditor(null);
      await reload();
    } catch (error) {
      toast.error((error as Error).message || "Abonelik güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(editing.yearlyPrice) || !Number.isFinite(editing.monthlyPrice) || editing.yearlyPrice < 0 || editing.monthlyPrice < 0) { toast.error("Fiyatlar sıfır veya daha büyük olmalıdır."); return; }
    if (!Number.isInteger(editing.maxStores) || editing.maxStores < 1 || editing.maxStores > 25) { toast.error("Şube limiti 1–25 arasında olmalıdır."); return; }
    if (!Number.isInteger(editing.maxStaff) || editing.maxStaff < 1) { toast.error("Çalışan limiti en az 1 olmalıdır."); return; }
    if (editing.entitlements.length === 0) { toast.error("Pakete en az bir kullanılabilir özellik seçin."); return; }
    setBusy(true);
    try { await savePlatformPlan({ ...editing, id: editing.id.trim(), label: editing.label.trim(), description: editing.description.trim() }); setPlanEditorOpen(false); await reload(); toast.success(editingPlanId ? "Paket değişiklikleri kaydedildi." : "Paket oluşturuldu.", { description: editing.isActive ? "Fiyat sayfası güncelleniyor (en geç 1 dakika)." : "Paket satışta değil; fiyat sayfasında gösterilmez." }); setEditingPlanId(editing.id); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function confirmDeletePlan() {
    if (!deleteCandidate) return;
    const assignedCount = subscriptions.filter((item) => item.plan === deleteCandidate.id).length;
    if (assignedCount > 0) { toast.error(`Bu paket ${assignedCount} abonelikte kullanılıyor. Önce abonelikleri başka pakete taşıyın.`); return; }
    setBusy(true);
    try {
      await removePlatformPlan(deleteCandidate.id);
      setDeleteCandidate(null);
      await reload();
      toast.success("Paket silindi.");
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  async function approvePurchase(businessId: string) {
    setBusy(true);
    try { const result = await completeSubscriptionPurchase(businessId); toast.success(`Ödeme onaylandı; paket ${result.affectedBranches} şubeye açıldı.`); await reload(); }
    catch (error) { toast.error((error as Error).message || "Paket talebi tamamlanamadı."); }
    finally { setBusy(false); }
  }

  async function confirmBusinessDelete() {
    if (!businessDeleteCandidate || businessDeleteConfirmation.trim().toLocaleUpperCase("tr-TR") !== "EVET") return;
    setBusy(true);
    try { await deleteBusinessPermanently(businessDeleteCandidate.businessId, businessDeleteConfirmation); toast.success("İşletme ve bağlı kayıtları kalıcı olarak silindi."); setBusinessDeleteCandidate(null); setBusinessDeleteConfirmation(""); await reload(); }
    catch (error) { toast.error((error as Error).message || "İşletme silinemedi."); }
    finally { setBusy(false); }
  }

  const isExpiring = useCallback((item: SubscriptionRow) => {
    const days = remainingDays(item, renderedAt);
    return days !== null && Number.isFinite(days) && days >= 0 && days <= 7 && (item.status === "active" || item.status === "trialing");
  }, [renderedAt]);
  const isClosed = (item: SubscriptionRow) => !item.isLifetime && ["past_due", "expired", "cancelled"].includes(item.status);

  const counts = useMemo(() => ({
    all: subscriptions.length,
    active: subscriptions.filter((item) => item.status === "active" && !item.isLifetime).length,
    trialing: subscriptions.filter((item) => item.status === "trialing").length,
    expiring: subscriptions.filter(isExpiring).length,
    closed: subscriptions.filter(isClosed).length,
    lifetime: subscriptions.filter((item) => item.isLifetime).length,
  }), [isExpiring, subscriptions]);

  const visibleSubscriptions = useMemo(() => {
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return subscriptions.filter((item) => {
      if (subFilter === "active" && !(item.status === "active" && !item.isLifetime)) return false;
      if (subFilter === "trialing" && item.status !== "trialing") return false;
      if (subFilter === "expiring" && !isExpiring(item)) return false;
      if (subFilter === "closed" && !isClosed(item)) return false;
      if (subFilter === "lifetime" && !item.isLifetime) return false;
      return !q || [item.businessName, item.businessId, item.plan, planDisplayLabel(item.plan, plans)].some((value) => value.toLocaleLowerCase("tr-TR").includes(q));
    }).sort((a, b) => {
      // Yakında dolanlar ve kapalılar üstte.
      const da = remainingDays(a, renderedAt), db = remainingDays(b, renderedAt);
      const ka = da === null ? 1e9 : Number.isFinite(da) ? da : 1e8;
      const kb = db === null ? 1e9 : Number.isFinite(db) ? db : 1e8;
      return ka - kb;
    });
  }, [isExpiring, plans, renderedAt, searchText, subFilter, subscriptions]);

  const pendingPurchases = purchaseRequests.filter((item) => item.status === "pending_payment");
  const usage = (planId: string) => subscriptions.filter((item) => item.plan === planId).length;

  const columns: DataColumn<SubscriptionRow>[] = [
    {
      key: "business", header: "İşletme", primary: true,
      cell: (item) => <span className="block min-w-0"><b className={styles.name}>{item.businessName}</b><small className={styles.sub}>{item.businessId}</small></span>,
    },
    { key: "plan", header: "Paket", cell: (item) => <Badge size="sm" tone={isLegacyPlanId(item.plan) ? "amber" : "lime"}>{planDisplayLabel(item.plan, plans)}</Badge> },
    {
      key: "status", header: "Durum",
      cell: (item) => item.isLifetime ? <Badge size="sm" tone="violet" icon={Crown}>Süresiz</Badge> : <Badge size="sm" dot tone={STATUS_PILL[item.status]?.tone ?? "neutral"}>{STATUS_PILL[item.status]?.label ?? item.status}</Badge>,
    },
    {
      key: "remaining", header: "Kalan",
      cell: (item) => {
        const end = subscriptionEnd(item);
        const days = remainingDays(item, renderedAt);
        if (item.isLifetime) return <span className={styles.muted}>Süre sınırı yok</span>;
        if (!end || days === null || !Number.isFinite(days)) return <span className={styles.muted}>Bitiş tanımsız</span>;
        const tone = days < 0 ? styles.bad : days <= 7 ? styles.warn : styles.muted;
        return <span className={tone}>{days > 0 ? `${days} gün` : days === 0 ? "Bugün bitiyor" : `${Math.abs(days)} gün önce doldu`}<small className={styles.sub}>{new Date(end).toLocaleDateString("tr-TR")}</small></span>;
      },
    },
    {
      key: "actions", header: <span className="sr-only">İşlemler</span>, align: "right", mobileLabel: "İşlemler",
      cell: (item) => (
        <span className={styles.rowActions} onClick={(event) => event.stopPropagation()}>
          <AdminButton size="sm" variant="primary" icon={CalendarClock} onClick={() => openSubscriptionEditor(item)}>Yönet</AdminButton>
          <AdminButton size="sm" variant="ghost" icon={Trash2} iconOnly aria-label={`${item.businessName} işletmesini sil`} onClick={() => { setBusinessDeleteCandidate(item); setBusinessDeleteConfirmation(""); }} />
        </span>
      ),
    },
  ];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Gelir kontrol merkezi"
        title="Abonelikler ve paketler"
        description="Paket fiyatlarını, deneme sürelerini ve kapasite limitlerini yönetin; ödeme taleplerini onaylayın, erişim sürelerini düzenleyin."
        icon={WalletCards}
        actions={<>
          <AdminButton variant="glass" icon={RefreshCw} loading={loading} onClick={() => void reload()}>Yenile</AdminButton>
          <AdminButton variant="lime" icon={Plus} onClick={() => startNewPlan()}>Yeni paket</AdminButton>
        </>}
      />

      {loadWarning && <Callout tone="amber" icon={CircleAlert} title={loadWarning} action={<AdminButton size="sm" onClick={() => void reload()}>Yeniden dene</AdminButton>} />}
      {plansFromFallback && !loading && (
        <Callout tone="blue" icon={PackagePlus} title="Paket koleksiyonu boş"
          action={<AdminButton size="sm" variant="primary" icon={PackagePlus} loading={creatingDefault} onClick={() => void createDefaultPlan()}>Varsayılan paketi oluştur</AdminButton>}>
          Şu an kod içindeki yerleşik SeninRandevun paketi (149 ₺/ay, 1.490 ₺/yıl, tüm özellikler) gösteriliyor. Oluşturduğunuzda paket Firestore’a kaydedilir ve buradan düzenlenebilir.
        </Callout>
      )}

      <StatGrid columns={5}>
        <StatCard label="Aktif abonelik" value={counts.active} icon={BadgeCheck} tone="green" loading={loading} hint={`${counts.lifetime} süresiz`} />
        <StatCard label="Denemede" value={counts.trialing} icon={Clock3} tone="amber" loading={loading} />
        <StatCard label="7 gün içinde doluyor" value={counts.expiring} icon={CalendarClock} tone="violet" loading={loading} />
        <StatCard label="Kapalı" value={counts.closed} icon={CircleAlert} tone="red" loading={loading} hint="Ödeme bekliyor / doldu / iptal" />
        <StatCard label="Ödeme onayı" value={pendingPurchases.length} icon={ReceiptText} tone="blue" loading={loading} />
      </StatGrid>

      {pendingPurchases.length > 0 && (
        <Panel title="Ödeme kontrol kuyruğu" description="Ödemeyi sağlayıcı panelinden doğruladıktan sonra paketi etkinleştirin." actions={<Badge tone="amber">{pendingPurchases.length} bekleyen</Badge>}>
          <div className={styles.purchaseGrid}>
            {pendingPurchases.map((request) => (
              <article key={request.businessId} className={styles.purchase}>
                <div className="min-w-0"><b className={styles.name}>{request.businessName}</b><small className={styles.sub}>{request.businessId}</small></div>
                <Badge size="sm" tone="lime">{request.planLabel}</Badge>
                <div className={styles.purchaseFoot}>
                  <span><small className={styles.sub}>{request.billingCycle === "yearly" ? "Yıllık" : "Aylık"} ödeme</small><b className={styles.amount}>{request.amount.toLocaleString("tr-TR")} {request.currency}</b></span>
                  <AdminButton size="sm" variant="primary" icon={BadgeCheck} disabled={busy} onClick={() => void approvePurchase(request.businessId)}>Ödemeyi onayla</AdminButton>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Paketler" description="Kartlardan düzenleyin; seçilmeyen özellikler hem menüden gizlenir hem sunucuda engellenir." actions={<AdminButton size="sm" variant="secondary" icon={Plus} onClick={() => startNewPlan()}>Yeni paket</AdminButton>}>
        <div className={styles.planGrid}>
          {plans.map((plan) => (
            <article key={plan.id} className={styles.plan} data-recommended={plan.isRecommended || undefined}>
              <div className={styles.planHead}>
                <div className="min-w-0">
                  <span className={styles.planCode}>{plan.id}</span>
                  <h3 className={styles.planName}>{plan.label}</h3>
                </div>
                <span className="flex flex-wrap justify-end gap-1">
                  {plan.isFallback && <Badge size="sm" tone="blue">Kaydedilmemiş</Badge>}
                  {plan.isRecommended && <Badge size="sm" tone="lime">Önerilen</Badge>}
                  <Badge size="sm" dot tone={plan.isActive ? "green" : "neutral"}>{plan.isActive ? "Satışta" : "Kapalı"}</Badge>
                </span>
              </div>
              <p className={styles.planPrice}><b>{plan.monthlyPrice.toLocaleString("tr-TR")} ₺</b><span>/ay</span><em>{plan.yearlyPrice.toLocaleString("tr-TR")} ₺/yıl</em></p>
              <p className={styles.planDesc}>{plan.description || "Paket açıklaması eklenmemiş."}</p>
              <div className={styles.planMeta}>
                <Badge size="sm" icon={BadgeCheck}>{plan.entitlements.length} özellik</Badge>
                <Badge size="sm" icon={Store}>{plan.maxStores} şube</Badge>
                <Badge size="sm" icon={UsersRound}>{plan.maxStaff} çalışan</Badge>
                <Badge size="sm" icon={Clock3}>{plan.trialDays} gün deneme</Badge>
                <Badge size="sm" tone="violet">{usage(plan.id)} abonelik</Badge>
              </div>
              <div className={styles.planActions}>
                {plan.isFallback
                  ? <AdminButton size="sm" variant="primary" icon={PackagePlus} loading={creatingDefault} onClick={() => void createDefaultPlan()}>Varsayılan paketi oluştur</AdminButton>
                  : <>
                    <AdminButton size="sm" variant="secondary" icon={PencilLine} onClick={() => startEditing(plan)}>Düzenle</AdminButton>
                    <AdminButton size="sm" variant="ghost" icon={Copy} onClick={() => startNewPlan(plan)}>Kopyala</AdminButton>
                    <AdminButton size="sm" variant="ghost" icon={Trash2} iconOnly aria-label={`${plan.label} paketini sil`} onClick={() => setDeleteCandidate(plan)} />
                  </>}
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Abonelikler" description="Firmaya ait tüm şubeler aynı paket ve süreyi paylaşır." flush>
        <div className={styles.filters}>
          <Toolbar><SearchField value={searchText} onChange={setSearchText} placeholder="İşletme adı, ID veya paket ara" /></Toolbar>
          <SegmentedControl<SubFilter>
            ariaLabel="Abonelik durumu"
            value={subFilter}
            onChange={setSubFilter}
            options={[
              { value: "all", label: "Tümü", count: counts.all },
              { value: "expiring", label: "Yakında doluyor", count: counts.expiring },
              { value: "active", label: "Aktif", count: counts.active },
              { value: "trialing", label: "Deneme", count: counts.trialing },
              { value: "closed", label: "Kapalı", count: counts.closed },
              { value: "lifetime", label: "Süresiz", count: counts.lifetime },
            ]}
          />
        </div>
        <DataTable
          ariaLabel="Abonelik listesi"
          rows={visibleSubscriptions}
          columns={columns}
          rowKey={(item) => item.id}
          loading={loading}
          onRowClick={openSubscriptionEditor}
          rowLabel={(item) => `${item.businessName} aboneliğini yönet`}
          empty={<EmptyState icon={WalletCards} title={subscriptions.length ? "Eşleşen abonelik yok" : "Henüz abonelik kaydı yok"} description={subscriptions.length ? "Arama veya filtreyi değiştirin." : undefined} compact />}
        />
      </Panel>

      <Sheet
        open={planEditorOpen}
        onClose={() => setPlanEditorOpen(false)}
        dismissible={!busy}
        size="lg"
        title={editingPlanId ? `${editing.label} paketini düzenle` : "Paket oluştur"}
        description="Fiyat, kapasite ve erişim yetkilerini tek yerden yapılandırın."
        footer={<>
          <AdminButton variant="secondary" disabled={busy} onClick={() => setPlanEditorOpen(false)}>Vazgeç</AdminButton>
          <AdminButton type="submit" form="plan-editor-form" variant="primary" icon={Save} loading={busy} disabled={!editing.id || !editing.label}>{editingPlanId ? "Değişiklikleri kaydet" : "Paketi oluştur"}</AdminButton>
        </>}
      >
        <form id="plan-editor-form" onSubmit={submit} className={styles.form}>
          <section>
            <h3 className={styles.formTitle}>Temel bilgiler ve limitler</h3>
            <div className={styles.formGrid}>
              <Input label="Paket kodu" value={editing.id} disabled={Boolean(editingPlanId)} title={editingPlanId ? "Mevcut paketin kodu değiştirilemez" : undefined} onChange={(event) => setEditing({ ...editing, id: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} required />
              <Input label="Görünen ad" value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} required />
              <Input label="Aylık fiyat (₺)" type="number" inputMode="decimal" value={editing.monthlyPrice} onChange={(event) => setEditing({ ...editing, monthlyPrice: Number(event.target.value) })} min={0} />
              <Input label="Yıllık fiyat (₺)" type="number" inputMode="decimal" value={editing.yearlyPrice} onChange={(event) => setEditing({ ...editing, yearlyPrice: Number(event.target.value) })} min={0} />
              <Input label="Para birimi" value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value.toUpperCase().slice(0, 3) })} />
              <Input label="Deneme (gün)" type="number" inputMode="numeric" value={editing.trialDays} onChange={(event) => setEditing({ ...editing, trialDays: Number(event.target.value) })} min={0} />
              <Input label="Maks. şube" type="number" inputMode="numeric" value={editing.maxStores} onChange={(event) => setEditing({ ...editing, maxStores: Number(event.target.value) })} min={1} max={25} />
              <Input label="Maks. çalışan" type="number" inputMode="numeric" value={editing.maxStaff} onChange={(event) => setEditing({ ...editing, maxStaff: Number(event.target.value) })} min={1} />
              <Input label="Sıra (fiyat sayfası)" type="number" inputMode="numeric" placeholder="Boş: fiyata göre" value={editing.sortOrder ?? ""} onChange={(event) => setEditing({ ...editing, sortOrder: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <div className="mt-3"><Input label="Paket açıklaması" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></div>
          </section>
          <fieldset className={styles.fieldset}>
            <div className={styles.fieldsetHead}>
              <legend className={styles.formTitle}>Özellik ve erişim matrisi</legend>
              <span className="flex gap-2">
                <AdminButton size="sm" variant="secondary" onClick={() => setEditing({ ...editing, entitlements: [...ALL_SUBSCRIPTION_ENTITLEMENTS] })}>Tümü</AdminButton>
                <AdminButton size="sm" variant="ghost" onClick={() => setEditing({ ...editing, entitlements: [] })}>Temizle</AdminButton>
              </span>
            </div>
            <div className={styles.entGrid}>
              {SUBSCRIPTION_ENTITLEMENTS.map((feature) => {
                const checked = editing.entitlements.includes(feature.key);
                return (
                  <label key={feature.key} className={styles.ent} data-checked={checked || undefined}>
                    <input type="checkbox" checked={checked} onChange={(event) => setEditing({ ...editing, entitlements: event.target.checked ? [...editing.entitlements, feature.key] : editing.entitlements.filter((item) => item !== feature.key) })} />
                    <span><b>{feature.label}</b><small>{feature.description}</small></span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <section>
            <h3 className={styles.formTitle}>Satış sayfası ve görünürlük</h3>
            <label className={styles.textareaLabel}>Müşteriye gösterilecek maddeler (her satıra bir madde)
              <textarea rows={4} value={editing.features.join("\n")} onChange={(event) => setEditing({ ...editing, features: event.target.value.split("\n").map((row) => row.trim()).filter(Boolean) })} />
            </label>
            <div className={styles.checks}>
              <label><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /> Satışa ve atamaya açık (fiyat sayfasında görünür)</label>
              <label><input type="checkbox" checked={editing.isRecommended} onChange={(event) => setEditing({ ...editing, isRecommended: event.target.checked })} /> Önerilen paket rozeti (tek pakette olur; diğerlerinden kaldırılır)</label>
            </div>
          </section>
        </form>
      </Sheet>

      <Sheet
        open={Boolean(subscriptionEditor)}
        onClose={() => setSubscriptionEditor(null)}
        dismissible={!busy}
        title={subscriptionEditor?.businessName ?? ""}
        description="Paket ve erişim aynı firmaya bağlı tüm şubelere uygulanır."
        footer={<>
          <AdminButton variant="secondary" disabled={busy} onClick={() => setSubscriptionEditor(null)}>Vazgeç</AdminButton>
          <AdminButton variant="primary" icon={Save} loading={busy} disabled={!subscriptionPlanId} onClick={() => void saveSubscriptionAccess()}>Kaydet</AdminButton>
        </>}
      >
        <div className={styles.form}>
          <SelectField label="Tanımlanacak paket" value={subscriptionPlanId} onChange={setSubscriptionPlanId} options={[
            ...(!plans.some((plan) => plan.id === subscriptionPlanId) ? [{ value: subscriptionPlanId, label: planDisplayLabel(subscriptionPlanId, plans) }] : []),
            ...plans.map((plan) => ({ value: plan.id, label: `${plan.label} · ${plan.entitlements.length || ALL_SUBSCRIPTION_ENTITLEMENTS.length} özellik` })),
          ]} />
          {subscriptionEditor && isLegacyPlanId(subscriptionEditor.plan) && <p className={styles.hintText}>Bu işletme eski “{subscriptionEditor.plan}” kodunda; kaydettiğinizde seçili pakete taşınır.</p>}
          <SelectField<AdminSubscriptionMode> label="Erişim durumu" value={subscriptionMode} onChange={setSubscriptionMode} options={[
            { value: "trialing", label: "Ücretsiz deneme" }, { value: "active", label: "Aktif abonelik" }, { value: "lifetime", label: "Süresiz erişim" },
            { value: "past_due", label: "Ödeme bekliyor" }, { value: "expired", label: "Süresi doldu" }, { value: "cancelled", label: "İptal edildi" },
          ]} />
          {["active", "trialing"].includes(subscriptionMode) && (
            <div>
              <Input label="Bitiş tarihi" type="date" value={subscriptionEndDate} onChange={(event) => setSubscriptionEndDate(event.target.value)} min={new Date(renderedAt + 86_400_000).toISOString().slice(0, 10)} required />
              <div className={styles.quickDays}>
                <AdminButton size="sm" variant="secondary" onClick={() => addSubscriptionDays(30)}>+30 gün</AdminButton>
                <AdminButton size="sm" variant="secondary" onClick={() => addSubscriptionDays(90)}>+90 gün</AdminButton>
                <AdminButton size="sm" variant="secondary" onClick={() => addSubscriptionDays(365)}>+1 yıl</AdminButton>
              </div>
            </div>
          )}
          {subscriptionMode === "lifetime" && <Callout tone="violet" icon={Crown} title="Bu işletmenin süresi hiç dolmaz">Paket özellik matrisi uygulanır; yalnızca süre sınırı kaldırılır.</Callout>}
          {["past_due", "expired", "cancelled"].includes(subscriptionMode) && <Callout tone="red" icon={CircleAlert} title="Yeni randevu alımı durur">Bu durum kaydedildiğinde yeni randevu, bekleme listesi ve canlı sıra alımı durdurulur; mevcut veriler korunur.</Callout>}
        </div>
      </Sheet>

      <ConfirmSheet
        open={Boolean(deleteCandidate)}
        title={`${deleteCandidate?.label ?? ""} silinsin mi?`}
        description="Paket tanımı kalıcı olarak kaldırılır. Aboneliğe atanmış paketler silinemez."
        confirmLabel="Kalıcı olarak sil"
        icon={Trash2}
        busy={busy}
        onConfirm={() => { if (deleteCandidate && usage(deleteCandidate.id) > 0) toast.error(`Bu paket ${usage(deleteCandidate.id)} abonelikte kullanılıyor.`); else void confirmDeletePlan(); }}
        onClose={() => setDeleteCandidate(null)}
      >
        {deleteCandidate && usage(deleteCandidate.id) > 0 && <div className="mt-3"><Callout tone="amber" title={`${usage(deleteCandidate.id)} abonelik bu paketi kullanıyor`}>Önce abonelikleri başka pakete taşıyın.</Callout></div>}
      </ConfirmSheet>

      <ConfirmSheet
        open={Boolean(businessDeleteCandidate)}
        title={`${businessDeleteCandidate?.businessName ?? ""} silinsin mi?`}
        description="Yalnızca bu işletme/mağaza silinir. Aynı hesaba bağlı diğer mağazalar ve kullanıcı hesabı korunur; bu mağazanın randevu, müşteri, hizmet ve operasyon kayıtları geri alınamaz."
        confirmLabel="Yalnızca bu işletmeyi sil"
        icon={Trash2}
        busy={busy}
        onConfirm={() => { if (businessDeleteConfirmation.trim().toLocaleUpperCase("tr-TR") === "EVET") void confirmBusinessDelete(); else toast.error("Onaylamak için EVET yazın."); }}
        onClose={() => setBusinessDeleteCandidate(null)}
      >
        <p className={styles.mono}>{businessDeleteCandidate?.businessId}</p>
        <div className="mt-3"><Input label="Onaylamak için EVET yazın" value={businessDeleteConfirmation} onChange={(event) => setBusinessDeleteConfirmation(event.target.value)} placeholder="EVET" autoCapitalize="characters" /></div>
      </ConfirmSheet>
    </AdminPage>
  );
}
