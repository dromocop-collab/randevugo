"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { BrandPageLoader } from "@/components/ui/brand-page-loader";
import { useT } from "@/i18n/client";

export function ProtectedRoute({
  children,
  loginPath = "/isletmeler/giris",
}: {
  children: ReactNode;
  loginPath?: string;
}) {
  const t = useT();
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    const requestedPath = `${pathname}${window.location.search}`;
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(requestedPath)}` : "";
    router.replace(`${loginPath}${next}`);
  }, [loginPath, pathname, router, status]);

  if (status === "loading") {
    return <BrandPageLoader title={t("Oturumunuz güvenle doğrulanıyor")} label={t("Kişisel çalışma alanınız ve tercihleriniz hazırlanıyor.")} eyebrow={t("GÜVENLİ PANEL BAĞLANTISI")} securityMode />;
  }

  if (status === "unauthenticated") {
    return <BrandPageLoader title={t("Girişe yönlendiriliyorsunuz")} label={t("Güvenli giriş ekranı hazırlanıyor.")} eyebrow={t("GÜVENLİ YÖNLENDİRME")} securityMode />;
  }

  return <>{children}</>;
}
