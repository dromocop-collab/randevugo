"use client";

import { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { useT } from "@/i18n/client";
import { Button, EmptyState, Panel, Skeleton } from "@/components/dashboard/ui";

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Skeleton height={132} radius={26} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Skeleton height={96} radius={20} /><Skeleton height={96} radius={20} />
      </div>
      <Skeleton height={280} radius={22} />
    </div>
  );
}

export function RequireBusiness({ children }: { children: ReactNode }) {
  const t = useT();
  const { loading, businesses, businessId, access } = useBusiness();
  const pathname = usePathname();
  const router = useRouter();
  const staffAllowed = ["/dashboard/takvim", "/dashboard/randevular", "/dashboard/destek"];
  if (access?.permissions.viewCustomers) staffAllowed.push("/dashboard/musteriler");

  useEffect(() => {
    if (!loading && access?.role === "staff" && pathname === "/dashboard") router.replace("/dashboard/takvim");
  }, [access?.role, loading, pathname, router]);

  if (loading) return <PanelSkeleton label={t("İşletmeler yükleniyor")} />;

  if (!businessId || businesses.length === 0) {
    return (
      <Panel>
        <EmptyState
          mascot="wave"
          title={t("Henüz bir işletme bağlı değil")}
          description={t("İşletme panelini kullanmak için güvenli kurulum adımlarını tamamlayın.")}
          action={<Button href="/onboarding" variant="primary" trailingIcon={ArrowRight}>{t("İşletmemi kur")}</Button>}
        />
      </Panel>
    );
  }

  if (access?.role === "staff" && pathname === "/dashboard") return <PanelSkeleton label={t("Çalışan paneli açılıyor")} />;

  if (access?.role === "staff" && !staffAllowed.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return (
      <Panel>
        <EmptyState
          mascot="thinking"
          title={t("Bu alan yöneticilere özel")}
          description={t("Çalışan hesabınız yalnızca size tanımlanan operasyon alanlarına erişebilir.")}
          action={<Button href="/dashboard/takvim" variant="primary" icon={CalendarDays}>{t("Kendi takvimime dön")}</Button>}
        />
      </Panel>
    );
  }

  return <>{children}</>;
}
