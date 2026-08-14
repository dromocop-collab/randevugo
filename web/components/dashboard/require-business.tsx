"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useBusiness } from "@/hooks/use-business";
import { EmptyState, LoadingState } from "@/components/ui/states";

export function RequireBusiness({ children }: { children: ReactNode }) {
  const { loading, businesses, businessId } = useBusiness();

  if (loading) {
    return (
      <LoadingState
        title="Isletmeler yukleniyor"
        description="Hesabiniza ait isletmeler kontrol ediliyor."
      />
    );
  }

  if (!businessId || businesses.length === 0) {
    return (
      <EmptyState
        title="Henuz bir isletme bagli degil"
        description="Paneli kullanmak icin once onboarding adimini tamamlayin."
        action={<Link href="/onboarding" className="text-sky-600">Onboarding sayfasina git</Link>}
      />
    );
  }

  return <>{children}</>;
}
