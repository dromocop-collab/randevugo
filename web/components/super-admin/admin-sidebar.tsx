"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";
import {
  Activity, ArrowLeftToLine, BarChart3, BellRing, Siren, Building2, CalendarCog, CircleGauge, ClipboardList, Headphones, Settings2,
  Bot, MessageSquareText, ShieldCheck, UsersRound, WalletCards, type LucideIcon,
} from "lucide-react";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/super-admin", label: "Platform", icon: CircleGauge },
  { href: "/super-admin/asistan", label: "Akıllı Asistan", icon: Bot },
  { href: "/super-admin/analitik", label: "Ziyaretçi Analitiği", icon: BarChart3 },
  { href: "/super-admin/isletmeler", label: "İşletmeler", icon: Building2 },
  { href: "/super-admin/kullanicilar", label: "Kullanıcılar", icon: UsersRound },
  { href: "/super-admin/abonelikler", label: "Abonelikler", icon: WalletCards },
  { href: "/super-admin/uyarilar", label: "Uyarılar", icon: Siren },
  { href: "/super-admin/destek", label: "Destek", icon: Headphones },
  { href: "/super-admin/moderasyon", label: "Moderasyon", icon: ShieldCheck },
  { href: "/super-admin/audit-logs", label: "Audit Kayıtları", icon: ClipboardList },
  { href: "/super-admin/bildirimler", label: "Bildirim Merkezi", icon: BellRing },
  { href: "/super-admin/sms", label: "SMS Merkezi", icon: MessageSquareText },
  { href: "/super-admin/randevu-alanlari", label: "Randevu Alanları", icon: CalendarCog },
  { href: "/super-admin/ayarlar", label: "Ayarlar", icon: Settings2 },
];

/** Uyarı okundu işaretlendiğinde menü rozetinin yenilenmesi için yayınlanan olay. */
export const PLATFORM_ALERTS_CHANGED_EVENT = "platform-alerts-changed";

// Okunmamış uyarı sayısı: tek bir sayım sorgusu (belge indirmez); sayfa değişince ve uyarı okununca yenilenir.
function useUnreadAlertCount(pathname: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getCountFromServer(query(collection(getDb(), "platformAlerts"), where("isRead", "==", false)))
        .then((snapshot) => { if (!cancelled) setCount(snapshot.data().count); })
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener(PLATFORM_ALERTS_CHANGED_EVENT, refresh);
    return () => { cancelled = true; window.removeEventListener(PLATFORM_ALERTS_CHANGED_EVENT, refresh); };
  }, [pathname]);
  return count;
}

function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const unreadAlerts = useUnreadAlertCount(pathname);

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
            {item.href === "/super-admin/uyarilar" && unreadAlerts > 0 && <b aria-label={`${unreadAlerts} okunmamış uyarı`} className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{unreadAlerts > 99 ? "99+" : unreadAlerts}</b>}
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
