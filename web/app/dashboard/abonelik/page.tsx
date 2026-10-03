"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessSubscription, requestSubscriptionPurchase } from "@/features/subscriptions/subscription-repository";
import { listPlatformPlans, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { isSubscriptionActive, type Subscription } from "@/types/subscription";

export default function SubscriptionPage() {
  const { businessId } = useBusiness();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    Promise.all([getBusinessSubscription(businessId), listPlatformPlans()])
      .then(([current, rows]) => { if (alive) { setSubscription(current); setPlans(rows.filter((item) => item.isActive)); } })
      .catch(() => { if (alive) toast.error("Paket bilgileri alınamadı."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [businessId]);

  async function choosePlan(plan: PlatformPlan) {
    if (!businessId || busyPlan) return;
    setBusyPlan(plan.id);
    try {
      const result = await requestSubscriptionPurchase({ businessId, planId: plan.id, billingCycle: cycle });
      if (result.checkoutUrl) return window.location.assign(result.checkoutUrl);
      if (result.status === "completed") {
        setSubscription(await getBusinessSubscription(businessId));
        toast.success(`${plan.label} paketi hesabınıza tanımlandı.`);
      } else toast.success("Paket talebiniz ödeme bekleyen işlemlere alındı.");
    } catch (error) {
      toast.error((error as Error).message || "Paket seçimi tamamlanamadı.");
    } finally { setBusyPlan(null); }
  }

  if (loading) return <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-[var(--accent)]"/></div>;
  const active = isSubscriptionActive(subscription);
  const lifetime = subscription?.isLifetime === true || subscription?.accessMode === "lifetime";
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan);

  return <div className="space-y-6">
    <section className="dashboard-theme-hero relative overflow-hidden rounded-[30px] p-7 text-white shadow-xl sm:p-9">
      <div className="dashboard-theme-hero__orb absolute -right-14 -top-20 h-60 w-60 rounded-full"/>
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><span className="dashboard-theme-hero__kicker text-[10px] font-black tracking-[.18em]">ABONELİK MERKEZİ</span><h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight">İşletmenize uygun paketi seçin.</h1><p className="dashboard-theme-hero__description mt-3 max-w-2xl text-sm leading-7">Paketinizde bulunan özellikler panelinize yansır. Paket değişiminde mevcut verileriniz korunur.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><small className="text-white/65">MEVCUT PAKET</small><b className="mt-1 block text-xl">{currentPlan?.label ?? subscription?.plan ?? "Tanımsız"}</b><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${active ? "bg-emerald-300 text-emerald-950" : "bg-rose-200 text-rose-900"}`}>{lifetime ? "Süresiz" : active ? "Aktif" : "Süresi doldu"}</span></div></div>
    </section>
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)]"><ShieldCheck size={19}/></span><div><b className="text-sm text-[var(--text-1)]">Güvenli paket geçişi</b><p className="text-xs text-[var(--text-3)]">Ücret tahsil edilmeden ücretli paket aktifleştirilmez; kayıtlarınız hiçbir zaman silinmez.</p></div></div>
    <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><span className="text-[10px] font-black tracking-[.16em] text-[var(--accent)]">PAKETLER</span><h2 className="mt-1 text-2xl font-bold text-[var(--text-1)]">İhtiyacınız kadarını seçin</h2></div><div className="inline-flex rounded-xl bg-[var(--surface-2)] p-1"><CycleButton active={cycle === "monthly"} onClick={() => setCycle("monthly")}>Aylık</CycleButton><CycleButton active={cycle === "yearly"} onClick={() => setCycle("yearly")}>Yıllık</CycleButton></div></div>
      {plans.length === 0 ? <p className="mt-6 rounded-2xl bg-[var(--surface-2)] p-6 text-center text-sm text-[var(--text-3)]">Şu anda satışa açık paket bulunmuyor.</p> : <div className="mt-6 grid gap-4 xl:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} cycle={cycle} selected={plan.id === subscription?.plan} lifetime={lifetime} busy={busyPlan !== null} onChoose={() => void choosePlan(plan)}/>)}</div>}
      <p className="mt-5 text-center text-[10px] leading-5 text-[var(--text-3)]">Ödeme sağlayıcısı hazırsa güvenli ödeme ekranı açılır. Henüz yapılandırılmadıysa talep kaydedilir ve ücret tahsil edilmeden paket açılmaz.</p>
    </section>
  </div>;
}

function CycleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-xs font-bold ${active ? "bg-[var(--surface-1)] text-[var(--text-1)] shadow" : "text-[var(--text-3)]"}`}>{children}</button>;
}

function PlanCard({ plan, cycle, selected, lifetime, busy, onChoose }: { plan: PlatformPlan; cycle: "monthly" | "yearly"; selected: boolean; lifetime: boolean; busy: boolean; onChoose: () => void }) {
  const entitlements = plan.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  return <article className={`relative flex flex-col rounded-[24px] border p-5 ${plan.isRecommended ? "border-[var(--accent)] shadow-lg" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>{plan.isRecommended && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[9px] font-black text-white"><Sparkles size={11}/> ÖNERİLEN</span>}<small className="font-black tracking-[.14em] text-[var(--accent)]">{plan.id}</small><h3 className="mt-2 text-2xl font-bold text-[var(--text-1)]">{plan.label}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-[var(--text-3)]">{plan.description}</p><p className="mt-5"><b className="text-3xl text-[var(--text-1)]">{price.toLocaleString("tr-TR")} {plan.currency === "TRY" ? "₺" : plan.currency}</b><span className="text-xs text-[var(--text-3)]"> / {cycle === "yearly" ? "yıl" : "ay"}</span></p><div className="mt-4 flex gap-2 text-[10px] font-bold text-[var(--text-2)]"><span className="rounded-lg bg-[var(--surface-1)] px-2 py-1">{plan.maxStores} şube</span><span className="rounded-lg bg-[var(--surface-1)] px-2 py-1">{plan.maxStaff} çalışan</span></div><ul className="mt-5 flex-1 space-y-2">{entitlements.map((key) => <li key={key} className="flex items-center gap-2 text-xs font-semibold text-[var(--text-2)]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={12}/></span>{entitlementLabel(key)}</li>)}</ul><button type="button" disabled={selected || lifetime || busy} onClick={onChoose} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-bold text-white shadow-lg disabled:opacity-55"><CreditCard size={17}/>{selected ? "Mevcut paketiniz" : lifetime ? "Süresiz erişim aktif" : busy ? "Hazırlanıyor…" : "Bu paketi seç"}</button></article>;
}
