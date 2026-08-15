"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";
import { AdminSidebar } from "@/components/super-admin/admin-sidebar";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/auth-service";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL;
  const [firestoreAllowed, setFirestoreAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || isPrimaryAdmin) return;

    const db = getDb();
    getDoc(doc(db, "platformAdmins", user.uid))
      .then((snap) => {
        setFirestoreAllowed(snap.exists());
      })
      .catch(() => {
        setFirestoreAllowed(false);
      });
  }, [isPrimaryAdmin, status, user]);

  // Derived: primary admin is always allowed, otherwise wait for Firestore check
  const allowed = isPrimaryAdmin ? true : firestoreAllowed;

  if (status === "loading" || allowed === null) {
    return (
      <LoadingState
        title="Yetki kontrol ediliyor"
        description="Platform admin erişimi doğrulanıyor..."
      />
    );
  }

  if (status === "unauthenticated") {
    router.replace("/giris");
    return null;
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
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 lg:px-6">
      <AdminSidebar />
      <div className="min-w-0 flex-1 pb-6">
        {/* Admin Topbar */}
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4 shadow-lg shadow-[var(--shadow-hard)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-rose-500">
                Platform Admin
              </p>
              <h1 className="mt-0.5 text-lg font-semibold text-[var(--text-1)]">
                SeninRandevun Kontrol Merkezi
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs text-[var(--text-3)] sm:inline">
                {user?.email ?? ""}
              </span>
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === "light" ? "Dark" : "Light"}
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await logout();
                  router.push("/giris");
                }}
              >
                Çıkış
              </Button>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
