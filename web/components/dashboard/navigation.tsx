"use client";

import Link from "@/i18n/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useLiveOperationsAvailable } from "@/features/live-queue/use-live-operations-available";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { DASHBOARD_ROUTE_ENTITLEMENTS, type SubscriptionEntitlement } from "@/constants/subscription-entitlements";
import {
  Activity, BellRing, BookOpen, Bot, CalendarDays, ChartNoAxesCombined, CircleUserRound, Clock3, CreditCard, ExternalLink, Gift, GitBranch, GraduationCap, Headphones,
  Heart, House, LayoutGrid, Link2, ListChecks, Megaphone, MessageCircle, PanelLeftClose, PanelLeftOpen, Phone, Plus, ReceiptText, Scissors, Settings2, ShieldCheck, ShoppingBag, Sparkles, Star,
  UsersRound, Video, WandSparkles, type LucideIcon,
} from "lucide-react";
import { useDashboardDesign } from "@/features/dashboard-design/dashboard-design-context";
import { applyNavDesign, type CustomLinkIcon, type DesignedNavItem, type NavGroup } from "@/features/dashboard-design/design-domain";
import { Sheet } from "@/components/dashboard/ui";
import { openQuickAppointment } from "@/components/dashboard/dashboard-events";
import { useLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import styles from "./shell.module.css";

const ADMIN_EMAIL = "cihatwin@gmail.com";

export interface NavItem { href: string; label: string; short?: string; icon: LucideIcon; group: NavGroup; entitlement?: SubscriptionEntitlement }
export const GROUP_LABELS: Record<NavGroup, string> = { merkez: tk("Çalışma alanı"), operasyon: tk("Günlük operasyon"), buyume: tk("Analiz ve otomasyon"), yonetim: tk("İşletme yönetimi"), sistem: tk("Hesap ve sistem") };

/** Panel menüsünün kod tanımı (süper admin › Panel Tasarımı bunun üzerine ad/sıra/gizleme uygular). */
export const DASHBOARD_NAV_ITEMS: NavItem[] = ([
  { href: "/dashboard", label: tk("Bugün"), short: tk("Bugün"), icon: House, group: "merkez" },
  { href: "/dashboard/takvim", label: tk("Takvim"), icon: CalendarDays, group: "merkez" },
  { href: "/dashboard/randevular", label: tk("Randevular"), icon: ListChecks, group: "merkez" },
  { href: "/dashboard/musteriler", label: tk("Müşteriler"), icon: UsersRound, group: "merkez" },
  { href: "/dashboard/operasyon", label: tk("Kasa & Operasyon"), short: tk("Kasa"), icon: ReceiptText, group: "merkez" },
  { href: "/dashboard/canli-operasyon", label: tk("Canlı Sıra"), icon: Activity, group: "operasyon" },
  { href: "/dashboard/bekleme-listesi", label: tk("Bekleme Listesi"), icon: BellRing, group: "operasyon" },
  { href: "/dashboard/asistan", label: tk("İşletme Asistanı"), icon: Bot, group: "operasyon" },
  { href: "/dashboard/analitik", label: tk("Analiz & Büyüme"), icon: ChartNoAxesCombined, group: "buyume" },
  { href: "/dashboard/otomasyonlar", label: tk("Otomasyonlar"), icon: WandSparkles, group: "buyume" },
  { href: "/dashboard/hizmetler", label: tk("Hizmetler"), icon: Scissors, group: "yonetim" },
  { href: "/dashboard/calisanlar", label: tk("Çalışanlar"), icon: UsersRound, group: "yonetim" },
  { href: "/dashboard/calisma-saatleri", label: tk("Çalışma Saatleri"), icon: Clock3, group: "yonetim" },
  { href: "/dashboard/subeler", label: tk("Şubeler"), icon: GitBranch, group: "yonetim" },
  { href: "/dashboard/yorumlar", label: tk("Yorumlar"), icon: Star, group: "yonetim" },
  { href: "/dashboard/destek", label: tk("Destek"), icon: Headphones, group: "sistem" },
  { href: "/dashboard/abonelik", label: tk("Abonelik"), icon: CreditCard, group: "sistem" },
  { href: "/dashboard/ayarlar", label: tk("Ayarlar"), icon: Settings2, group: "sistem" },
  { href: "/hesabim", label: tk("Müşteri Modu"), icon: CircleUserRound, group: "sistem" },
] satisfies Omit<NavItem, "entitlement">[]).map((item) => ({ ...item, entitlement: DASHBOARD_ROUTE_ENTITLEMENTS[item.href] }));
const navItems = DASHBOARD_NAV_ITEMS;

/** Özel bağlantı simgeleri (design-domain CUSTOM_LINK_ICONS ile aynı anahtarlar). */
export const CUSTOM_LINK_ICON_COMPONENTS: Record<CustomLinkIcon, LucideIcon> = {
  link: Link2, book: BookOpen, video: Video, gift: Gift, megaphone: Megaphone, star: Star, heart: Heart, sparkles: Sparkles,
  graduation: GraduationCap, message: MessageCircle, phone: Phone, shop: ShoppingBag,
};

type MenuItem = DesignedNavItem<NavItem>;

/** Menü öğesinin görünen adı: süper adminin verdiği ad (dil başına), yoksa çevrilmiş varsayılan. */
function useMenuLabels() {
  const t = useT();
  const locale = useLocale();
  const { design } = useDashboardDesign();
  const label = (item: MenuItem, short = false) => locale === "tr"
    ? item.customLabel ?? t(short ? item.short ?? item.label : item.label)
    : item.customLabelEn ?? (item.customId ? item.customLabel ?? item.label : t(short ? item.short ?? item.label : item.label));
  const group = (key: NavGroup) => (locale === "tr" ? design.nav.groupLabels[key] : undefined) ?? t(GROUP_LABELS[key]);
  return { label, group };
}

/** Panel içi ya da dış (yeni sekme) bağlantı. */
function MenuLink({ item, className, children, onClick, ...rest }: { item: MenuItem; className?: string; children: React.ReactNode; onClick?: () => void; title?: string; "aria-current"?: "page" | undefined; "data-dashboard-tour"?: string }) {
  if (item.external) {
    return <a href={item.href} className={className} onClick={onClick} target={item.newTab ? "_blank" : undefined} rel="noopener noreferrer" title={rest.title}>{children}</a>;
  }
  return <Link href={item.href} className={className} onClick={onClick} {...rest}>{children}</Link>;
}

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
  const { design } = useDashboardDesign();
  const items: MenuItem[] = useMemo(
    () => applyNavDesign(visibleItems(showLiveOperations, canOpenOperations, access, can), design, (link) => ({ href: link.href, label: link.label, icon: CUSTOM_LINK_ICON_COMPONENTS[link.icon], group: link.group })),
    [access, can, canOpenOperations, design, showLiveOperations]
  );
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const isActive = (href: string) => href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
  return { items, isAdmin, isActive, access, pathname };
}

const tourId = (href: string) => href === "/dashboard" ? "overview" : href.replace("/dashboard/", "");

export function DashboardSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const t = useT();
  const { businesses, businessId } = useBusinessContext();
  const { items, isAdmin, isActive } = useDashboardNav();
  const menu = useMenuLabels();
  const activeBusiness = businesses.find((b) => b.id === businessId) ?? businesses[0];
  const groups = (Object.keys(GROUP_LABELS) as NavGroup[])
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);

  return (
    <aside className={styles.sidebar} aria-label={t("İşletme menüsü")}>
      <Link href="/dashboard" className={styles.brand} title={activeBusiness?.name ?? "SeninRandevun"}>
        <Image src="/logo.png" alt="" width={36} height={36} className={styles.brandLogo} />
        <span className={styles.brandText}>
          <small>{t("İşletme paneli")}</small>
          <b>{activeBusiness?.name ?? "SeninRandevun"}</b>
        </span>
      </Link>
      <nav className={styles.sideNav}>
        {groups.map(({ group, items: groupItems }) => (
          <section key={group} className={styles.sideGroup}>
            <p className={styles.sideGroupLabel}>{menu.group(group)}</p>
            {groupItems.map((item) => {
              const Icon = item.icon;
              const active = !item.external && isActive(item.href);
              return (
                <MenuLink
                  key={item.customId ?? item.href}
                  item={item}
                  data-dashboard-tour={item.customId ? undefined : tourId(item.href)}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? menu.label(item) : undefined}
                  className={cn(styles.sideLink, active && styles.sideLinkActive)}
                >
                  <span className={styles.sideIcon}><Icon size={18} strokeWidth={active ? 2.2 : 1.9} aria-hidden /></span>
                  <span className={styles.sideLabel}>{menu.label(item)}</span>
                  {item.external && <ExternalLink size={12} className={styles.sideLabel} aria-hidden />}
                </MenuLink>
              );
            })}
          </section>
        ))}
        {isAdmin && (
          <section className={styles.sideGroup}>
            <p className={styles.sideGroupLabel}>{t("Platform")}</p>
            <Link href="/super-admin" className={cn(styles.sideLink, styles.sideLinkAdmin)} title={collapsed ? t("Süper Admin") : undefined}>
              <span className={styles.sideIcon}><ShieldCheck size={18} aria-hidden /></span>
              <span className={styles.sideLabel}>{t("Süper Admin")}</span>
            </Link>
          </section>
        )}
      </nav>
      <button type="button" className={styles.collapseBtn} onClick={onToggle} aria-label={collapsed ? t("Menüyü genişlet") : t("Menüyü daralt")} aria-pressed={collapsed}>
        {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        <span className={styles.sideLabel}>{t("Menüyü daralt")}</span>
      </button>
    </aside>
  );
}

export function DashboardBottomNav() {
  const t = useT();
  const { items, isAdmin, isActive, access } = useDashboardNav();
  const menu = useMenuLabels();
  const [moreOpen, setMoreOpen] = useState(false);
  const isStaff = access?.role === "staff";
  const primaryHrefs = useMemo(() => isStaff
    ? ["/dashboard/takvim", "/dashboard/randevular"]
    : ["/dashboard", "/dashboard/takvim", "/dashboard/randevular"], [isStaff]);
  const primaryItems = primaryHrefs.map((href) => items.find((item) => item.href === href && !item.customId)).filter(Boolean) as MenuItem[];
  // Staff: 2 sekme + Yeni + müşteriler/destek + Daha fazla
  const fourth = isStaff ? (items.find((item) => item.href === "/dashboard/musteriler") ?? items.find((item) => item.href === "/dashboard/destek")) : items.find((item) => item.href === "/dashboard/musteriler");
  const slots = [...primaryItems.slice(0, 2), "new" as const, ...(isStaff ? [] : primaryItems.slice(2)), ...(isStaff && fourth ? [fourth] : [])].slice(0, 4);
  const inBar = new Set(slots.filter((slot): slot is MenuItem => slot !== "new").map((item) => item.href));
  const moreItems = items.filter((item) => item.customId || !inBar.has(item.href));
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
      <nav className={styles.bottomNav} aria-label={t("İşletme paneli menüsü")}>
        <ul>
          {slots.map((slot) => {
            if (slot === "new") {
              return (
                <li key="new">
                  <button type="button" className={styles.fab} onClick={() => openQuickAppointment()} aria-label={t("Yeni randevu")}>
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
                  <span className={styles.bottomLabel}>{menu.label(slot, true)}</span>
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
              <span className={styles.bottomLabel}>{t("Daha fazla")}</span>
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t("Tüm araçlar")} description={t("İşletmenizi yönetmek için ihtiyacınız olan her şey.")}>
        <div className={styles.moreGroups}>
          {groups.map(({ group, items: groupItems }) => (
            <section key={group}>
              <p className={styles.moreLabel}>{menu.group(group)}</p>
              <div className={styles.moreGrid}>
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  const active = !item.external && isActive(item.href);
                  return (
                    <MenuLink
                      key={item.customId ?? item.href}
                      item={item}
                      data-dashboard-tour={item.customId ? undefined : tourId(item.href)}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(styles.moreTile, active && styles.moreTileActive)}
                    >
                      <span className={styles.moreTileIcon}><Icon size={20} aria-hidden /></span>
                      <span>{menu.label(item)}</span>
                    </MenuLink>
                  );
                })}
              </div>
            </section>
          ))}
          {isAdmin && (
            <section>
              <p className={styles.moreLabel}>{t("Platform")}</p>
              <div className={styles.moreGrid}>
                <Link href="/super-admin" onClick={() => setMoreOpen(false)} className={styles.moreTile}>
                  <span className={styles.moreTileIcon}><ShieldCheck size={20} aria-hidden /></span>
                  <span>{t("Süper Admin")}</span>
                </Link>
              </div>
            </section>
          )}
        </div>
      </Sheet>
    </>
  );
}
