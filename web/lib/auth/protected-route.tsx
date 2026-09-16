"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { BrandPageLoader } from "@/components/ui/brand-page-loader";

export function ProtectedRoute({
  children,
  loginPath = "/isletmeler/giris",
}: {
  children: ReactNode;
  loginPath?: string;
}) {
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
    return <BrandPageLoader title="Oturumunuz güvenle doğrulanıyor" label="Kişisel çalışma alanınız ve tercihleriniz hazırlanıyor." eyebrow="GÜVENLİ PANEL BAĞLANTISI" securityMode />;
  }

  if (status === "unauthenticated") {
    return <BrandPageLoader title="Girişe yönlendiriliyorsunuz" label="Güvenli giriş ekranı hazırlanıyor." eyebrow="GÜVENLİ YÖNLENDİRME" securityMode />;
  }

  return <>{children}</>;
}
