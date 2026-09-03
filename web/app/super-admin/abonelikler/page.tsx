"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { collection, doc, getDoc, getDocs, type DocumentData } from "firebase/firestore";
import { BadgeCheck, CircleAlert, Plus, ReceiptText, RefreshCw, Save, Store, UsersRound, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLAN_PRICE, PLAN_LABEL, PLAN_FEATURES, PLAN_FEATURE_LIST } from "@/constants/plans";
import { listPlatformPlans, removePlatformPlan, savePlatformPlan, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { getDb } from "@/lib/firebase/firestore";
import type { PaymentProviderKey, SubscriptionStatus } from "@/types/subscription";

type SubscriptionRow = {
  id: string;
  businessId: string;
  businessName: string;
  plan: string;
  status: SubscriptionStatus;
  paymentProvider: PaymentProviderKey;
  renewalEnabled: boolean;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
};

const DEFAULT_PLAN: PlatformPlan = { id: "RANDEVUGO", label: PLAN_LABEL, yearlyPrice: PLAN_PRICE.yearly, monthlyPrice: PLAN_PRICE.monthlyEquivalent, currency: "TRY", trialDays: PLAN_PRICE.trialDays, maxStores: 3, maxStaff: 250, isActive: true, isRecommended: true, description: "Tüm randevu operasyonunu tek merkezden yönetin.", features: [...PLAN_FEATURE_LIST] };

function readDate(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  return undefined;
}

function mapSubscription(id: string, data: DocumentData, businessNames: Map<string, string>): SubscriptionRow {
  const businessId = String(data.businessId ?? id);
  return { id, businessId, businessName: businessNames.get(businessId) ?? "İşletme kaydı bulunamadı", plan: String(data.plan ?? "RANDEVUGO"), status: String(data.status ?? "trialing") as SubscriptionStatus, paymentProvider: String(data.paymentProvider ?? "manual") as PaymentProviderKey, renewalEnabled: data.renewalEnabled === true, trialEndsAt: readDate(data.trialEndsAt), subscriptionEndsAt: readDate(data.subscriptionEndsAt) };
}

async function fetchSubscriptions(): Promise<SubscriptionRow[]> {
  const db = getDb();
  const businessSnapshot = await getDocs(collection(db, "businesses"));
  const businessNames = new Map(businessSnapshot.docs.map((item) => [item.id, String(item.data().name ?? "İsimsiz işletme")]));
  try {
    const subscriptionSnapshot = await getDocs(collection(db, "subscriptions"));
    return subscriptionSnapshot.docs.map((item) => mapSubscription(item.id, item.data(), businessNames));
  } catch {
    const snapshots = await Promise.all(businessSnapshot.docs.map((business) => getDoc(doc(db, "subscriptions", business.id))));
    return snapshots.filter((item) => item.exists()).map((item) => mapSubscription(item.id, item.data(), businessNames));
  }
}

export default function SuperAdminSubscriptionsPage() {
  const f = PLAN_FEATURES;
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const emptyPlan = (): PlatformPlan => ({ ...DEFAULT_PLAN, features: [...DEFAULT_PLAN.features] });
  const [editing, setEditing] = useState<PlatformPlan>(emptyPlan);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadWarning("");
    const [planResult, subscriptionResult] = await Promise.allSettled([listPlatformPlans(), fetchSubscriptions()]);
    if (planResult.status === "fulfilled" && planResult.value.length) setPlans(planResult.value);
    else setPlans([{ ...DEFAULT_PLAN, features: [...DEFAULT_PLAN.features] }]);
    if (subscriptionResult.status === "fulfilled") setSubscriptions(subscriptionResult.value);
    else setSubscriptions([]);
    if (planResult.status === "rejected" || subscriptionResult.status === "rejected") setLoadWarning("Bazı canlı abonelik verilerine erişilemedi. Varsayılan paket gösteriliyor; yetkileri kontrol edip yeniden deneyin.");
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void reload(); });
  }, [reload]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await savePlatformPlan(editing); await reload(); toast.success("Paket kaydedildi."); }
    catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#081923,#0b4050_58%,#0e7490)] px-6 py-7 text-white shadow-xl shadow-cyan-950/15 sm:px-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-cyan-200/15 bg-cyan-200/5" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[.18em] text-cyan-200"><WalletCards size={14}/> GELİR KONTROL MERKEZİ</span><h1 className="mt-4 text-3xl font-semibold tracking-tight">Paketleri, fiyatları ve kapasiteyi yönet.</h1><p className="mt-2 max-w-2xl text-sm text-cyan-50/65">Aylık/yıllık fiyatlandırmayı, deneme süresini, mağaza ve ekip limitlerini canlı olarak yapılandır.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/> Yenile</button><button type="button" onClick={() => setEditing(emptyPlan())} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"><Plus size={17}/> Yeni paket</button></div></div>
      </section>

      {loadWarning && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><CircleAlert size={17}/>{loadWarning}</span><button type="button" onClick={() => void reload()} className="shrink-0 rounded-xl bg-amber-900 px-3 py-2 text-xs font-bold text-white">Yeniden dene</button></div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Tanımlı paket", value: plans.length, icon: ReceiptText }, { label: "Satışa açık", value: plans.filter((plan) => plan.isActive).length, icon: BadgeCheck }, { label: "Maks. mağaza", value: Math.max(0, ...plans.map((plan) => plan.maxStores)), icon: Store }, { label: "Maks. ekip", value: Math.max(0, ...plans.map((plan) => plan.maxStaff)), icon: UsersRound }].map((item) => <article key={item.label} className="flex items-center gap-3 rounded-2xl border border-cyan-950/10 bg-white/80 p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><item.icon size={20}/></span><div><p className="text-xs text-slate-500">{item.label}</p><b className="text-xl text-slate-900">{item.value}</b></div></article>)}
      </div>

      <section className="overflow-hidden rounded-[26px] border border-cyan-950/10 bg-white/85 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-cyan-950/10 px-5 py-4 sm:flex-row sm:items-center">
          <div><p className="text-[10px] font-bold tracking-[.18em] text-cyan-700">ÖDEME OPERASYONU</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Aboneliklerin canlı durumu</h2></div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{subscriptions.filter((item) => item.status === "active").length} aktif</span><span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">{subscriptions.filter((item) => item.status === "trialing").length} denemede</span><span className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">{subscriptions.filter((item) => item.status === "past_due").length} ödeme bekliyor</span></div>
        </div>
        {subscriptions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Henüz abonelik kaydı oluşmadı.</p> : <div className="divide-y divide-cyan-950/5">{subscriptions.slice(0, 12).map((item) => {
          const statusLabel: Record<SubscriptionStatus, string> = { trialing: "Ücretsiz dönemde", active: "Aktif", past_due: "Ödeme bekliyor", cancelled: "İptal", expired: "Süresi doldu" };
          const endDate = item.subscriptionEndsAt ?? item.trialEndsAt;
          return <article key={item.id} className="grid gap-3 px-5 py-4 transition hover:bg-cyan-50/45 md:grid-cols-[1.4fr_.7fr_.7fr_.9fr] md:items-center"><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{item.businessName}</p><p className="truncate text-xs text-slate-500">{item.businessId}</p></div><div><p className="text-[10px] font-bold tracking-wider text-slate-400">PAKET</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.plan}</p></div><div><p className="text-[10px] font-bold tracking-wider text-slate-400">DURUM</p><p className={`mt-1 text-sm font-semibold ${item.status === "active" ? "text-emerald-700" : item.status === "past_due" ? "text-rose-700" : "text-amber-700"}`}>{statusLabel[item.status]}</p></div><div className="flex items-center justify-between gap-3 md:justify-end"><div className="text-right"><p className="text-xs font-semibold uppercase text-slate-700">{item.paymentProvider}</p><p className="text-[11px] text-slate-400">{endDate ? new Date(endDate).toLocaleDateString("tr-TR") : item.renewalEnabled ? "Otomatik yenileme" : "Bitiş tarihi yok"}</p></div>{item.paymentProvider === "manual" ? <span title="Gerçek ödeme sağlayıcısı bağlı değil" className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><CircleAlert size={17}/></span> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><BadgeCheck size={17}/></span>}</div></article>;
        })}</div>}
      </section>

      <Card title="Dinamik Paket Yönetimi" description="Paketleri oluştur, fiyat ve mağaza/ekip limitlerini yönet">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Paket kodu" value={editing.id} onChange={(event) => setEditing({ ...editing, id: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} required />
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
            <Button type="submit" disabled={busy || !editing.id || !editing.label}>{busy ? "Kaydediliyor…" : <><Save size={16}/> Paketi kaydet</>}</Button>
          </form>
          <div className="space-y-3">
            {plans.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-3)]">Henüz dinamik paket yok. Varsayılan paketi kaydederek başla.</p> : plans.map((plan) => <article key={plan.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[var(--text-1)]">{plan.label} <small className="text-[var(--text-3)]">{plan.id}</small> {plan.isRecommended && <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[9px] text-cyan-700">ÖNERİLEN</span>}</p><p className="mt-1 text-xs text-[var(--text-3)]">{plan.description}</p><p className="mt-2 text-sm font-semibold text-[var(--text-2)]">{plan.monthlyPrice.toLocaleString("tr-TR")} {plan.currency}/ay · {plan.yearlyPrice.toLocaleString("tr-TR")} {plan.currency}/yıl</p><p className="mt-1 text-xs text-[var(--text-3)]">{plan.trialDays} gün deneme · {plan.maxStores} mağaza · {plan.maxStaff} çalışan · {plan.features.length} özellik</p></div><span className={`rounded-full px-2 py-1 text-xs ${plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{plan.isActive ? "Aktif" : "Kapalı"}</span></div>
              <div className="mt-3 flex gap-2"><Button variant="secondary" className="text-xs" onClick={() => setEditing(plan)}>Düzenle</Button><Button variant="danger" className="text-xs" onClick={async () => { if (!confirm(`${plan.label} paketi silinsin mi?`)) return; await removePlatformPlan(plan.id); await reload(); }}>Sil</Button></div>
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
