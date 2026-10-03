"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";
import { DASHBOARD_ROUTE_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";

export function SubscriptionFeatureGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, can, plan } = useSubscriptionPlan();
  const matchedRoute = Object.keys(DASHBOARD_ROUTE_ENTITLEMENTS)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  const entitlement = matchedRoute ? DASHBOARD_ROUTE_ENTITLEMENTS[matchedRoute] : undefined;

  if (loading) return <div className="min-h-72 animate-pulse rounded-[28px] bg-[var(--surface-2)]" />;
  if (!entitlement || can(entitlement)) return children;

  return <section className="grid min-h-[58vh] place-items-center rounded-[30px] border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center shadow-sm">
    <div className="max-w-lg">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-amber-100 text-amber-700"><LockKeyhole size={27}/></span>
      <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-black tracking-[.16em] text-[var(--accent)]"><Sparkles size={12}/> PAKET ÖZELLİĞİ</span>
      <h1 className="mt-3 text-3xl font-bold text-[var(--text-1)]">{entitlementLabel(entitlement)} paketinizde yer almıyor.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-3)]">Şu an <b className="text-[var(--text-2)]">{plan?.label ?? "mevcut"}</b> paketini kullanıyorsunuz. Bu alanı açmak için özelliği içeren pakete geçebilirsiniz.</p>
      <Link href="/dashboard/abonelik" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-6 text-sm font-bold text-white shadow-lg">Paketleri incele</Link>
    </div>
  </section>;
}
