"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, CreditCard, Headphones, LoaderCircle, ShieldCheck } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessSubscription } from "@/features/subscriptions/subscription-repository";
import { PLAN_FEATURE_LIST, PLAN_PRICE } from "@/constants/plans";
import { isSubscriptionActive, type Subscription } from "@/types/subscription";

export default function SubscriptionPage() {
  const { businessId } = useBusiness();
  const [result, setResult] = useState<{ businessId: string; subscription: Subscription | null } | null>(null);
  const [renderedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!businessId) return;
    let mounted = true;
    getBusinessSubscription(businessId)
      .then((value) => { if (mounted) setResult({ businessId, subscription: value }); })
      .catch(() => { if (mounted) setResult({ businessId, subscription: null }); });
    return () => { mounted = false; };
  }, [businessId]);

  const loading = Boolean(businessId && result?.businessId !== businessId);
  const subscription = result?.businessId === businessId ? result.subscription : null;
  const active = isSubscriptionActive(subscription);
  const lifetime = subscription?.isLifetime === true || subscription?.accessMode === "lifetime";
  const endValue = subscription?.status === "trialing" ? subscription.trialEndsAt : subscription?.subscriptionEndsAt;
  const daysLeft = useMemo(() => endValue ? Math.max(0, Math.ceil((new Date(endValue).getTime() - renderedAt) / 86_400_000)) : null, [endValue, renderedAt]);

  if (loading) return <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-[var(--accent)]"/></div>;

  return <div className="space-y-5">
    <section className="dashboard-theme-hero relative overflow-hidden rounded-[30px] p-7 text-white shadow-xl sm:p-9">
      <div className="dashboard-theme-hero__orb absolute -right-14 -top-20 h-60 w-60 rounded-full"/>
      <div className="relative"><span className="dashboard-theme-hero__kicker text-[10px] font-black tracking-[.18em]">ABONELİK MERKEZİ</span><h1 className="mt-3 text-4xl font-semibold tracking-tight">Randevu akışınız kesintisiz devam etsin.</h1><p className="dashboard-theme-hero__description mt-3 max-w-2xl text-sm leading-7">İlk 90 gün ücretsizdir. Süre dolduğunda mevcut verileriniz korunur ancak yeni randevu kabulü ödeme tamamlanana kadar durur.</p></div>
    </section>

    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-black tracking-[.15em] text-[var(--accent)]">SENİNRANDEVUN</span><h2 className="mt-2 text-2xl font-bold text-[var(--text-1)]">Her şey dahil işletme paketi</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{lifetime ? "Süresiz" : active ? subscription?.status === "trialing" ? "Ücretsiz dönemde" : "Aktif" : "Süresi doldu"}</span></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[var(--surface-2)] p-4"><small className="font-bold text-[var(--text-3)]">AYLIK</small><p className="mt-1"><strong className="text-3xl text-[var(--text-1)]">{PLAN_PRICE.monthly.toLocaleString("tr-TR")} ₺</strong><span className="ml-1 text-sm text-[var(--text-3)]">/ ay</span></p></div><div className="rounded-2xl bg-[var(--surface-2)] p-4"><small className="font-bold text-[var(--text-3)]">YILLIK</small><p className="mt-1"><strong className="text-3xl text-[var(--text-1)]">{PLAN_PRICE.yearly.toLocaleString("tr-TR")} ₺</strong><span className="ml-1 text-sm text-[var(--text-3)]">/ yıl</span></p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info icon={CalendarClock} title={lifetime ? "Süresiz kullanım" : daysLeft === null ? "Bitiş tarihi bekleniyor" : `${daysLeft} gün kaldı`} text={lifetime ? "Bu hesaba bitiş tarihi uygulanmaz" : endValue ? new Date(endValue).toLocaleDateString("tr-TR") : "Abonelik kaydı eksik"}/><Info icon={ShieldCheck} title="Verileriniz korunur" text="Ödeme gecikse bile kayıtlar silinmez"/></div>
        {lifetime ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><b>Platform yöneticisi erişimi</b><p className="mt-1 text-xs leading-5 text-emerald-800">Bu işletme süresiz kullanım hakkına sahiptir; ödeme yapması gerekmez ve randevu alımı abonelik nedeniyle durdurulmaz.</p></div> : <><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><b>Online ödeme yakında açılacak.</b><p className="mt-1 text-xs leading-5 text-amber-800">Ödeme sağlayıcısı etkinleştirilene kadar düğme güvenli bir faturalama talebi açar; ekip hesabınızı manuel olarak yenileyebilir.</p></div><Link href="/dashboard/destek?mode=billing" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-white"><CreditCard size={18}/> Faturalama Talebi Aç</Link><p className="mt-3 flex items-center justify-center gap-2 text-center text-[10px] text-[var(--text-3)]"><Headphones size={13}/> Harici ödeme sayfasına yönlendirilmezsiniz.</p></>}
      </section>
      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm"><h2 className="text-lg font-bold text-[var(--text-1)]">Paket kapsamı</h2><ul className="mt-4 grid gap-2">{PLAN_FEATURE_LIST.map((feature) => <li key={feature} className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2.5 text-xs font-semibold text-[var(--text-2)]"><BadgeCheck size={15} className="text-emerald-600"/>{feature}</li>)}</ul></section>
    </div>
  </div>;
}

function Info({ icon: Icon, title, text }: { icon: typeof CalendarClock; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-1)] text-[var(--accent)]"><Icon size={18}/></span><div><b className="block text-sm text-[var(--text-1)]">{title}</b><small className="text-[10px] text-[var(--text-3)]">{text}</small></div></div>;
}
