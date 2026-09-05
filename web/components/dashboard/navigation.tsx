"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import {
  CalendarDays, ChartNoAxesCombined, Clock3, Headphones, Rocket,
  LayoutDashboard, MessageSquareText, Scissors, Settings2,
  ShieldCheck, Star, UsersRound, type LucideIcon,
} from "lucide-react";

const ADMIN_EMAIL = "cihatwin@gmail.com";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/dashboard/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/dashboard/randevular", label: "Randevular", icon: MessageSquareText },
  { href: "/dashboard/analitik", label: "Büyüme Analitiği", icon: ChartNoAxesCombined },
  { href: "/dashboard/buyume", label: "Büyüme Merkezi", icon: Rocket },
  { href: "/dashboard/hizmetler", label: "Hizmetler", icon: Scissors },
  { href: "/dashboard/calisanlar", label: "Çalışanlar", icon: UsersRound },
  { href: "/dashboard/calisma-saatleri", label: "Çalışma Saatleri", icon: Clock3 },
  { href: "/dashboard/musteriler", label: "Müşteriler", icon: UsersRound },
  { href: "/dashboard/yorumlar", label: "Yorumlar", icon: Star },
  { href: "/dashboard/destek", label: "Destek", icon: Headphones },
  { href: "/dashboard/ayarlar", label: "Ayarlar", icon: Settings2 },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { businesses, businessId } = useBusinessContext();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  
  const activeBusiness = businesses.find((b) => b.id === businessId) ?? businesses[0];

  return (
    <aside className="dashboard-sidebar hidden w-64 shrink-0 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-xl shadow-[var(--shadow-hard)] backdrop-blur-xl lg:block">
      <div className="mb-5 px-2 pt-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SeninRandevun" width={32} height={32} className="rounded-lg shadow-md" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
              İşletme çalışma alanı
            </p>
            <p className="text-sm font-extrabold text-[var(--text-1)] truncate max-w-[150px]">
              {activeBusiness?.name ?? "SeninRandevun"}
            </p>
          </div>
        </Link>
      </div>
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-chip flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active ? "active" : "",
                active
                  ? "bg-[var(--text-1)] pl-4 text-[var(--bg-1)] shadow-lg"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
              )}
            >
              <span className="nav-icon grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-3)]"><Icon aria-hidden="true" size={16} strokeWidth={1.8} /></span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {isAdmin && (
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <Link
            href="/super-admin"
            className="platform-admin-entry flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 transition"
          >
            <span><ShieldCheck size={16} strokeWidth={1.9} /></span> Platform Admin <b>↗</b>
          </Link>
        </div>
      )}
    </aside>
  );
}

export function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="dashboard-bottom-nav fixed inset-x-3 bottom-3 z-30 overflow-hidden lg:hidden" aria-label="İşletme paneli menüsü">
      <span className="dashboard-bottom-nav-shine" aria-hidden="true" />
      <ul className="flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="w-[78px] shrink-0 snap-start">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "dashboard-bottom-nav-link",
                  active ? "active" : ""
                )}
              >
                <span className="dashboard-bottom-nav-icon"><Icon aria-hidden="true" size={20} strokeWidth={2} /></span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
