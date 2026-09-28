"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { collection, doc, getDoc, getDocs, type DocumentData } from "firebase/firestore";
import { BadgeCheck, CalendarClock, CircleAlert, Copy, Crown, PencilLine, Plus, ReceiptText, RefreshCw, Save, Search, Store, Trash2, UsersRound, WalletCards, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAN_PRICE, PLAN_LABEL, PLAN_FEATURES, PLAN_FEATURE_LIST } from "@/constants/plans";
import { listPlatformPlans, removePlatformPlan, savePlatformPlan, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { backfillLegacyBusinessSubscriptions, ensureAdminOwnedBusinessesLifetime, updateBusinessSubscription, type AdminSubscriptionMode } from "@/features/subscriptions/admin-subscription-repository";
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

const DEFAULT_PLAN: PlatformPlan = { id: "RANDEVUGO", label: PLAN_LABEL, yearlyPrice: PLAN_PRICE.yearly, monthlyPrice: PLAN_PRICE.monthlyEquivalent, currency: "TRY", trialDays: PLAN_PRICE.trialDays, maxStores: 3, maxStaff: 250, isActive: true, isRecommended: true, description: "Tüm randevu operasyonunu tek merkezden yönetin.", features: [...PLAN_FEATURE_LIST] };

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
  const f = PLAN_FEATURES;
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const emptyPlan = (): PlatformPlan => ({ ...DEFAULT_PLAN, features: [...DEFAULT_PLAN.features] });
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
  const editorRef = useRef<HTMLFormElement>(null);
  const adminLifetimeSynced = useRef(false);

  function focusEditor() {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => editorRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus(), 450);
    });
  }

  function startNewPlan(source?: PlatformPlan) {
    setEditingPlanId(null);
    setEditing(source ? { ...source, id: `${source.id}_KOPYA`, label: `${source.label} Kopya`, isRecommended: false, features: [...source.features] } : { ...emptyPlan(), id: "", label: "", isRecommended: false });
    focusEditor();
  }

  function startEditing(plan: PlatformPlan) {
    setEditingPlanId(plan.id);
    setEditing({ ...plan, features: [...plan.features] });
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
    const [planResult, subscriptionResult] = await Promise.allSettled([listPlatformPlans(), fetchSubscriptions()]);
    if (planResult.status === "fulfilled" && planResult.value.length) setPlans(planResult.value);
    else setPlans([{ ...DEFAULT_PLAN, features: [...DEFAULT_PLAN.features] }]);
    if (subscriptionResult.status === "fulfilled") setSubscriptions(subscriptionResult.value);
    else setSubscriptions([]);
    if (planResult.status === "rejected" || subscriptionResult.status === "rejected") setLoadWarning("Bazı canlı abonelik verilerine erişilemedi. Varsayılan paket gösteriliyor; yetkileri kontrol edip yeniden deneyin.");
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void reload(true); });
  }, [reload]);

  function openSubscriptionEditor(item: SubscriptionRow) {
    const mode: AdminSubscriptionMode = item.isLifetime ? "lifetime" : item.status;
    const end = subscriptionEnd(item);
    setSubscriptionEditor(item);
    setSubscriptionMode(mode);
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
      const result = await updateBusinessSubscription({ businessId: subscriptionEditor.businessId, mode: subscriptionMode, ...(timed && endAtMillis ? { endAtMillis } : {}) });
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
    if (!Number.isInteger(editing.maxStores) || editing.maxStores < 1 || editing.maxStores > 3) { toast.error("Mağaza limiti 1–3 arasında olmalıdır."); return; }
    if (!Number.isInteger(editing.maxStaff) || editing.maxStaff < 1) { toast.error("Çalışan limiti en az 1 olmalıdır."); return; }
    if (editing.features.length === 0) { toast.error("Pakete en az bir özellik ekleyin."); return; }
    setBusy(true);
    try { await savePlatformPlan({ ...editing, id: editing.id.trim(), label: editing.label.trim(), description: editing.description.trim() }); setEditingPlanId(editing.id); await reload(); toast.success(editingPlanId ? "Paket değişiklikleri kaydedildi." : "Yeni paket oluşturuldu."); }
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
          return <article key={item.id} className="grid gap-4 px-5 py-4 transition hover:bg-cyan-50/45 xl:grid-cols-[1.35fr_.65fr_.75fr_1fr_auto] xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-slate-950">{item.businessName}</p>{item.isLifetime && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-[9px] font-black text-violet-700"><Crown size={11}/> SÜRESİZ</span>}</div><p className="truncate text-xs text-slate-500">{item.businessId}</p></div><div><p className="text-[10px] font-bold tracking-wider text-slate-400">PAKET</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.plan}</p></div><div><p className="text-[10px] font-bold tracking-wider text-slate-400">DURUM</p><p className={`mt-1 text-sm font-semibold ${item.isLifetime || item.status === "active" ? "text-emerald-700" : ["past_due", "expired", "cancelled"].includes(item.status) ? "text-rose-700" : "text-amber-700"}`}>{item.isLifetime ? "Süresiz" : statusLabel[item.status]}</p></div><div className="rounded-xl bg-slate-50 px-3 py-2"><p className={`text-sm font-bold ${item.isLifetime ? "text-violet-700" : days !== null && Number.isFinite(days) && days <= 7 ? "text-rose-700" : "text-slate-800"}`}>{remainingLabel}</p><p className="mt-0.5 text-[11px] text-slate-400">{item.isLifetime ? "Bitiş tarihi uygulanmaz" : endDate ? `Bitiş: ${new Date(endDate).toLocaleDateString("tr-TR")}` : "Bitiş tarihi tanımsız"}</p></div><button type="button" onClick={() => openSubscriptionEditor(item)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 text-xs font-bold text-white transition hover:bg-cyan-800"><CalendarClock size={15}/> Süreyi düzenle</button></article>;
        })}</div>}
      </section>

      <Card title="Dinamik Paket Yönetimi" description="Paketleri oluştur, fiyat ve mağaza/ekip limitlerini yönet">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <form ref={editorRef} onSubmit={submit} className={`space-y-3 rounded-2xl border bg-[var(--surface-2)] p-4 transition-all duration-300 ${editingPlanId ? "border-cyan-400 shadow-lg shadow-cyan-950/10 ring-4 ring-cyan-500/5" : "border-[var(--border)]"}`}>
            <div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-black tracking-[.16em] text-cyan-700">{editingPlanId ? "DÜZENLEME MODU" : "YENİ PAKET"}</span><h3 className="mt-1 font-bold text-[var(--text-1)]">{editingPlanId ? `${editing.label} paketini düzenle` : "Yeni paket oluştur"}</h3></div>{editingPlanId && <button type="button" onClick={() => startNewPlan()} className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-2)] hover:bg-white"><X size={14}/> İptal</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Paket kodu" value={editing.id} disabled={Boolean(editingPlanId)} title={editingPlanId ? "Mevcut paketin kodu değiştirilemez" : undefined} onChange={(event) => setEditing({ ...editing, id: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} required />
              <Input label="Görünen ad" value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} required />
              <Input label="Yıllık fiyat (₺)" type="number" value={editing.yearlyPrice} onChange={(event) => setEditing({ ...editing, yearlyPrice: Number(event.target.value) })} min={0} />
              <Input label="Aylık fiyat (₺)" type="number" value={editing.monthlyPrice} onChange={(event) => setEditing({ ...editing, monthlyPrice: Number(event.target.value) })} min={0} />
              <Input label="Para birimi" value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value.toUpperCase().slice(0, 3) })} />
              <Input label="Ücretsiz dönem (gün)" type="number" value={editing.trialDays} onChange={(event) => setEditing({ ...editing, trialDays: Number(event.target.value) })} min={0} />
              <Input label="Maks. mağaza" type="number" value={editing.maxStores} onChange={(event) => setEditing({ ...editing, maxStores: Number(event.target.value) })} min={1} max={3} />
              <Input label="Maks. çalışan" type="number" value={editing.maxStaff} onChange={(event) => setEditing({ ...editing, maxStaff: Number(event.target.value) })} min={1} />
            </div>
            <Input label="Paket açıklaması" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
            <label className="block space-y-2 text-sm text-[var(--text-2)]"><span>Özellikler (her satıra bir özellik)</span><textarea rows={5} value={editing.features.join("\n")} onChange={(event) => setEditing({ ...editing, features: event.target.value.split("\n").map((row) => row.trim()).filter(Boolean) })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-cyan-500" /></label>
            <div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text-2)]"><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /> Satışa ve atamaya açık</label><label className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text-2)]"><input type="checkbox" checked={editing.isRecommended} onChange={(event) => setEditing({ ...editing, isRecommended: event.target.checked })} /> Önerilen paket rozeti</label></div>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !editing.id || !editing.label}>{busy ? "Kaydediliyor…" : <><Save size={16}/> {editingPlanId ? "Değişiklikleri kaydet" : "Paketi oluştur"}</>}</Button>{editingPlanId && <Button type="button" variant="secondary" onClick={() => startNewPlan(editing)}><Copy size={15}/> Kopyasını oluştur</Button>}</div>
          </form>
          <div className="space-y-3">
            {plans.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-3)]">Henüz dinamik paket yok. Varsayılan paketi kaydederek başla.</p> : plans.map((plan) => <article key={plan.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[var(--text-1)]">{plan.label} <small className="text-[var(--text-3)]">{plan.id}</small> {plan.isRecommended && <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[9px] text-cyan-700">ÖNERİLEN</span>}</p><p className="mt-1 text-xs text-[var(--text-3)]">{plan.description}</p><p className="mt-2 text-sm font-semibold text-[var(--text-2)]">{plan.monthlyPrice.toLocaleString("tr-TR")} {plan.currency}/ay · {plan.yearlyPrice.toLocaleString("tr-TR")} {plan.currency}/yıl</p><p className="mt-1 text-xs text-[var(--text-3)]">{plan.trialDays} gün deneme · {plan.maxStores} mağaza · {plan.maxStaff} çalışan · {plan.features.length} özellik</p></div><span className={`rounded-full px-2 py-1 text-xs ${plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{plan.isActive ? "Aktif" : "Kapalı"}</span></div>
              <div className="mt-3 flex gap-2"><Button type="button" variant="secondary" className="text-xs" onClick={() => startEditing(plan)}><PencilLine size={14}/> Düzenle</Button><Button type="button" variant="danger" className="text-xs" onClick={() => setDeleteCandidate(plan)}><Trash2 size={14}/> Sil</Button></div>
            </article>)}
          </div>
        </div>
      </Card>
      <Card title="Abonelik Planı" description="Tek paket. Tüm özellikler.">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--text-1)]">
                {PLAN_LABEL}
              </h3>
              <div className="text-right">
                <span className="text-2xl font-bold text-[var(--accent)]">
                  {PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺
                </span>
                <span className="text-sm text-[var(--text-3)]"> / yıl</span>
                <p className="text-xs text-[var(--text-3)]">
                  Ayda yaklaşık {PLAN_PRICE.monthlyEquivalent} ₺
                </p>
              </div>
            </div>

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              İlk {PLAN_PRICE.trialDays} gün ücretsiz kullanım
            </div>

            <ul className="mt-5 space-y-2 text-sm">
              <FeatureRow label="Maks. Çalışan" value={f.maxStaff === -1 ? "Sınırsız" : String(f.maxStaff)} />
              <FeatureRow label="Maks. Şube" value={f.maxBranches === -1 ? "Sınırsız" : String(f.maxBranches)} />
              <FeatureRow
                label="Aylık Randevu"
                value={f.maxAppointmentsPerMonth === -1 ? "Sınırsız" : String(f.maxAppointmentsPerMonth)}
              />
              <FeatureRow label="Kapora" value={f.canUseDeposits} />
              <FeatureRow label="Gelişmiş Analiz" value={f.canUseAdvancedAnalytics} />
              <FeatureRow label="Çoklu Şube" value={f.canUseMultiBranch} />
              <FeatureRow label="API Erişimi" value={f.canUseApi} />
              <FeatureRow label="CRM" value={f.canUseCRM} />
              <FeatureRow label="Branding" value={f.canUseBranding} />
              <FeatureRow label="Bildirimler" value={f.canUseNotifications} />
              <FeatureRow label="Raporlama" value={f.canUseReports} />
              <FeatureRow label="Yorum Sistemi" value={f.canUseReviews} />
              <FeatureRow label="QR Kodu" value={f.canUseQR} />
            </ul>
          </div>

          <Card title="Özellik Listesi" description="Abonelere sunulan özellikler" className="mt-5">
            <ul className="grid grid-cols-2 gap-2 text-sm text-[var(--text-2)]">
              {PLAN_FEATURE_LIST.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Card>
      {subscriptionEditor && <div className="fixed inset-0 z-[210] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !busy && setSubscriptionEditor(null)}><section role="dialog" aria-modal="true" aria-labelledby="subscription-editor-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-2xl"><div className="bg-[linear-gradient(135deg,#071f2a,#0e7490)] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-black tracking-[.16em] text-cyan-200">ABONELİK ERİŞİMİ</span><h2 id="subscription-editor-title" className="mt-2 text-2xl font-bold">{subscriptionEditor.businessName}</h2><p className="mt-1 text-xs text-white/65">Değişiklik aynı firmaya bağlı tüm şubelere uygulanır.</p></div><button type="button" disabled={busy} onClick={() => setSubscriptionEditor(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50" aria-label="Pencereyi kapat"><X size={17}/></button></div></div><div className="space-y-5 p-6"><div><label className="mb-2 block text-sm font-bold text-slate-800">Erişim durumu</label><select value={subscriptionMode} onChange={(event) => setSubscriptionMode(event.target.value as AdminSubscriptionMode)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"><option value="trialing">Ücretsiz deneme</option><option value="active">Aktif abonelik</option><option value="lifetime">Süresiz erişim</option><option value="past_due">Ödeme bekliyor</option><option value="expired">Süresi doldu</option><option value="cancelled">İptal edildi</option></select></div>{["active", "trialing"].includes(subscriptionMode) && <div><Input label="Bitiş tarihi" type="date" value={subscriptionEndDate} onChange={(event) => setSubscriptionEndDate(event.target.value)} min={new Date(renderedAt + 86_400_000).toISOString().slice(0, 10)} required/><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => addSubscriptionDays(30)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">+30 gün</button><button type="button" onClick={() => addSubscriptionDays(90)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">+90 gün</button><button type="button" onClick={() => addSubscriptionDays(365)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">+1 yıl</button></div></div>}{subscriptionMode === "lifetime" && <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-900"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100"><Crown size={18}/></span><div><b className="text-sm">Bu işletmenin süresi hiç dolmaz</b><p className="mt-1 text-xs leading-5 text-violet-700">Randevu kabulü abonelik tarihi nedeniyle kısıtlanmaz. Süper admin işletmeleri otomatik olarak bu moda alınır.</p></div></div>}{["past_due", "expired", "cancelled"].includes(subscriptionMode) && <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs leading-5 text-rose-800"><CircleAlert size={17} className="mt-0.5 shrink-0"/>Bu durum kaydedildiğinde yeni randevu, bekleme listesi ve canlı sıra alımı durdurulur; mevcut veriler korunur.</div>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" disabled={busy} onClick={() => setSubscriptionEditor(null)}>Vazgeç</Button><Button type="button" disabled={busy} onClick={() => void saveSubscriptionAccess()}><Save size={16}/>{busy ? "Kaydediliyor…" : "Erişimi kaydet"}</Button></div></div></section></div>}
      {deleteCandidate && <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setDeleteCandidate(null)}><section role="dialog" aria-modal="true" aria-labelledby="delete-plan-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-[26px] border border-white/15 bg-white p-6 shadow-2xl"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Trash2 size={21}/></div><h2 id="delete-plan-title" className="mt-4 text-xl font-bold text-slate-950">{deleteCandidate.label} silinsin mi?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Bu işlem paket tanımını kalıcı olarak kaldırır. Aktif aboneliğe atanmış paketlerin silinmesine izin verilmez.</p>{subscriptions.some((item) => item.plan === deleteCandidate.id) && <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><CircleAlert size={15}/> {subscriptions.filter((item) => item.plan === deleteCandidate.id).length} abonelik bu paketi kullanıyor</div>}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleteCandidate(null)}>Vazgeç</Button><Button type="button" variant="danger" disabled={busy || subscriptions.some((item) => item.plan === deleteCandidate.id)} onClick={() => void confirmDeletePlan()}><Trash2 size={15}/> Kalıcı olarak sil</Button></div></section></div>}
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: string | boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[var(--text-3)]">{label}</span>
      {typeof value === "boolean" ? (
        <span className={value ? "text-emerald-600" : "text-rose-400"}>
          {value ? "✓" : "✗"}
        </span>
      ) : (
        <span className="font-medium text-[var(--text-1)]">{value}</span>
      )}
    </li>
  );
}
