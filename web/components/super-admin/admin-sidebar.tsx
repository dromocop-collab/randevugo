"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Building2, CircleGauge, ClipboardList, Headphones, Settings2,
  MessageSquareText, ShieldCheck, UsersRound, WalletCards, type LucideIcon,
} from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/super-admin", label: "Platform", icon: CircleGauge },
  { href: "/super-admin/isletmeler", label: "İşletmeler", icon: Building2 },
  { href: "/super-admin/kullanicilar", label: "Kullanıcılar", icon: UsersRound },
  { href: "/super-admin/abonelikler", label: "Abonelikler", icon: WalletCards },
  { href: "/super-admin/destek", label: "Destek", icon: Headphones },
  { href: "/super-admin/moderasyon", label: "Moderasyon", icon: ShieldCheck },
  { href: "/super-admin/audit-logs", label: "Audit Kayıtları", icon: ClipboardList },
  { href: "/super-admin/sms", label: "SMS Merkezi", icon: MessageSquareText },
  { href: "/super-admin/ayarlar", label: "Ayarlar", icon: Settings2 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar hidden w-64 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4 shadow-xl shadow-[var(--shadow-hard)] lg:block">
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
          const Icon = item.icon;
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
                  ? "bg-[#13271d] font-medium text-white shadow-lg shadow-emerald-950/20"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className="admin-nav-icon"><Icon aria-hidden="true" size={17} strokeWidth={1.9} /></span>
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
