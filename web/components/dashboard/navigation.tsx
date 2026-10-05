"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useLiveOperationsAvailable } from "@/features/live-queue/use-live-operations-available";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { DASHBOARD_ROUTE_ENTITLEMENTS, type SubscriptionEntitlement } from "@/constants/subscription-entitlements";
import {
  Activity, BellRing, Bot, CalendarDays, ChartNoAxesCombined, CircleUserRound, Clock3, CreditCard, GitBranch, Headphones,
  House, LayoutGrid, ListChecks, PanelLeftClose, PanelLeftOpen, Plus, ReceiptText, Scissors, Settings2, ShieldCheck, Star,
  UsersRound, WandSparkles, type LucideIcon,
} from "lucide-react";
import { Sheet } from "@/components/dashboard/ui";
import { openQuickAppointment } from "@/components/dashboard/dashboard-events";
import styles from "./shell.module.css";

const ADMIN_EMAIL = "cihatwin@gmail.com";

type NavGroup = "merkez" | "operasyon" | "buyume" | "yonetim" | "sistem";
export interface NavItem { href: string; label: string; short?: string; icon: LucideIcon; group: NavGroup; entitlement?: SubscriptionEntitlement }
const GROUP_LABELS: Record<NavGroup, string> = { merkez: "Çalışma alanı", operasyon: "Günlük operasyon", buyume: "Analiz ve otomasyon", yonetim: "İşletme yönetimi", sistem: "Hesap ve sistem" };

const navItems: NavItem[] = ([
  { href: "/dashboard", label: "Bugün", short: "Bugün", icon: House, group: "merkez" },
  { href: "/dashboard/takvim", label: "Takvim", icon: CalendarDays, group: "merkez" },
  { href: "/dashboard/randevular", label: "Randevular", icon: ListChecks, group: "merkez" },
  { href: "/dashboard/musteriler", label: "Müşteriler", icon: UsersRound, group: "merkez" },
  { href: "/dashboard/operasyon", label: "Kasa & Operasyon", short: "Kasa", icon: ReceiptText, group: "merkez" },
  { href: "/dashboard/canli-operasyon", label: "Canlı Sıra", icon: Activity, group: "operasyon" },
  { href: "/dashboard/bekleme-listesi", label: "Bekleme Listesi", icon: BellRing, group: "operasyon" },
  { href: "/dashboard/asistan", label: "İşletme Asistanı", icon: Bot, group: "operasyon" },
  { href: "/dashboard/analitik", label: "Analiz & Büyüme", icon: ChartNoAxesCombined, group: "buyume" },
  { href: "/dashboard/otomasyonlar", label: "Otomasyonlar", icon: WandSparkles, group: "buyume" },
  { href: "/dashboard/hizmetler", label: "Hizmetler", icon: Scissors, group: "yonetim" },
  { href: "/dashboard/calisanlar", label: "Çalışanlar", icon: UsersRound, group: "yonetim" },
  { href: "/dashboard/calisma-saatleri", label: "Çalışma Saatleri", icon: Clock3, group: "yonetim" },
  { href: "/dashboard/subeler", label: "Şubeler", icon: GitBranch, group: "yonetim" },
  { href: "/dashboard/yorumlar", label: "Yorumlar", icon: Star, group: "yonetim" },
  { href: "/dashboard/destek", label: "Destek", icon: Headphones, group: "sistem" },
  { href: "/dashboard/abonelik", label: "Abonelik", icon: CreditCard, group: "sistem" },
  { href: "/dashboard/ayarlar", label: "Ayarlar", icon: Settings2, group: "sistem" },
  { href: "/hesabim", label: "Müşteri Modu", icon: CircleUserRound, group: "sistem" },
] satisfies Omit<NavItem, "entitlement">[]).map((item) => ({ ...item, entitlement: DASHBOARD_ROUTE_ENTITLEMENTS[item.href] }));

type Access = ReturnType<typeof useBusinessContext>["access"];

function canOpenOperationsFor(access: Access) {
  return access?.role !== "staff" || !!(access.permissions.manageCheckout || access.permissions.manageCatalog || access.permissions.managePackages || access.permissions.manageFinance);
}

function visibleItems(showLiveOperations: boolean, canOpenOperations: boolean, access: Access, canUse: (entitlement: SubscriptionEntitlement) => boolean) {
  return navItems.filter((item) => (item.href !== "/dashboard/canli-operasyon" || showLiveOperations) &&
    (item.href !== "/dashboard/operasyon" || canOpenOperations) &&
    (!item.entitlement || canUse(item.entitlement)) &&
    (access?.role !== "staff" || ["/dashboard/takvim", "/dashboard/randevular", "/dashboard/destek", "/hesabim", ...(access?.permissions.viewCustomers ? ["/dashboard/musteriler"] : []), ...(canOpenOperations ? ["/dashboard/operasyon"] : [])].includes(item.href)));
}

/** Sidebar, alt menü ve "Daha fazla" sayfasının ortak, yetki/paket filtreli menüsü. */
function useDashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { access } = useBusinessContext();
  const showLiveOperations = useLiveOperationsAvailable();
  const { can } = useSubscriptionPlan();
  const canOpenOperations = canOpenOperationsFor(access);
  const items = visibleItems(showLiveOperations, canOpenOperations, access, can);
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const isActive = (href: string) => href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
  return { items, isAdmin, isActive, access, pathname };
}

const tourId = (href: string) => href === "/dashboard" ? "overview" : href.replace("/dashboard/", "");

export function DashboardSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { businesses, businessId } = useBusinessContext();
  const { items, isAdmin, isActive } = useDashboardNav();
  const activeBusiness = businesses.find((b) => b.id === businessId) ?? businesses[0];
  const groups = (Object.keys(GROUP_LABELS) as NavGroup[])
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <aside className={styles.sidebar} aria-label="İşletme menüsü">
      <Link href="/dashboard" className={styles.brand} title={activeBusiness?.name ?? "SeninRandevun"}>
        <Image src="/logo.png" alt="" width={36} height={36} className={styles.brandLogo} />
        <span className={styles.brandText}>
          <small>İşletme paneli</small>
          <b>{activeBusiness?.name ?? "SeninRandevun"}</b>
        </span>
      </Link>
      <nav className={styles.sideNav}>
        {groups.map(({ group, items: groupItems }) => (
          <section key={group} className={styles.sideGroup}>
            <p className={styles.sideGroupLabel}>{GROUP_LABELS[group]}</p>
            {groupItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-dashboard-tour={tourId(item.href)}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(styles.sideLink, active && styles.sideLinkActive)}
                >
                  <span className={styles.sideIcon}><Icon size={18} strokeWidth={active ? 2.2 : 1.9} aria-hidden /></span>
                  <span className={styles.sideLabel}>{item.label}</span>
                </Link>
              );
            })}
          </section>
        ))}
        {isAdmin && (
          <section className={styles.sideGroup}>
            <p className={styles.sideGroupLabel}>Platform</p>
            <Link href="/super-admin" className={cn(styles.sideLink, styles.sideLinkAdmin)} title={collapsed ? "Süper Admin" : undefined}>
              <span className={styles.sideIcon}><ShieldCheck size={18} aria-hidden /></span>
              <span className={styles.sideLabel}>Süper Admin</span>
            </Link>
          </section>
        )}
      </nav>
      <button type="button" className={styles.collapseBtn} onClick={onToggle} aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"} aria-pressed={collapsed}>
        {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        <span className={styles.sideLabel}>Menüyü daralt</span>
      </button>
    </aside>
  );
}

export function DashboardBottomNav() {
  const { items, isAdmin, isActive, access } = useDashboardNav();
  const [moreOpen, setMoreOpen] = useState(false);
  const isStaff = access?.role === "staff";
  const primaryHrefs = useMemo(() => isStaff
    ? ["/dashboard/takvim", "/dashboard/randevular"]
    : ["/dashboard", "/dashboard/takvim", "/dashboard/randevular"], [isStaff]);
  const primaryItems = primaryHrefs.map((href) => items.find((item) => item.href === href)).filter(Boolean) as NavItem[];
  // Staff: 2 sekme + Yeni + müşteriler/destek + Daha fazla
  const fourth = isStaff ? (items.find((item) => item.href === "/dashboard/musteriler") ?? items.find((item) => item.href === "/dashboard/destek")) : items.find((item) => item.href === "/dashboard/musteriler");
  const slots = [...primaryItems.slice(0, 2), "new" as const, ...(isStaff ? [] : primaryItems.slice(2)), ...(isStaff && fourth ? [fourth] : [])].slice(0, 4);
  const inBar = new Set(slots.filter((slot): slot is NavItem => slot !== "new").map((item) => item.href));
  const moreItems = items.filter((item) => !inBar.has(item.href));
  const moreActive = moreItems.some((item) => isActive(item.href));

  useEffect(() => {
    const revealTourTarget = (event: Event) => {
      const target = (event as CustomEvent<{ target?: string }>).detail?.target;
      if (!target || window.matchMedia("(min-width: 1024px)").matches) return;
      setMoreOpen(moreItems.some((item) => tourId(item.href) === target));
    };
    window.addEventListener("dashboard:tour-reveal", revealTourTarget);
    return () => window.removeEventListener("dashboard:tour-reveal", revealTourTarget);
  }, [moreItems]);

  const groups = (Object.keys(GROUP_LABELS) as NavGroup[])
    .map((group) => ({ group, items: moreItems.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <>
      <nav className={styles.bottomNav} aria-label="İşletme paneli menüsü">
        <ul>
          {slots.map((slot) => {
            if (slot === "new") {
              return (
                <li key="new">
                  <button type="button" className={styles.fab} onClick={() => openQuickAppointment()} aria-label="Yeni randevu">
                    <span><Plus size={24} strokeWidth={2.4} aria-hidden /></span>
                  </button>
                </li>
              );
            }
            const Icon = slot.icon;
            const active = isActive(slot.href);
            return (
              <li key={slot.href}>
                <Link
                  href={slot.href}
                  data-dashboard-tour={tourId(slot.href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(styles.bottomLink, active && styles.bottomLinkActive)}
                >
                  <span className={styles.bottomIcon}><Icon size={21} strokeWidth={active ? 2.3 : 1.9} aria-hidden /></span>
                  <span className={styles.bottomLabel}>{slot.short ?? slot.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={cn(styles.bottomLink, (moreActive || moreOpen) && styles.bottomLinkActive)}
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              <span className={styles.bottomIcon}><LayoutGrid size={21} strokeWidth={moreActive ? 2.3 : 1.9} aria-hidden /></span>
              <span className={styles.bottomLabel}>Daha fazla</span>
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Tüm araçlar" description="İşletmenizi yönetmek için ihtiyacınız olan her şey.">
        <div className={styles.moreGroups}>
          {groups.map(({ group, items: groupItems }) => (
            <section key={group}>
              <p className={styles.moreLabel}>{GROUP_LABELS[group]}</p>
              <div className={styles.moreGrid}>
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-dashboard-tour={tourId(item.href)}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(styles.moreTile, active && styles.moreTileActive)}
                    >
                      <span className={styles.moreTileIcon}><Icon size={20} aria-hidden /></span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
          {isAdmin && (
            <section>
              <p className={styles.moreLabel}>Platform</p>
              <div className={styles.moreGrid}>
                <Link href="/super-admin" onClick={() => setMoreOpen(false)} className={styles.moreTile}>
                  <span className={styles.moreTileIcon}><ShieldCheck size={20} aria-hidden /></span>
                  <span>Süper Admin</span>
                </Link>
              </div>
            </section>
          )}
        </div>
      </Sheet>
    </>
  );
}
