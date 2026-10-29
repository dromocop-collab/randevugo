"use client";

// Süper adminin kapattığı bölüm doğrudan adresle açılınca sayfa yerine bilgi ekranı (Panel Tasarımı › Menü › Sayfayı kapat).
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardDesign } from "@/features/dashboard-design/dashboard-design-context";
import { disabledSectionFor } from "@/features/dashboard-design/design-domain";
import { Button, Callout, EmptyState } from "@/components/dashboard/ui";
import { useT } from "@/i18n/client";

const ADMIN_EMAIL = "cihatwin@gmail.com";

export function DesignSectionGate({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const { user } = useAuth();
  const { design } = useDashboardDesign();
  const closed = disabledSectionFor(pathname, design);
  if (!closed) return <>{children}</>;
  // Süper admin (destek modu dahil) kapalı bölümü görmeye devam eder; işletmeler göremez.
  if (user?.email?.toLowerCase() === ADMIN_EMAIL) {
    return <>
      <Callout tone="amber" title={t("Bu bölüm işletmelere kapalı")}>{t("Panel Tasarımı'nda kapattığın için işletmeler bu sayfayı göremez; sen süper admin olarak görüyorsun.")}</Callout>
      {children}
    </>;
  }
  return (
    <EmptyState
      icon={Lock}
      title={t("Bu bölüm şu an kullanılamıyor")}
      description={t("Bu sayfa platform tarafından geçici olarak kapatıldı. Sorunuz varsa destek ekibimize yazabilirsiniz.")}
      action={<Button variant="primary" href="/dashboard">{t("Ana sayfaya dön")}</Button>}
    />
  );
}
