"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Activity, ArrowLeftToLine, BarChart3, Building2, CircleGauge, ClipboardList, Headphones, Settings2,
  MessageSquareText, ShieldCheck, UsersRound, WalletCards, type LucideIcon,
} from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/super-admin", label: "Platform", icon: CircleGauge },
  { href: "/super-admin/analitik", label: "Ziyaretçi Analitiği", icon: BarChart3 },
  { href: "/super-admin/isletmeler", label: "İşletmeler", icon: Building2 },
  { href: "/super-admin/kullanicilar", label: "Kullanıcılar", icon: UsersRound },
  { href: "/super-admin/abonelikler", label: "Abonelikler", icon: WalletCards },
  { href: "/super-admin/destek", label: "Destek", icon: Headphones },
  { href: "/super-admin/moderasyon", label: "Moderasyon", icon: ShieldCheck },
  { href: "/super-admin/audit-logs", label: "Audit Kayıtları", icon: ClipboardList },
  { href: "/super-admin/sms", label: "SMS Merkezi", icon: MessageSquareText },
  { href: "/super-admin/ayarlar", label: "Ayarlar", icon: Settings2 },
];

function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={mobile ? "admin-mobile-nav-track" : "space-y-1"}>
      {mobile && <Link href="/dashboard" className="admin-mobile-nav-link admin-mobile-return"><span className="admin-nav-icon"><ArrowLeftToLine size={17}/></span><span>İşletme Paneli</span></Link>}
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/super-admin" ? pathname === "/super-admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(mobile ? "admin-mobile-nav-link" : "admin-side-link", active ? "active" : "")}>
            <span className="admin-nav-icon"><Icon aria-hidden="true" size={17} strokeWidth={1.9} /></span>
            <span>{item.label}</span>
            {!mobile && active && <i aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar admin-command-sidebar hidden w-[278px] shrink-0 overflow-hidden rounded-[28px] p-4 lg:flex lg:flex-col">
      <div className="admin-brand-panel mb-5 p-2">
        <Link href="/super-admin" className="flex items-center gap-2">
          <span className="admin-brand-mark">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-300">Super Admin OS</p>
            <p className="text-sm font-semibold text-white">Platform Komuta</p>
          </div>
        </Link>
      </div>
      <div className="admin-system-chip mb-4"><span><Activity size={13} /> CANLI SİSTEM</span><b>Operasyon normal</b></div>
      <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pr-1"><AdminNavigation /></div>
      <div className="admin-return-panel mt-4 border-t border-white/10 pt-4">
        <Link
          href="/dashboard"
          className="admin-return-business"
        >
          <span><ArrowLeftToLine size={17} /></span>
          <div><small>ÇALIŞMA ALANI</small><b>İşletme paneline dön</b></div>
        </Link>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  return <div className="admin-mobile-nav lg:hidden"><AdminNavigation mobile /></div>;
}
