"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useLiveOperationsAvailable } from "@/features/live-queue/use-live-operations-available";
import {
  Activity, BellRing, Bot, CalendarDays, ChartNoAxesCombined, ChevronDown, CircleUserRound, Clock3, CreditCard, GitBranch, Headphones, Menu, ReceiptText, X,
  LayoutDashboard, MessageSquareText, Scissors, Settings2,
  ShieldCheck, Star, UsersRound, WandSparkles, type LucideIcon,
} from "lucide-react";

const ADMIN_EMAIL = "cihatwin@gmail.com";

type NavGroup = "merkez" | "operasyon" | "buyume" | "yonetim" | "sistem";
interface NavItem { href: string; label: string; icon: LucideIcon; group: NavGroup }
const GROUP_LABELS: Record<NavGroup, string> = { merkez: "Çalışma alanı", operasyon: "Canlı operasyon", buyume: "Analiz ve otomasyon", yonetim: "İşletme yönetimi", sistem: "Hesap ve sistem" };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard, group: "merkez" },
  { href: "/dashboard/subeler", label: "Şubeler", icon: GitBranch, group: "merkez" },
  { href: "/dashboard/asistan", label: "İşletme Asistanı", icon: Bot, group: "merkez" },
  { href: "/dashboard/takvim", label: "Takvim", icon: CalendarDays, group: "operasyon" },
  { href: "/dashboard/randevular", label: "Randevular", icon: MessageSquareText, group: "operasyon" },
  { href: "/dashboard/operasyon", label: "Kasa & Operasyon", icon: ReceiptText, group: "operasyon" },
  { href: "/dashboard/bekleme-listesi", label: "Bekleme Listesi", icon: BellRing, group: "operasyon" },
  { href: "/dashboard/canli-operasyon", label: "Canlı Sıra", icon: Activity, group: "operasyon" },
  { href: "/dashboard/analitik", label: "Analiz & Büyüme", icon: ChartNoAxesCombined, group: "buyume" },
  { href: "/dashboard/otomasyonlar", label: "Otomasyonlar", icon: WandSparkles, group: "buyume" },
  { href: "/dashboard/hizmetler", label: "Hizmetler", icon: Scissors, group: "yonetim" },
  { href: "/dashboard/calisanlar", label: "Çalışanlar", icon: UsersRound, group: "yonetim" },
  { href: "/dashboard/calisma-saatleri", label: "Çalışma Saatleri", icon: Clock3, group: "yonetim" },
  { href: "/dashboard/musteriler", label: "Müşteriler", icon: UsersRound, group: "yonetim" },
  { href: "/dashboard/yorumlar", label: "Yorumlar", icon: Star, group: "yonetim" },
  { href: "/dashboard/destek", label: "Destek", icon: Headphones, group: "sistem" },
  { href: "/dashboard/abonelik", label: "Abonelik", icon: CreditCard, group: "sistem" },
  { href: "/dashboard/ayarlar", label: "Ayarlar", icon: Settings2, group: "sistem" },
  { href: "/hesabim", label: "Müşteri Modu", icon: CircleUserRound, group: "sistem" },
];

function visibleItems(showLiveOperations: boolean, canOpenOperations: boolean, access: ReturnType<typeof useBusinessContext>["access"]) {
  return navItems.filter((item) => (item.href !== "/dashboard/canli-operasyon" || showLiveOperations) &&
    (item.href !== "/dashboard/operasyon" || canOpenOperations) &&
    (access?.role !== "staff" || ["/dashboard/takvim", "/dashboard/randevular", "/dashboard/destek", "/hesabim", ...(access?.permissions.viewCustomers ? ["/dashboard/musteriler"] : []), ...(canOpenOperations ? ["/dashboard/operasyon"] : [])].includes(item.href)));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { businesses, businessId, access } = useBusinessContext();
  const showLiveOperations = useLiveOperationsAvailable();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const canOpenOperations = access?.role !== "staff" || !!(access.permissions.manageCheckout || access.permissions.manageCatalog || access.permissions.managePackages || access.permissions.manageFinance);
  const items = visibleItems(showLiveOperations, canOpenOperations, access);
  const primaryHrefs = ["/dashboard", "/dashboard/takvim", "/dashboard/randevular", "/dashboard/operasyon", "/dashboard/musteriler"];
  const primaryItems = items.filter((item) => primaryHrefs.includes(item.href));
  const secondaryItems = items.filter((item) => !primaryHrefs.includes(item.href));
  const secondaryActive = secondaryItems.some((item) => pathname.startsWith(item.href));
  
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
      <nav className="dashboard-nav-groups dashboard-nav-simple">
        <section><p>Ana menü</p>{primaryItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-dashboard-tour={item.href === "/dashboard" ? "overview" : item.href.replace("/dashboard/", "")}
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
          })}</section>
        {secondaryItems.length > 0 && <details className="dashboard-sidebar-more" open={secondaryActive || undefined}>
          <summary><span><Menu size={16}/> Diğer araçlar</span><ChevronDown size={16}/></summary>
          <div>{(Object.keys(GROUP_LABELS) as NavGroup[]).map((group) => {
            const groupItems = secondaryItems.filter((item) => item.group === group);
            if (!groupItems.length) return null;
            return <section key={group}><p>{GROUP_LABELS[group]}</p>{groupItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return <Link
                key={item.href}
                href={item.href}
                data-dashboard-tour={item.href.replace("/dashboard/", "")}
                className={cn(
                  "nav-chip nav-chip-secondary flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  active ? "active" : "",
                  active
                    ? "bg-[var(--text-1)] pl-4 text-[var(--bg-1)] shadow-lg"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]",
                )}
              ><span className="nav-icon grid h-7 w-7 place-items-center rounded-lg bg-[var(--surface-3)]"><Icon aria-hidden="true" size={15} strokeWidth={1.8}/></span>{item.label}</Link>;
            })}</section>;
          })}</div>
        </details>}
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
  const { user } = useAuth();
  const { access } = useBusinessContext();
  const showLiveOperations = useLiveOperationsAvailable();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const canOpenOperations = access?.role !== "staff" || !!(access.permissions.manageCheckout || access.permissions.manageCatalog || access.permissions.managePackages || access.permissions.manageFinance);
  const [moreOpen, setMoreOpen] = useState(false);
  const items = visibleItems(showLiveOperations, canOpenOperations, access);
  const primaryHrefs = ["/dashboard", "/dashboard/takvim", "/dashboard/randevular", canOpenOperations ? "/dashboard/operasyon" : "/dashboard/musteriler"];
  const primaryItems = primaryHrefs.map((href) => items.find((item) => item.href === href)).filter(Boolean) as NavItem[];
  const moreItems = items.filter((item) => !primaryHrefs.includes(item.href));

  useEffect(() => {
    const revealTourTarget = (event: Event) => {
      const target = (event as CustomEvent<{ target?: string }>).detail?.target;
      if (!target) return;
      const belongsToMoreMenu = moreItems.some((item) => item.href.replace("/dashboard/", "") === target);
      setMoreOpen(belongsToMoreMenu);
    };
    window.addEventListener("dashboard:tour-reveal", revealTourTarget);
    return () => window.removeEventListener("dashboard:tour-reveal", revealTourTarget);
  }, [moreItems]);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && <>
        <button type="button" className="dashboard-more-backdrop lg:hidden" aria-label="Menüyü kapat" onClick={() => setMoreOpen(false)}/>
        <aside id="dashboard-more-menu" className="dashboard-more-sheet lg:hidden" role="dialog" aria-modal="true" aria-label="İşletme menüsü">
          <header><div><small>İŞLETME MENÜSÜ</small><b>Tüm çalışma alanları</b></div><button type="button" onClick={() => setMoreOpen(false)} aria-label="Kapat"><X size={18}/></button></header>
          <div>{(Object.keys(GROUP_LABELS) as NavGroup[]).map((group) => {
            const grouped = moreItems.filter((item) => item.group === group);
            if (!grouped.length) return null;
            return <section key={group}><p>{GROUP_LABELS[group]}</p><nav>{grouped.map((item) => {
              const Icon=item.icon;
              return <Link key={item.href} href={item.href} data-dashboard-tour={item.href.replace("/dashboard/", "")} onClick={() => setMoreOpen(false)} className={pathname.startsWith(item.href) ? "active" : ""}><span><Icon size={17}/></span>{item.label}<i>›</i></Link>;
            })}</nav></section>;
          })}{isAdmin && <section><p>Platform</p><nav><Link href="/super-admin" onClick={() => setMoreOpen(false)}><span><ShieldCheck size={17}/></span>Süper Admin<i>↗</i></Link></nav></section>}</div>
        </aside>
      </>}
      <nav className="dashboard-bottom-nav fixed inset-x-3 bottom-3 z-40 overflow-hidden lg:hidden" aria-label="İşletme paneli menüsü">
        <span className="dashboard-bottom-nav-shine" aria-hidden="true" />
        <ul className="dashboard-bottom-primary">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-dashboard-tour={item.href === "/dashboard" ? "overview" : item.href.replace("/dashboard/", "")}
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
          <li><button type="button" className={cn("dashboard-bottom-nav-link", moreOpen ? "active" : "")} onClick={() => setMoreOpen((current) => !current)} aria-expanded={moreOpen} aria-controls="dashboard-more-menu"><span className="dashboard-bottom-nav-icon">{moreOpen ? <X size={20}/> : <Menu size={20}/>}</span><span>Diğer</span></button></li>
        </ul>
      </nav>
    </>
  );
}
