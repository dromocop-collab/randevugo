"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { ArrowLeftToLine, Ellipsis, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Sun } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils/cn";
import { AdminButton, Sheet } from "@/components/super-admin/ui";
import { ADMIN_MOBILE_PRIMARY, ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, ALERTS_HREF, isNavActive } from "./admin-nav";
import styles from "./admin-shell.module.css";

/** Uyarı okundu işaretlendiğinde menü rozetinin yenilenmesi için yayınlanan olay. */
export const PLATFORM_ALERTS_CHANGED_EVENT = "platform-alerts-changed";

// Okunmamış uyarı sayısı: tek bir sayım sorgusu (belge indirmez); sayfa değişince ve uyarı okununca yenilenir.
export function useUnreadAlertCount(pathname: string) {
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

const badgeText = (count: number) => (count > 99 ? "99+" : String(count));

export function AdminSidebar({
  collapsed, onToggleCollapsed, unreadAlerts, onOpenSearch, onLogout,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  unreadAlerts: number;
  onOpenSearch: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside className={styles.sidebar} aria-label="Süper admin menüsü">
      <Link href="/super-admin" className={styles.brand} title="Platform Özeti">
        <span className={styles.brandMark}><ShieldCheck size={20} strokeWidth={2.2} /></span>
        <span className={styles.brandText}><small>SÜPER ADMİN</small><b>SeninRandevun</b></span>
      </Link>
      <button type="button" className={styles.sideSearch} onClick={onOpenSearch} title="Ara veya git (⌘K)">
        <Search size={15} aria-hidden /><span>Ara veya git…</span><kbd className={styles.kbd}>⌘K</kbd>
      </button>
      <nav className={styles.navScroll} aria-label="Bölümler">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className={styles.group}>
            <span className={styles.groupLabel}>{group.label}</span>
            {group.items.map((item) => {
              const active = isNavActive(item.href, pathname);
              const Icon = item.icon;
              const showCount = item.href === ALERTS_HREF && unreadAlerts > 0;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined} className={cn(styles.navLink, active && styles.navActive)}>
                  <Icon size={18} strokeWidth={1.9} aria-hidden />
                  <span className={styles.navLabel}>{item.label}</span>
                  {showCount && <b className={styles.count} aria-label={`${unreadAlerts} okunmamış uyarı`}>{badgeText(unreadAlerts)}</b>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={styles.sideFoot}>
        <Link href="/dashboard" className={styles.footBtn} title="İşletme paneline dön"><ArrowLeftToLine size={17} aria-hidden /><span className={styles.footLabel}>İşletme paneline dön</span></Link>
        <button type="button" className={styles.footBtn} onClick={onLogout} title="Çıkış yap"><LogOut size={17} aria-hidden /><span className={styles.footLabel}>Çıkış yap</span></button>
        <button type="button" className={styles.footBtn} onClick={onToggleCollapsed} aria-pressed={collapsed} title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
          {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
          <span className={styles.footLabel}>Menüyü daralt</span>
        </button>
      </div>
    </aside>
  );
}

export function AdminMobileNav({
  unreadAlerts, email, theme, onToggleTheme, onLogout, onOpenSearch,
}: {
  unreadAlerts: number;
  email?: string | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = ADMIN_MOBILE_PRIMARY.map((href) => ADMIN_NAV_ITEMS.find((item) => item.href === href)!).filter(Boolean);
  const moreActive = !primary.some((item) => isNavActive(item.href, pathname));
  // Sayfa değişince sheet kapanır (render sırasında senkron; efekt gerekmez).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) { setLastPath(pathname); setMoreOpen(false); }

  return (
    <>
      <nav className={styles.dock} aria-label="Hızlı gezinme">
        {primary.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(styles.dockItem, active && styles.dockActive)}>
              <span className={styles.dockIcon}>
                <Icon size={19} strokeWidth={2} aria-hidden />
                {item.href === ALERTS_HREF && unreadAlerts > 0 && <b className={styles.dockBadge} aria-label={`${unreadAlerts} okunmamış uyarı`}>{badgeText(unreadAlerts)}</b>}
              </span>
              <span className={styles.dockLabel}>{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button type="button" className={cn(styles.dockItem, (moreActive || moreOpen) && styles.dockActive)} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
          <span className={styles.dockIcon}><Ellipsis size={20} aria-hidden /></span>
          <span className={styles.dockLabel}>Daha fazla</span>
        </button>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Tüm bölümler" description="Platform yönetiminin tamamına buradan ulaşın.">
        <AdminButton variant="secondary" icon={Search} className="mb-4 w-full !justify-start" onClick={() => { setMoreOpen(false); onOpenSearch(); }}>Sayfa veya işletme ara</AdminButton>
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className={styles.moreGroup}>
            <span className={styles.moreLabel}>{group.label}</span>
            <div className={styles.moreGrid}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href, pathname);
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(styles.moreTile, active && styles.moreTileActive)}>
                    <Icon size={19} aria-hidden />
                    <span>{item.label}</span>
                    {item.href === ALERTS_HREF && unreadAlerts > 0 && <b className={styles.dockBadge}>{badgeText(unreadAlerts)}</b>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <div className={styles.moreAccount}>
          {email && <span className={styles.moreEmail}>{email}</span>}
          <div className={styles.moreActions}>
            <AdminButton size="sm" variant="secondary" icon={theme === "light" ? Moon : Sun} onClick={onToggleTheme}>{theme === "light" ? "Koyu" : "Açık"}</AdminButton>
            <AdminButton size="sm" variant="secondary" icon={ArrowLeftToLine} href="/dashboard">İşletme</AdminButton>
            <AdminButton size="sm" variant="ghost" icon={LogOut} onClick={onLogout}>Çıkış</AdminButton>
          </div>
        </div>
      </Sheet>
    </>
  );
}
