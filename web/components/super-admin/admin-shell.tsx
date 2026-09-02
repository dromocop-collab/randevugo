"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";
import { AdminMobileNav, AdminSidebar } from "@/components/super-admin/admin-sidebar";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/auth-service";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL;
  const [adminCheck, setAdminCheck] = useState<{ uid: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/giris");
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !user || isPrimaryAdmin) return;

    const db = getDb();
    getDoc(doc(db, "platformAdmins", user.uid))
      .then((snap) => {
        setAdminCheck({ uid: user.uid, allowed: snap.exists() });
      })
      .catch(() => {
        setAdminCheck({ uid: user.uid, allowed: false });
      });
  }, [isPrimaryAdmin, status, user]);

  // Derived: primary admin is always allowed, otherwise wait for Firestore check
  const allowed = isPrimaryAdmin ? true : user && adminCheck?.uid === user.uid ? adminCheck.allowed : null;

  if (status === "loading" || status === "unauthenticated" || allowed === null) {
    return (
      <LoadingState
        title={status === "unauthenticated" ? "Girişe yönlendiriliyor" : "Yetki kontrol ediliyor"}
        description={status === "unauthenticated" ? "Güvenli giriş ekranı hazırlanıyor..." : "Platform admin erişimi doğrulanıyor..."}
      />
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          title="Yetkisiz Erişim"
          description="Bu alan yalnızca platform yöneticilerine açıktır."
        />
      </main>
    );
  }

  return (
    <div className="admin-v2 flex w-full max-w-none gap-5 px-2 py-2 sm:px-4 sm:py-4 xl:px-6">
      <AdminSidebar />
      <div className="min-w-0 flex-1 pb-28 lg:pb-6">
        {/* Admin Topbar */}
        <header className="admin-topbar admin-command-topbar mb-5 rounded-[24px] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-600">
                Platform komuta katmanı
              </p>
              <h1 className="mt-0.5 text-lg font-semibold text-[var(--text-1)]">
                Platformun nabzı tek ekranda
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs text-[var(--text-3)] sm:inline">
                {user?.email ?? ""}
              </span>
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === "light" ? "◐ Koyu" : "☀ Açık"}
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await logout();
                  router.push("/isletmeler/giris");
                }}
              >
                Çıkış
              </Button>
            </div>
          </div>
        </header>
        {children}
      </div>
      <AdminMobileNav />
    </div>
  );
}
