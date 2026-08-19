"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/auth-service";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useBusinessContext } from "@/features/businesses/business-context";

export function DashboardTopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { businesses, businessId } = useBusinessContext();
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  const router = useRouter();

  return (
    <header className="dashboard-topbar dashboard-hero rounded-[1.6rem] border border-[var(--border)] p-4 shadow-lg shadow-[var(--shadow-hard)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Çalışma alanınız</p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--text-1)]">Bugünün akışını birlikte yönetin.</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kesfet" className="hidden rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-2)] hover:bg-[var(--surface-2)] md:inline-flex">Keşfet</Link>
          {activeBusiness?.slug && <Link href={`/isletme/${activeBusiness.slug}`} className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold text-[var(--text-1)] sm:inline-flex">Mağazamı gör ↗</Link>}
          <span className="hidden max-w-44 truncate rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-xs text-[var(--text-3)] xl:inline">{user?.email ?? ""}</span>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === "light" ? "◐" : "◑"}
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
  );
}
