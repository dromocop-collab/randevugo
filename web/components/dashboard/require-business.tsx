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
        title="İşletmeler yükleniyor"
        description="Hesabınıza ait çalışma alanları kontrol ediliyor."
      />
    );
  }

  if (!businessId || businesses.length === 0) {
    return (
      <EmptyState
        title="Henüz bir işletme bağlı değil"
        description="İşletme panelini kullanmak için güvenli kurulum adımlarını tamamlayın."
        action={<Link href="/onboarding" className="font-bold text-[var(--accent)]">İşletmemi kur →</Link>}
      />
    );
  }

  return <>{children}</>;
}
