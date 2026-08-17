"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_EMAIL = "cihatwin@gmail.com";

const navItems = [
  { href: "/dashboard", label: "Genel Bakış", icon: "📊" },
  { href: "/dashboard/takvim", label: "Takvim", icon: "📅" },
  { href: "/dashboard/randevular", label: "Randevular", icon: "🗓️" },
  { href: "/dashboard/hizmetler", label: "Hizmetler", icon: "✂️" },
  { href: "/dashboard/calisanlar", label: "Çalışanlar", icon: "👥" },
  { href: "/dashboard/calisma-saatleri", label: "Çalışma Saatleri", icon: "🕐" },
  { href: "/dashboard/musteriler", label: "Müşteriler", icon: "💼" },
  { href: "/dashboard/yorumlar", label: "Yorumlar", icon: "⭐" },
  { href: "/dashboard/destek", label: "Destek", icon: "🎧" },
  { href: "/dashboard/ayarlar", label: "Ayarlar", icon: "⚙️" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-xl shadow-[var(--shadow-hard)] backdrop-blur-xl lg:block">
      <div className="mb-6 px-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SeninRandevun" width={32} height={32} className="rounded-lg shadow-md" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-3)]">
              SeninRandevun
            </p>
            <p className="text-sm font-semibold text-[var(--text-1)]">
              İşletme Paneli
            </p>
          </div>
        </Link>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-chip flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "active" : "",
                active
                  ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] pl-5 font-medium text-white shadow-lg shadow-sky-500/25"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {isAdmin && (
        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <Link
            href="/super-admin"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-500 transition hover:bg-rose-500/5 hover:text-rose-600"
          >
            🛡️ Platform Admin
          </Link>
        </div>
      )}
    </aside>
  );
}

export function DashboardBottomNav() {
  const pathname = usePathname();
  const mobileItems = navItems.slice(0, 5);

  return (
    <nav className="fixed inset-x-4 bottom-4 z-30 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-2xl shadow-[var(--shadow-hard)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-center",
                  active
                    ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-white"
                    : "text-[var(--text-3)]"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
