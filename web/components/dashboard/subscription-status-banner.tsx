"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CreditCard, LoaderCircle } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessSubscription } from "@/features/subscriptions/subscription-repository";
import { subscriptionAccessState, type Subscription } from "@/types/subscription";

export function SubscriptionStatusBanner() {
  const { businessId, access } = useBusiness();
  const [result, setResult] = useState<{ businessId: string; subscription: Subscription | null } | null>(null);

  useEffect(() => {
    if (!businessId || access?.role === "staff") return;
    let mounted = true;
    getBusinessSubscription(businessId)
      .then((value) => { if (mounted) setResult({ businessId, subscription: value }); })
      .catch(() => { if (mounted) setResult({ businessId, subscription: null }); });
    return () => { mounted = false; };
  }, [access?.role, businessId]);

  if (access?.role === "staff") return null;
  const loading = Boolean(businessId && result?.businessId !== businessId);
  const subscription = result?.businessId === businessId ? result.subscription : null;
  if (loading) return <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--text-3)]"><LoaderCircle size={15} className="animate-spin"/> Abonelik durumu kontrol ediliyor</div>;

  const state = subscriptionAccessState(subscription);
  if (state === "active") return null;
  const expired = state === "expired" || state === "loading";
  const endValue = subscription?.status === "trialing" ? subscription.trialEndsAt : subscription?.subscriptionEndsAt;
  const endLabel = endValue ? new Date(endValue).toLocaleDateString("tr-TR") : null;

  return (
    <section className={`mt-4 flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${expired ? "border-rose-300 bg-rose-50 text-rose-950" : "border-amber-300 bg-amber-50 text-amber-950"}`} role="status">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${expired ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{expired ? <AlertTriangle size={19}/> : <CreditCard size={19}/>}</span>
        <div><b className="text-sm">{expired ? "Randevu kabulü durduruldu" : "Ücretsiz kullanım süreniz yakında doluyor"}</b><p className="mt-1 text-xs leading-5 opacity-75">{expired ? "Yeni randevu alınamaz; mevcut randevularınız ve verileriniz korunur." : `${endLabel ?? "Yakında"} tarihine kadar ödeme yaparak kesintisiz devam edin.`}</p></div>
      </div>
      <Link href="/dashboard/abonelik" className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white ${expired ? "bg-rose-700" : "bg-amber-700"}`}>Ödeme Yap <ArrowRight size={16}/></Link>
    </section>
  );
}
