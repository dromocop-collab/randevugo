"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listPlatformPlans, type PlatformPlan } from "@/features/subscriptions/platform-plan-repository";
import { getBusinessSubscription } from "@/features/subscriptions/subscription-repository";
import { ALL_SUBSCRIPTION_ENTITLEMENTS, type SubscriptionEntitlement } from "@/constants/subscription-entitlements";
import type { Subscription } from "@/types/subscription";

type SubscriptionPlanContextValue = {
  loading: boolean;
  subscription: Subscription | null;
  plan: PlatformPlan | null;
  entitlements: SubscriptionEntitlement[];
  can: (entitlement: SubscriptionEntitlement) => boolean;
  refresh: () => void;
};

const SubscriptionPlanContext = createContext<SubscriptionPlanContextValue>({
  loading: true,
  subscription: null,
  plan: null,
  entitlements: ALL_SUBSCRIPTION_ENTITLEMENTS,
  can: () => true,
  refresh: () => undefined,
});

export function SubscriptionPlanProvider({ children }: { children: ReactNode }) {
  const { businessId } = useBusinessContext();
  const [state, setState] = useState<{ businessId: string; subscription: Subscription | null; plans: PlatformPlan[] } | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    Promise.all([getBusinessSubscription(businessId), listPlatformPlans()])
      .then(([subscription, plans]) => {
        if (alive) setState({ businessId, subscription, plans });
      })
      .catch(() => {
        if (alive) setState({ businessId, subscription: null, plans: [] });
      });
    return () => { alive = false; };
  }, [businessId, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const value = useMemo<SubscriptionPlanContextValue>(() => {
    const current = state?.businessId === businessId ? state : null;
    const subscription = current?.subscription ?? null;
    const plan = current?.plans.find((item) => item.id === subscription?.plan) ?? null;
    // Legacy subscriptions and pre-matrix packages keep full access. Once a plan
    // is saved with an entitlement matrix, that matrix becomes authoritative.
    const entitlements = plan?.entitlements.length ? plan.entitlements : ALL_SUBSCRIPTION_ENTITLEMENTS;
    return {
      loading: Boolean(businessId && !current),
      subscription,
      plan,
      entitlements,
      can: (entitlement) => entitlements.includes(entitlement),
      refresh,
    };
  }, [businessId, refresh, state]);

  return <SubscriptionPlanContext.Provider value={value}>{children}</SubscriptionPlanContext.Provider>;
}

export function useSubscriptionPlan() {
  return useContext(SubscriptionPlanContext);
}
