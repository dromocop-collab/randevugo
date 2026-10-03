"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { collection, doc, getDoc, getDocs, type DocumentData } from "firebase/firestore";
import { BadgeCheck, CalendarClock, CircleAlert, Copy, Crown, PencilLine, Plus, ReceiptText, RefreshCw, Save, Search, Store, Trash2, UsersRound, WalletCards, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAN_PRICE, PLAN_LABEL, PLAN_FEATURE_LIST } from "@/constants/plans";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, SUBSCRIPTION_ENTITLEMENTS } from "@/constants/subscription-entitlements";
import { listPlatformPlans, removePlatformPlan, savePlatformPlan, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { backfillLegacyBusinessSubscriptions, completeSubscriptionPurchase, deleteBusinessPermanently, ensureAdminOwnedBusinessesLifetime, updateBusinessSubscription, type AdminSubscriptionMode } from "@/features/subscriptions/admin-subscription-repository";
import { getDb } from "@/lib/firebase/firestore";
import type { PaymentProviderKey, SubscriptionStatus } from "@/types/subscription";

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

const DEFAULT_PLAN: PlatformPlan = { id: "RANDEVUGO", label: PLAN_LABEL, yearlyPrice: PLAN_PRICE.yearly, monthlyPrice: PLAN_PRICE.monthly, currency: "TRY", trialDays: PLAN_PRICE.trialDays, maxStores: 3, maxStaff: 250, isActive: true, isRecommended: true, description: "Tüm randevu operasyonunu tek merkezden yönetin.", features: [...PLAN_FEATURE_LIST], entitlements: [...ALL_SUBSCRIPTION_ENTITLEMENTS] };

function readDate(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  return undefined;
}

function mapSubscription(id: string, data: DocumentData, businesses: Map<string, { name: string; ownerUid: string }>): SubscriptionRow {
  const businessId = String(data.businessId ?? id);
  const business = businesses.get(businessId);
  const isLifetime = data.isLifetime === true || data.accessMode === "lifetime";
  return { id, businessId, businessName: business?.name ?? "İşletme kaydı bulunamadı", ownerUid: business?.ownerUid ?? "", plan: String(data.plan ?? "RANDEVUGO"), status: String(data.status ?? "trialing") as SubscriptionStatus, paymentProvider: String(data.paymentProvider ?? "manual") as PaymentProviderKey, renewalEnabled: data.renewalEnabled === true, trialEndsAt: readDate(data.trialEndsAt), subscriptionEndsAt: readDate(data.subscriptionEndsAt), accessMode: isLifetime ? "lifetime" : "timed", isLifetime };
}

async function fetchSubscriptions(): Promise<SubscriptionRow[]> {
  const db = getDb();
  const businessSnapshot = await getDocs(collection(db, "businesses"));
  const businesses = new Map(businessSnapshot.docs.map((item) => [item.id, { name: String(item.data().name ?? "İsimsiz işletme"), ownerUid: String(item.data().ownerUid ?? "") }]));
  try {
    const subscriptionSnapshot = await getDocs(collection(db, "subscriptions"));
    const subscriptionsByBusiness = new Map(subscriptionSnapshot.docs.map((item) => [String(item.data().businessId ?? item.id), item]));
    const rows = businessSnapshot.docs.map((business) => {
      const subscription = subscriptionsByBusiness.get(business.id);
      return subscription
        ? mapSubscription(subscription.id, subscription.data(), businesses)
        : mapSubscription(business.id, { businessId: business.id, status: "expired", plan: business.data().plan ?? "RANDEVUGO", paymentProvider: "manual" }, businesses);
    });
    const knownBusinessIds = new Set(businessSnapshot.docs.map((business) => business.id));
    const orphaned = subscriptionSnapshot.docs
      .filter((item) => !knownBusinessIds.has(String(item.data().businessId ?? item.id)))
      .map((item) => mapSubscription(item.id, item.data(), businesses));
    return [...rows, ...orphaned];
  } catch {
    const snapshots = await Promise.all(businessSnapshot.docs.map((business) => getDoc(doc(db, "subscriptions", business.id))));
    return snapshots.map((item, index) => item.exists()
      ? mapSubscription(item.id, item.data(), businesses)
      : mapSubscription(businessSnapshot.docs[index].id, { businessId: businessSnapshot.docs[index].id, status: "expired", plan: businessSnapshot.docs[index].data().plan ?? "RANDEVUGO", paymentProvider: "manual" }, businesses));
  }
}

async function fetchPurchaseRequests(): Promise<PurchaseRequestRow[]> {
  const db = getDb();
  const [requests, businesses] = await Promise.all([getDocs(collection(db, "subscriptionPurchaseRequests")), getDocs(collection(db, "businesses"))]);
  const names = new Map(businesses.docs.map((item) => [item.id, String(item.data().name ?? "İsimsiz işletme")]));
  return requests.docs.map((item) => { const data = item.data(); const businessId = String(data.businessId ?? item.id); return { businessId, businessName: names.get(businessId) ?? "İşletme", planId: String(data.planId ?? ""), planLabel: String(data.planLabel ?? data.planId ?? "Paket"), billingCycle: data.billingCycle === "yearly" ? "yearly" : "monthly", amount: Number(data.amount ?? 0), currency: String(data.currency ?? "TRY"), status: String(data.status ?? "pending_payment"), updatedAt: readDate(data.updatedAt) }; });
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

export default function SuperAdminSubscriptionsPage() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestRow[]>([]);
  const emptyPlan = (): PlatformPlan => ({ ...DEFAULT_PLAN, features: [...DEFAULT_PLAN.features], entitlements: [...DEFAULT_PLAN.entitlements] });
  const [editing, setEditing] = useState<PlatformPlan>(emptyPlan);
  const [busy, setBusy] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PlatformPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [searchText, setSearchText] = useState("");
  const [subscriptionEditor, setSubscriptionEditor] = useState<SubscriptionRow | null>(null);
  const [subscriptionMode, setSubscriptionMode] = useState<AdminSubscriptionMode>("active");
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState(DEFAULT_PLAN.id);
  const [businessDeleteCandidate, setBusinessDeleteCandidate] = useState<SubscriptionRow | null>(null);
  const [businessDeleteConfirmation, setBusinessDeleteConfirmation] = useState("");
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const editorRef = useRef<HTMLFormElement>(null);
  const adminLifetimeSynced = useRef(false);

  function focusEditor() {
    requestAnimationFrame(() => {
      window.setTimeout(() => editorRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus(), 120);
    });
  }

  function startNewPlan(source?: PlatformPlan) {
    setEditingPlanId(null);
    setEditing(source ? { ...source, id: `${source.id}_KOPYA`, label: `${source.label} Kopya`, isRecommended: false, features: [...source.features], entitlements: [...source.entitlements] } : { ...emptyPlan(), id: "", label: "", isRecommended: false });
    setPlanEditorOpen(true);
    focusEditor();
  }

  function startEditing(plan: PlatformPlan) {
    setEditingPlanId(plan.id);
    setEditing({ ...plan, features: [...plan.features], entitlements: plan.entitlements.length ? [...plan.entitlements] : [...ALL_SUBSCRIPTION_ENTITLEMENTS] });
    setPlanEditorOpen(true);
    focusEditor();
  }

  const reload = useCallback(async (syncAdminLifetime = false) => {
    setLoading(true);
    setLoadWarning("");
    if (syncAdminLifetime && !adminLifetimeSynced.current) {
      try {
        await ensureAdminOwnedBusinessesLifetime();
        await backfillLegacyBusinessSubscriptions();
        adminLifetimeSynced.current = true;
      } catch {
        setLoadWarning("Yönetici hesabına ait işletmelerin süresiz erişimi eşitlenemedi. Yeniden deneyin.");
      }
    }
    const [planResult, subscriptionResult, purchaseResult] = await Promise.allSettled([listPlatformPlans(), fetchSubscriptions(), fetchPurchaseRequests()]);
    if (planResult.status === "fulfilled" && planResult.value.length) setPlans(planResult.value);
    else setPlans([{ ...DEFAULT_PLAN, features: [...DEFAULT_PLAN.features] }]);
    if (subscriptionResult.status === "fulfilled") setSubscriptions(subscriptionResult.value);
    else setSubscriptions([]);
    if (purchaseResult.status === "fulfilled") setPurchaseRequests(purchaseResult.value);
    else setPurchaseRequests([]);
    if (planResult.status === "rejected" || subscriptionResult.status === "rejected" || purchaseResult.status === "rejected") setLoadWarning("Bazı canlı abonelik verilerine erişilemedi. Varsayılan paket gösteriliyor; yetkileri kontrol edip yeniden deneyin.");
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void reload(true); });
  }, [reload]);

  useEffect(() => {
    const modalOpen = planEditorOpen || Boolean(subscriptionEditor) || Boolean(deleteCandidate) || Boolean(businessDeleteCandidate);
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [businessDeleteCandidate, deleteCandidate, planEditorOpen, subscriptionEditor]);

  function openSubscriptionEditor(item: SubscriptionRow) {
    const mode: AdminSubscriptionMode = item.isLifetime ? "lifetime" : item.status;
    const end = subscriptionEnd(item);
    setSubscriptionEditor(item);
    setSubscriptionMode(mode);
    setSubscriptionPlanId(item.plan);
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
    try { await savePlatformPlan({ ...editing, id: editing.id.trim(), label: editing.label.trim(), description: editing.description.trim() }); setEditingPlanId(editing.id); setPlanEditorOpen(false); await reload(); toast.success(editingPlanId ? "Paket değişiklikleri kaydedildi." : "Yeni paket oluşturuldu."); }
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
      if (editingPlanId === deleteCandidate.id) startNewPlan();
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

  const normalizedSearch = searchText.trim().toLocaleLowerCase("tr-TR");
  const visibleSubscriptions = subscriptions.filter((item) => !normalizedSearch ||
    item.businessName.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
    item.businessId.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
    item.plan.toLocaleLowerCase("tr-TR").includes(normalizedSearch));
  const lifetimeCount = subscriptions.filter((item) => item.isLifetime).length;
  const expiringCount = subscriptions.filter((item) => {
    const days = remainingDays(item, renderedAt);
    return days !== null && Number.isFinite(days) && days >= 0 && days <= 7;
  }).length;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#081923,#0b4050_58%,#0e7490)] px-6 py-7 text-white shadow-xl shadow-cyan-950/15 sm:px-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-cyan-200/15 bg-cyan-200/5" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[.18em] text-cyan-200"><WalletCards size={14}/> GELİR KONTROL MERKEZİ</span><h1 className="mt-4 text-3xl font-semibold tracking-tight">Paketleri, fiyatları ve kapasiteyi yönet.</h1><p className="mt-2 max-w-2xl text-sm text-cyan-50/65">Aylık/yıllık fiyatlandırmayı, deneme süresini, mağaza ve ekip limitlerini canlı olarak yapılandır.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/> Yenile</button><button type="button" onClick={() => startNewPlan()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"><Plus size={17}/> Yeni paket</button></div></div>
      </section>

      {loadWarning && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><CircleAlert size={17}/>{loadWarning}</span><button type="button" onClick={() => void reload()} className="shrink-0 rounded-xl bg-amber-900 px-3 py-2 text-xs font-bold text-white">Yeniden dene</button></div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Tanımlı paket", value: plans.length, icon: ReceiptText }, { label: "Satışa açık", value: plans.filter((plan) => plan.isActive).length, icon: BadgeCheck }, { label: "Maks. mağaza", value: Math.max(0, ...plans.map((plan) => plan.maxStores)), icon: Store }, { label: "Maks. ekip", value: Math.max(0, ...plans.map((plan) => plan.maxStaff)), icon: UsersRound }].map((item) => <article key={item.label} className="flex items-center gap-3 rounded-2xl border border-cyan-950/10 bg-white/80 p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><item.icon size={20}/></span><div><p className="text-xs text-slate-500">{item.label}</p><b className="text-xl text-slate-900">{item.value}</b></div></article>)}
      </div>

      {purchaseRequests.some((item) => item.status === "pending_payment") && <section className="overflow-hidden rounded-[26px] border border-amber-200 bg-[linear-gradient(145deg,#fffdf5,#fff7df)] shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-amber-200/70 px-5 py-4 sm:flex-row sm:items-center">
          <div><p className="text-[10px] font-black tracking-[.18em] text-amber-700">ONAY BEKLEYEN SATIN ALMALAR</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Ödeme kontrol kuyruğu</h2><p className="mt-1 text-xs text-slate-500">Ödemeyi sağlayıcı panelinden doğruladıktan sonra paketi etkinleştirin.</p></div>
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">{purchaseRequests.filter((item) => item.status === "pending_payment").length} bekleyen</span>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{purchaseRequests.filter((item) => item.status === "pending_payment").map((request) => <article key={request.businessId} className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-slate-950">{request.businessName}</p><p className="truncate text-[11px] text-slate-400">{request.businessId}</p></div><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-800">{request.planLabel}</span></div>
          <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{request.billingCycle === "yearly" ? "Yıllık" : "Aylık"} ödeme</p><p className="mt-1 text-lg font-black text-slate-900">{request.amount.toLocaleString("tr-TR")} {request.currency}</p></div><button type="button" disabled={busy} onClick={() => void approvePurchase(request.businessId)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"><BadgeCheck size={15}/> Ödemeyi onayla</button></div>
        </article>)}</div>
      </section>}

      <section className="overflow-hidden rounded-[26px] border border-cyan-950/10 bg-white/85 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-cyan-950/10 px-5 py-4 sm:flex-row sm:items-center">
          <div><p className="text-[10px] font-bold tracking-[.18em] text-cyan-700">ÖDEME OPERASYONU</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Aboneliklerin canlı durumu</h2></div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-50 px-3 py-1.5 font-semibold text-violet-700">{lifetimeCount} süresiz</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{subscriptions.filter((item) => item.status === "active" && !item.isLifetime).length} aktif</span><span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">{subscriptions.filter((item) => item.status === "trialing").length} denemede</span><span className="rounded-full bg-orange-50 px-3 py-1.5 font-semibold text-orange-700">{expiringCount} yakında doluyor</span><span className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">{subscriptions.filter((item) => ["past_due", "expired"].includes(item.status)).length} kapalı</span></div>
        </div>
        <div className="border-b border-cyan-950/5 px-5 py-3"><label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="İşletme adı, ID veya paket ara" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"/></label></div>
        {subscriptions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Henüz abonelik kaydı oluşmadı.</p> : visibleSubscriptions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Aramayla eşleşen işletme bulunamadı.</p> : <div className="divide-y divide-cyan-950/5">{visibleSubscriptions.map((item) => {
          const statusLabel: Record<SubscriptionStatus, string> = { trialing: "Ücretsiz dönemde", active: "Aktif", past_due: "Ödeme bekliyor", cancelled: "İptal", expired: "Süresi doldu" };
          const endDate = subscriptionEnd(item);
          const days = remainingDays(item, renderedAt);
          const remainingLabel = item.isLifetime ? "Süresiz erişim" : !endDate || !Number.isFinite(days) ? "Bitiş tarihi tanımsız" : days! > 0 ? `${days} gün kaldı` : days === 0 ? "Bugün sona eriyor" : `${Math.abs(days!)} gün önce doldu`;
          return <article key={item.id} className="grid gap-4 px-5 py-4 transition hover:bg-cyan-50/45 xl:grid-cols-[1.35fr_.65fr_.75fr_1fr_auto] xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-slate-950">{item.businessName}</p>{item.isLifetime && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[9px] font-black text-violet-700"><Crown size={11}/> SÜRESİZ</span>}</div><p className="truncate text-xs text-slate-500">{item.businessId}</p></div><div><p className="text-[10px] font-bold tracking-wider text-slate-400">PAKET</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.plan}</p></div><div><p className="text-[10px] font-bold tracking-wider text-slate-400">DURUM</p><p className={`mt-1 text-sm font-semibold ${item.isLifetime || item.status === "active" ? "text-emerald-700" : ["past_due", "expired", "cancelled"].includes(item.status) ? "text-rose-700" : "text-amber-700"}`}>{item.isLifetime ? "Süresiz" : statusLabel[item.status]}</p></div><div className="rounded-xl bg-slate-50 px-3 py-2"><p className={`text-sm font-bold ${item.isLifetime ? "text-violet-700" : days !== null && Number.isFinite(days) && days <= 7 ? "text-rose-700" : "text-slate-800"}`}>{remainingLabel}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.isLifetime ? "Bitiş tarihi uygulanmaz" : endDate ? `Bitiş: ${new Date(endDate).toLocaleDateString("tr-TR")}` : "Bitiş tarihi tanımsız"}</p></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><button type="button" onClick={() => openSubscriptionEditor(item)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 text-xs font-bold text-white transition hover:bg-cyan-800"><CalendarClock size={15}/> Paket ve erişim</button><button type="button" onClick={() => { setBusinessDeleteCandidate(item); setBusinessDeleteConfirmation(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"><Trash2 size={15}/> İşletmeyi sil</button></div></article>;
        })}</div>}
      </section>

      <Card title="Dinamik Paket Yönetimi" description="Paketleri oluştur, fiyat ve mağaza/ekip limitlerini yönet">
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-slate-900">{plans.length} paket tanımlı</p><p className="mt-1 text-xs text-slate-500">Karttan düzenleyin veya yeni bir paket oluşturun. Uzun ayarlar ayrı ve kaydırılabilir bir pencerede açılır.</p></div><button type="button" onClick={() => startNewPlan()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800"><Plus size={16}/> Yeni paket oluştur</button></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-3)] md:col-span-2 xl:col-span-3">Henüz dinamik paket yok. İlk paketi oluşturarak başlayın.</p> : plans.map((plan) => <article key={plan.id} className="flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-black text-slate-950">{plan.label}</h3>{plan.isRecommended && <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[9px] font-black text-cyan-700">ÖNERİLEN</span>}</div><p className="mt-0.5 text-[10px] font-bold tracking-[.12em] text-slate-400">{plan.id}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{plan.isActive ? "Satışta" : "Kapalı"}</span></div>
            <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.description || "Paket açıklaması eklenmemiş."}</p>
            <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Aylık</p><p className="mt-1 font-black text-slate-900">{plan.monthlyPrice.toLocaleString("tr-TR")} {plan.currency}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Yıllık</p><p className="mt-1 font-black text-slate-900">{plan.yearlyPrice.toLocaleString("tr-TR")} {plan.currency}</p></div></div>
            <div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">{plan.entitlements.length} yetki</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{plan.maxStores} mağaza</span><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">{plan.maxStaff} çalışan</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{plan.trialDays} gün deneme</span></div>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-4"><Button type="button" variant="secondary" className="text-xs" onClick={() => startEditing(plan)}><PencilLine size={14}/> Düzenle</Button><Button type="button" variant="danger" className="text-xs" onClick={() => setDeleteCandidate(plan)}><Trash2 size={14}/> Sil</Button></div>
          </article>)}
        </div>
      </Card>

      {planEditorOpen && <div className="fixed inset-0 z-[220] grid place-items-center bg-slate-950/65 p-2 backdrop-blur-md sm:p-4" role="presentation" onMouseDown={() => !busy && setPlanEditorOpen(false)}><form ref={editorRef} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="plan-editor-title" onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl sm:max-h-[92dvh]">
        <header className="flex items-start justify-between gap-4 bg-[linear-gradient(135deg,#071f2a,#0e7490)] px-5 py-4 text-white sm:px-6 sm:py-5"><div><span className="text-[9px] font-black tracking-[.18em] text-cyan-200">{editingPlanId ? "PAKETİ DÜZENLE" : "YENİ PAKET"}</span><h2 id="plan-editor-title" className="mt-1 text-xl font-black sm:text-2xl">{editingPlanId ? editing.label : "Yeni satış paketi oluştur"}</h2><p className="mt-1 text-xs text-white/65">Fiyat, kapasite ve erişim yetkilerini tek yerden yapılandırın.</p></div><button type="button" disabled={busy} onClick={() => setPlanEditorOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20 disabled:opacity-50" aria-label="Paket düzenleyiciyi kapat"><X size={18}/></button></header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-3 sm:p-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3"><h3 className="text-sm font-black text-slate-900">Temel bilgiler ve limitler</h3><p className="mt-1 text-xs text-slate-500">Müşterinin göreceği ad, fiyat ve işletme kapasitesi.</p></div><div className="grid grid-cols-2 gap-3">
            <Input label="Paket kodu" value={editing.id} disabled={Boolean(editingPlanId)} title={editingPlanId ? "Mevcut paketin kodu değiştirilemez" : undefined} onChange={(event) => setEditing({ ...editing, id: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} required />
            <Input label="Görünen ad" value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} required />
            <Input label="Aylık fiyat (₺)" type="number" value={editing.monthlyPrice} onChange={(event) => setEditing({ ...editing, monthlyPrice: Number(event.target.value) })} min={0} />
            <Input label="Yıllık fiyat (₺)" type="number" value={editing.yearlyPrice} onChange={(event) => setEditing({ ...editing, yearlyPrice: Number(event.target.value) })} min={0} />
            <Input label="Para birimi" value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value.toUpperCase().slice(0, 3) })} />
            <Input label="Deneme (gün)" type="number" value={editing.trialDays} onChange={(event) => setEditing({ ...editing, trialDays: Number(event.target.value) })} min={0} />
            <Input label="Maks. mağaza" type="number" value={editing.maxStores} onChange={(event) => setEditing({ ...editing, maxStores: Number(event.target.value) })} min={1} max={25} />
            <Input label="Maks. çalışan" type="number" value={editing.maxStaff} onChange={(event) => setEditing({ ...editing, maxStaff: Number(event.target.value) })} min={1} />
          </div><div className="mt-3"><Input label="Paket açıklaması" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></div></section>
          <fieldset className="rounded-2xl border border-cyan-200 bg-white p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><legend className="text-sm font-black text-slate-900">Özellik ve erişim matrisi</legend><p className="mt-1 text-xs text-slate-500">Seçilmeyen özellik hem menüden gizlenir hem doğrudan erişimde engellenir.</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditing({ ...editing, entitlements: [...ALL_SUBSCRIPTION_ENTITLEMENTS] })} className="rounded-lg bg-cyan-50 px-3 py-2 text-[10px] font-bold text-cyan-800">Tümünü seç</button><button type="button" onClick={() => setEditing({ ...editing, entitlements: [] })} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">Temizle</button></div></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{SUBSCRIPTION_ENTITLEMENTS.map((feature) => { const checked = editing.entitlements.includes(feature.key); return <label key={feature.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white hover:border-slate-300"}`}><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-cyan-700" checked={checked} onChange={(event) => setEditing({ ...editing, entitlements: event.target.checked ? [...editing.entitlements, feature.key] : editing.entitlements.filter((item) => item !== feature.key) })}/><span><b className="block text-xs text-slate-900">{feature.label}</b><small className="mt-0.5 block text-[10px] leading-4 text-slate-500">{feature.description}</small></span></label>; })}</div>
          </fieldset>
          <details className="group rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer list-none text-sm font-black text-slate-900">Satış sayfası metinleri ve görünürlük <span className="float-right text-xs font-medium text-cyan-700 group-open:hidden">Aç</span></summary><div className="mt-4 space-y-3"><label className="block space-y-2 text-sm text-slate-700"><span>Müşteriye gösterilecek maddeler <small className="text-slate-400">(her satıra bir madde)</small></span><textarea rows={4} value={editing.features.join("\n")} onChange={(event) => setEditing({ ...editing, features: event.target.value.split("\n").map((row) => row.trim()).filter(Boolean) })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500" /></label><div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /> Satışa ve atamaya açık</label><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={editing.isRecommended} onChange={(event) => setEditing({ ...editing, isRecommended: event.target.checked })} /> Önerilen paket rozeti</label></div></div></details>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"><div>{editingPlanId && <Button type="button" variant="secondary" onClick={() => startNewPlan(editing)}><Copy size={15}/> Kopyasını oluştur</Button>}</div><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="secondary" disabled={busy} onClick={() => setPlanEditorOpen(false)}>Vazgeç</Button><Button type="submit" disabled={busy || !editing.id || !editing.label}><Save size={16}/> {busy ? "Kaydediliyor…" : editingPlanId ? "Değişiklikleri kaydet" : "Paketi oluştur"}</Button></div></footer>
      </form></div>}
      {subscriptionEditor && <div className="fixed inset-0 z-[210] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !busy && setSubscriptionEditor(null)}><section role="dialog" aria-modal="true" aria-labelledby="subscription-editor-title" onMouseDown={(event) => event.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/15 bg-white shadow-2xl"><div className="bg-[linear-gradient(135deg,#071f2a,#0e7490)] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-black tracking-[.16em] text-cyan-200">PAKET VE ABONELİK</span><h2 id="subscription-editor-title" className="mt-2 text-2xl font-bold">{subscriptionEditor.businessName}</h2><p className="mt-1 text-xs text-white/65">Paket ve erişim aynı firmaya bağlı tüm şubelere uygulanır.</p></div><button type="button" disabled={busy} onClick={() => setSubscriptionEditor(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50" aria-label="Pencereyi kapat"><X size={17}/></button></div></div><div className="space-y-5 p-6"><div><label className="mb-2 block text-sm font-bold text-slate-800">Tanımlanacak paket</label><select value={subscriptionPlanId} onChange={(event) => setSubscriptionPlanId(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10">{!plans.some((plan) => plan.id === subscriptionPlanId) && <option value={subscriptionPlanId}>{subscriptionPlanId} · eski paket</option>}{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.label} · {plan.entitlements.length || ALL_SUBSCRIPTION_ENTITLEMENTS.length} özellik</option>)}</select></div><div><label className="mb-2 block text-sm font-bold text-slate-800">Erişim durumu</label><select value={subscriptionMode} onChange={(event) => setSubscriptionMode(event.target.value as AdminSubscriptionMode)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"><option value="trialing">Ücretsiz deneme</option><option value="active">Aktif abonelik</option><option value="lifetime">Süresiz erişim</option><option value="past_due">Ödeme bekliyor</option><option value="expired">Süresi doldu</option><option value="cancelled">İptal edildi</option></select></div>{["active", "trialing"].includes(subscriptionMode) && <div><Input label="Bitiş tarihi" type="date" value={subscriptionEndDate} onChange={(event) => setSubscriptionEndDate(event.target.value)} min={new Date(renderedAt + 86_400_000).toISOString().slice(0, 10)} required/><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => addSubscriptionDays(30)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">+30 gün</button><button type="button" onClick={() => addSubscriptionDays(90)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">+90 gün</button><button type="button" onClick={() => addSubscriptionDays(365)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">+1 yıl</button></div></div>}{subscriptionMode === "lifetime" && <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-900"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100"><Crown size={18}/></span><div><b className="text-sm">Bu işletmenin süresi hiç dolmaz</b><p className="mt-1 text-xs leading-5 text-violet-700">Paket özellik matrisi uygulanır; yalnızca süre sınırı kaldırılır.</p></div></div>}{["past_due", "expired", "cancelled"].includes(subscriptionMode) && <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs leading-5 text-rose-800"><CircleAlert size={17} className="mt-0.5 shrink-0"/>Bu durum kaydedildiğinde yeni randevu, bekleme listesi ve canlı sıra alımı durdurulur; mevcut veriler korunur.</div>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={busy} onClick={() => setSubscriptionEditor(null)}>Vazgeç</Button><Button type="button" disabled={busy || !subscriptionPlanId} onClick={() => void saveSubscriptionAccess()}><Save size={16}/>{busy ? "Kaydediliyor…" : "Paketi ve erişimi kaydet"}</Button></div></div></section></div>}
      {deleteCandidate && <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setDeleteCandidate(null)}><section role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-[26px] border border-white/15 bg-white p-6 shadow-2xl"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={21}/></div><h2 id="delete-plan-title" className="mt-4 text-xl font-bold text-slate-950">{deleteCandidate.label} silinsin mi?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Bu işlem paket tanımını kalıcı olarak kaldırır. Aktif aboneliğe atanmış paketlerin silinmesine izin verilmez.</p>{subscriptions.some((item) => item.plan === deleteCandidate.id) && <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><CircleAlert size={15}/> {subscriptions.filter((item) => item.plan === deleteCandidate.id).length} abonelik bu paketi kullanıyor</div>}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleteCandidate(null)}>Vazgeç</Button><Button type="button" variant="danger" disabled={busy || subscriptions.some((item) => item.plan === deleteCandidate.id)} onClick={() => void confirmDeletePlan()}><Trash2 size={15}/> Kalıcı olarak sil</Button></div></section></div>}
      {businessDeleteCandidate && <div className="fixed inset-0 z-[230] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-md" role="presentation" onMouseDown={() => !busy && setBusinessDeleteCandidate(null)}><section role="dialog" aria-modal="true" aria-labelledby="delete-business-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#3f0a0a,#9f1239)] p-6 text-white"><div className="flex items-start justify-between gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Trash2 size={21}/></div><button type="button" disabled={busy} onClick={() => setBusinessDeleteCandidate(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 disabled:opacity-50" aria-label="Silme penceresini kapat"><X size={18}/></button></div><h2 id="delete-business-title" className="mt-4 text-2xl font-black">{businessDeleteCandidate.businessName} silinsin mi?</h2><p className="mt-2 break-all text-xs text-white/65">{businessDeleteCandidate.businessId}</p></div>
        <div className="space-y-4 p-5 sm:p-6"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-bold text-rose-900">Yalnızca bu işletme/mağaza silinecek.</p><p className="mt-1 text-xs leading-5 text-rose-700">Aynı hesaba bağlı diğer mağazalar ve kullanıcı hesabı korunur. Bu mağazanın randevu, müşteri, hizmet ve operasyon kayıtları geri alınamaz.</p></div><label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Onaylamak için <b className="text-rose-700">EVET</b> yazın</span><input autoFocus value={businessDeleteConfirmation} onChange={(event) => setBusinessDeleteConfirmation(event.target.value)} placeholder="EVET" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold uppercase text-slate-950 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"/></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={busy} onClick={() => setBusinessDeleteCandidate(null)}>Vazgeç</Button><Button type="button" variant="danger" disabled={busy || businessDeleteConfirmation.trim().toLocaleUpperCase("tr-TR") !== "EVET"} onClick={() => void confirmBusinessDelete()}><Trash2 size={15}/>{busy ? "Siliniyor…" : "Yalnızca bu işletmeyi sil"}</Button></div></div>
      </section></div>}
    </div>
  );
}
