"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CreditCard } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessSubscription } from "@/features/subscriptions/subscription-repository";
import { subscriptionAccessState, type Subscription } from "@/types/subscription";
import { Button, Callout } from "@/components/dashboard/ui";

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
  // Kontrol sürerken yer tutmaz; sonuç gelince yalnızca gerekirse uyarı görünür (sayfa zıplamaz).
  const loading = Boolean(businessId && result?.businessId !== businessId);
  if (loading) return null;
  const subscription = result?.businessId === businessId ? result.subscription : null;

  const state = subscriptionAccessState(subscription);
  if (state === "active") return null;
  const expired = state === "expired" || state === "loading";
  const endValue = subscription?.status === "trialing" ? subscription.trialEndsAt : subscription?.subscriptionEndsAt;
  const endLabel = endValue ? new Date(endValue).toLocaleDateString("tr-TR") : null;

  return (
    <Callout
      tone={expired ? "red" : "amber"}
      icon={expired ? AlertTriangle : CreditCard}
      title={expired ? "Randevu kabulü durduruldu" : "Ücretsiz kullanım süreniz yakında doluyor"}
      action={<Button href="/dashboard/abonelik" variant={expired ? "danger" : "primary"} size="sm" trailingIcon={ArrowRight}>Ödeme yap</Button>}
    >
      <span className="block text-xs opacity-80">{expired ? "Yeni randevu alınamaz; mevcut randevularınız ve verileriniz korunur." : `${endLabel ?? "Yakında"} tarihine kadar ödeme yaparak kesintisiz devam edin.`}</span>
    </Callout>
  );
}
