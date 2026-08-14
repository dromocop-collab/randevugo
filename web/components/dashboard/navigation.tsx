"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Genel Bakis" },
  { href: "/dashboard/takvim", label: "Takvim" },
  { href: "/dashboard/randevular", label: "Randevular" },
  { href: "/dashboard/hizmetler", label: "Hizmetler" },
  { href: "/dashboard/calisanlar", label: "Calisanlar" },
  { href: "/dashboard/calisma-saatleri", label: "Calisma Saatleri" },
  { href: "/dashboard/musteriler", label: "Musteriler" },
  { href: "/admin", label: "Admin" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-xl shadow-[var(--shadow-hard)] backdrop-blur-xl lg:block">
      <div className="mb-6 px-2">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-3)]">RandevuGo Control</p>
        <p className="mt-2 text-lg font-semibold text-[var(--text-1)]">Isletme Paneli</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-chip block rounded-xl px-3 py-2.5 text-sm transition",
                active ? "active" : "",
                active
                  ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] pl-5 text-white shadow-lg shadow-sky-500/25"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function DashboardBottomNav() {
  const pathname = usePathname();
  const mobileItems = navItems.slice(0, 5);

  return (
    <nav className="fixed inset-x-4 bottom-4 z-30 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-2xl shadow-[var(--shadow-hard)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5 gap-2">
        {mobileItems.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-lg px-2 py-2 text-center text-xs",
                  active ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] text-white" : "text-[var(--text-2)]"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
