"use client";

import { usePathname } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { DASHBOARD_ROUTE_ENTITLEMENTS, entitlementLabel } from "@/constants/subscription-entitlements";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { Badge, Button, Panel, Skeleton } from "@/components/dashboard/ui";
import styles from "./subscription.module.css";

export function SubscriptionFeatureGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, can, plan } = useSubscriptionPlan();
  const matchedRoute = Object.keys(DASHBOARD_ROUTE_ENTITLEMENTS)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  const entitlement = matchedRoute ? DASHBOARD_ROUTE_ENTITLEMENTS[matchedRoute] : undefined;

  if (loading) return (
    <div className={styles.gateLoading} role="status" aria-label="Paket bilgisi yükleniyor">
      <Skeleton height={120} radius={26} />
      <div className={styles.gateLoadingRow}><Skeleton height={92} radius={20} /><Skeleton height={92} radius={20} /></div>
      <Skeleton height={260} radius={22} />
    </div>
  );
  if (!entitlement || can(entitlement)) return children;

  return (
    <Panel className={styles.gate}>
      <div className={styles.gateInner}>
        <span className={styles.gateIcon}><LockKeyhole size={26} aria-hidden /></span>
        <Badge tone="accent" icon={Sparkles}>Paket özelliği</Badge>
        <h1 className={styles.gateTitle}>{entitlementLabel(entitlement)} paketinizde yer almıyor.</h1>
        <p className={styles.gateText}>Şu an <b>{plan?.label ?? "mevcut"}</b> paketini kullanıyorsunuz. Bu alanı açmak için özelliği içeren pakete geçebilirsiniz.</p>
        <Button href="/dashboard/abonelik" variant="primary" size="lg" trailingIcon={ArrowRight}>Paketleri incele</Button>
      </div>
    </Panel>
  );
}
