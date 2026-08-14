"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/auth-service";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function DashboardTopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="dashboard-hero rounded-2xl border border-[var(--border)] p-4 shadow-lg shadow-[var(--shadow-hard)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-3)]">Yonetim Paneli</p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--text-1)]">Randevularinizi tek panelden yonetin</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-sm text-[var(--text-3)] sm:inline">{user?.email ?? ""}</span>
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
            Cikis
          </Button>
        </div>
      </div>
    </header>
  );
}
