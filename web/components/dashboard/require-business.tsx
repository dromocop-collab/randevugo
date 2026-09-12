"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBusiness } from "@/hooks/use-business";
import { EmptyState, LoadingState } from "@/components/ui/states";

export function RequireBusiness({ children }: { children: ReactNode }) {
  const { loading, businesses, businessId, access } = useBusiness();
  const pathname = usePathname();
  const router = useRouter();
  const staffAllowed = ["/dashboard/takvim", "/dashboard/randevular", "/dashboard/destek"];
  if (access?.permissions.viewCustomers) staffAllowed.push("/dashboard/musteriler");

  useEffect(() => {
    if (!loading && access?.role === "staff" && pathname === "/dashboard") router.replace("/dashboard/takvim");
  }, [access?.role, loading, pathname, router]);

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

  if (access?.role === "staff" && pathname === "/dashboard") {
    return <LoadingState title="Çalışan paneli açılıyor" description="Kişisel takviminiz hazırlanıyor." />;
  }

  if (access?.role === "staff" && !staffAllowed.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return <EmptyState title="Bu alan yöneticilere özel" description="Çalışan hesabınız yalnızca size tanımlanan operasyon alanlarına erişebilir." action={<Link href="/dashboard/takvim" className="font-bold text-[var(--accent)]">Kendi takvimime dön →</Link>} />;
  }

  return <>{children}</>;
}
