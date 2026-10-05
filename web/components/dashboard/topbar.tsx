"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CirclePlus, Clock3, Compass, ExternalLink, LogOut, Plus, Store, UserRound } from "lucide-react";
import { logout } from "@/features/auth/auth-service";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { DashboardCommandCenter } from "@/components/dashboard/command-center";
import { AppearanceStudio } from "@/components/dashboard/appearance-studio";
import { openQuickAppointment } from "@/components/dashboard/dashboard-events";
import { Badge, Button, Sheet, dashTokensClassName } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./topbar.module.css";

function initials(value?: string | null) {
  const clean = (value ?? "").trim();
  if (!clean) return "S";
  const parts = clean.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toLocaleUpperCase("tr-TR");
}

export function DashboardTopBar() {
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId, access } = useBusinessContext();
  const { can, plan } = useSubscriptionPlan();
  const router = useRouter();
  const isStaff = access?.role === "staff";
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const accountRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const canAddBranch = !isStaff && can("branches") && businesses.length < (plan?.maxStores ?? 10);
  const canSwitch = businesses.length > 1 || canAddBranch;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!accountRef.current?.contains(target) && !menuRef.current?.contains(target)) setAccountOpen(false);
    };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [accountOpen]);

  function toggleAccount() {
    const rect = accountRef.current?.getBoundingClientRect();
    if (rect && window.matchMedia("(min-width: 640px)").matches) setMenuStyle({ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) });
    else setMenuStyle({});
    setAccountOpen((value) => !value);
  }

  async function signOut() {
    setAccountOpen(false);
    await logout();
    router.push("/isletmeler/giris");
  }

  const statusBadge = activeBusiness?.status === "pending_review"
    ? <Badge tone="amber" size="sm" icon={Clock3}>Onay bekliyor</Badge>
    : activeBusiness?.status === "rejected" ? <Badge tone="red" size="sm">Reddedildi</Badge> : null;

  const businessButton = (
    <>
      <span className={styles.bizAvatar} aria-hidden>
        {activeBusiness?.logoUrl
          ? <Image src={activeBusiness.logoUrl} alt="" width={36} height={36} unoptimized />
          : initials(activeBusiness?.name)}
      </span>
      <span className={styles.bizText}>
        <small>{isStaff ? "Çalışan paneli" : "İşletme"}</small>
        <b>{activeBusiness?.name ?? "SeninRandevun"}</b>
      </span>
      {canSwitch && <ChevronDown size={16} className={styles.bizChevron} aria-hidden />}
    </>
  );

  return (
    <header className={cn(styles.topbar, scrolled && styles.topbarScrolled)}>
      <div className={styles.inner}>
        <div className={styles.left}>
          {canSwitch
            ? <button type="button" className={styles.biz} onClick={() => setSwitcherOpen(true)} aria-haspopup="dialog" aria-label={`İşletme: ${activeBusiness?.name ?? ""}. Değiştir`}>{businessButton}</button>
            : <Link href={isStaff ? "/dashboard/takvim" : "/dashboard"} className={styles.biz}>{businessButton}</Link>}
          {statusBadge && <span className={styles.statusSlot}>{statusBadge}</span>}
        </div>

        <div className={styles.center}>
          <DashboardCommandCenter />
        </div>

        <div className={styles.right}>
          <Button variant="primary" size="sm" icon={Plus} className={styles.newBtn} onClick={() => openQuickAppointment()}>Yeni randevu</Button>
          {!isStaff && <NotificationCenter key={businessId} businessId={businessId} triggerClassName={styles.iconBtn} />}
          <AppearanceStudio triggerClassName={cn(styles.iconBtn, styles.hideMobile)} />
          <div className={styles.account} ref={accountRef}>
            <button type="button" className={styles.avatarBtn} onClick={toggleAccount} aria-expanded={accountOpen} aria-haspopup="menu" aria-label="Hesap menüsü">
              {initials(user?.email)}
            </button>
            {accountOpen && typeof document !== "undefined" && createPortal(
              <div className={dashTokensClassName}>
                <button type="button" className={styles.menuBackdrop} aria-label="Menüyü kapat" onClick={() => setAccountOpen(false)} />
                <div className={styles.menu} role="menu" aria-label="Hesap" ref={menuRef} style={menuStyle}>
                  <div className={styles.menuHead}>
                    <span className={styles.menuAvatar} aria-hidden>{initials(user?.email)}</span>
                    <span className="min-w-0"><small>{isStaff ? "Çalışan hesabı" : "İşletme hesabı"}</small><b>{user?.email ?? ""}</b></span>
                  </div>
                  {activeBusiness?.slug && <Link role="menuitem" href={`/isletme/${activeBusiness.slug}`} className={styles.menuItem} onClick={() => setAccountOpen(false)}><Store size={16} aria-hidden /> Mağazamı gör <ExternalLink size={13} className={styles.menuTrail} aria-hidden /></Link>}
                  <Link role="menuitem" href="/kesfet" className={styles.menuItem} onClick={() => setAccountOpen(false)}><Compass size={16} aria-hidden /> Keşfet</Link>
                  <Link role="menuitem" href="/hesabim" className={styles.menuItem} onClick={() => setAccountOpen(false)}><UserRound size={16} aria-hidden /> Müşteri moduna geç</Link>
                  <button role="menuitem" type="button" className={cn(styles.menuItem, styles.showMobileFlex)} onClick={() => { setAccountOpen(false); window.dispatchEvent(new Event("sr-dashboard-open-appearance")); }}><span className={styles.menuIcon} aria-hidden>◐</span> Görünüm stüdyosu</button>
                  <button role="menuitem" type="button" className={cn(styles.menuItem, styles.menuDanger)} onClick={() => void signOut()}><LogOut size={16} aria-hidden /> Çıkış yap</button>
                </div>
              </div>,
              document.body,
            )}
          </div>
        </div>
      </div>

      <Sheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} size="sm" title="İşletme değiştir" description="Panelde gördüğünüz veriler seçtiğiniz işletmeye göre güncellenir.">
        <div className={styles.bizList} role="list">
          {businesses.map((business) => {
            const active = business.id === activeBusiness?.id;
            return (
              <button
                key={business.id}
                type="button"
                role="listitem"
                className={cn(styles.bizRow, active && styles.bizRowActive)}
                onClick={() => { setBusinessId(business.id); setSwitcherOpen(false); }}
                aria-current={active ? "true" : undefined}
              >
                <span className={styles.bizAvatar} aria-hidden>{initials(business.name)}</span>
                <span className={styles.bizRowText}>
                  <b>{business.name}</b>
                  <small>{business.status === "pending_review" ? "Süper admin onayı bekleniyor" : business.status === "rejected" ? "Reddedildi" : [business.district, business.city].filter(Boolean).join(", ") || "Aktif"}</small>
                </span>
                {active && <Check size={18} className={styles.bizCheck} aria-hidden />}
              </button>
            );
          })}
        </div>
        {canAddBranch && <Button href="/dashboard/subeler" variant="soft" icon={CirclePlus} block className="mt-3" onClick={() => setSwitcherOpen(false)}>Yeni şube ekle</Button>}
      </Sheet>
    </header>
  );
}
