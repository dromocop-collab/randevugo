"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/ui/states";

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
    return <LoadingState title="Oturum kontrol ediliyor" description="Paneliniz yukleniyor." />;
  }

  if (status === "unauthenticated") {
    return <LoadingState title="Girişe yönlendiriliyor" description="Güvenli giriş ekranı hazırlanıyor." />;
  }

  return <>{children}</>;
}
