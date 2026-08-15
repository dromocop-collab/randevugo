"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/super-admin", label: "Platform", icon: "📊" },
  { href: "/super-admin/isletmeler", label: "İşletmeler", icon: "🏢" },
  { href: "/super-admin/kullanicilar", label: "Kullanıcılar", icon: "👥" },
  { href: "/super-admin/abonelikler", label: "Abonelikler", icon: "💎" },
  { href: "/super-admin/destek", label: "Destek", icon: "🎧" },
  { href: "/super-admin/moderasyon", label: "Moderasyon", icon: "🛡️" },
  { href: "/super-admin/audit-logs", label: "Audit Logs", icon: "📋" },
  { href: "/super-admin/ayarlar", label: "Ayarlar", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4 shadow-xl shadow-[var(--shadow-hard)] lg:block">
      <div className="mb-6 px-2">
        <Link href="/super-admin" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-sm font-bold text-white shadow-md">
            SA
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-rose-500">
              Super Admin
            </p>
            <p className="text-sm font-semibold text-[var(--text-1)]">
              Platform Kontrol
            </p>
          </div>
        </Link>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/super-admin"
              ? pathname === "/super-admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-rose-600 font-medium text-white shadow-lg shadow-rose-500/25"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-[var(--text-3)] transition hover:text-[var(--text-1)]"
        >
          ← İşletme Paneline Dön
        </Link>
      </div>
    </aside>
  );
}
