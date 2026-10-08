"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { User } from "firebase/auth";
import {
  Apple,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  ChevronRight,
  Compass,
  LayoutGrid,
  LifeBuoy,
  LogIn,
  Mail,
  MoonStar,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SunMedium,
  Ticket,
  X,
  Zap,
  type LucideIcon,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";
import { LaunchCampaign } from "@/components/marketing/launch-campaign";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { APP_STORE_URL, PLAY_STORE_AVAILABLE, PLAY_STORE_URL } from "@/lib/app-store";
import { CATEGORY_CATALOG, FEATURED_CATEGORIES, categoryHref } from "@/components/marketing/category-catalog";
import styles from "./marketing-shell.module.css";

type NavItem = { href: string; label: string; description: string; icon: LucideIcon; live?: boolean; wide?: boolean };

/** Masaüstü başlık bağlantıları. */
const productLinks: NavItem[] = [
  { href: "/kesfet", label: "Mağazaları keşfet", description: "Yakınındaki işletmeleri bul", icon: Compass },
  { href: "/kategoriler", label: "Kategoriler", description: "Kuaförden veterinere tüm alanlar", icon: LayoutGrid },
  { href: "/simdi-musait", label: "Şimdi müsait", description: "Bugün boş saati olan işletmeler", icon: Zap, live: true, wide: true },
  { href: "/mobil-uygulama", label: "Mobil Uygulama", description: "iPhone ve Android için", icon: Smartphone },
  { href: "/hesabim", label: "Randevularım", description: "Yaklaşan ve geçmiş randevuların", icon: CalendarCheck2 },
  { href: "/yardim-merkezi", label: "Yardım", description: "Sık sorulanlar ve destek", icon: LifeBuoy },
];

/** Mobil menü satırları. */
const menuLinks: NavItem[] = [
  { href: "/kesfet", label: "Mağazaları keşfet", description: "Yakınındaki güvenilir işletmeleri bul", icon: Compass },
  { href: "/kategoriler", label: "Kategoriler", description: "Kuaförden veterinere tüm alanlar", icon: LayoutGrid },
  { href: "/simdi-musait", label: "Şimdi müsait", description: "Bugün boş saati olan işletmeler", icon: Zap, live: true },
  { href: "/siram", label: "Canlı sıra", description: "Sıradaki yerini anlık takip et", icon: Ticket },
  { href: "/hesabim", label: "Randevularım", description: "Yaklaşan ve geçmiş randevuların", icon: CalendarCheck2 },
  { href: "/mobil-uygulama", label: "Mobil uygulama", description: "iPhone ve Android için", icon: Smartphone },
  { href: "/yardim-merkezi", label: "Yardım", description: "Sık sorulanlar ve destek", icon: LifeBuoy },
];

const noopSubscribe = () => () => undefined;

function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function displayNameOf(user: User | null) {
  if (!user) return "";
  const name = user.displayName?.trim();
  if (name) return name;
  return user.email?.split("@")[0] ?? "";
}

function initialsOf(user: User | null) {
  const name = displayNameOf(user);
  if (!name) return "SR";
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
  return letters.toLocaleUpperCase("tr-TR");
}

function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi günler";
  if (hour >= 18 && hour < 23) return "İyi akşamlar";
  return "İyi geceler";
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function MarketingHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, status } = useAuth();
  const signedIn = status === "authenticated" && Boolean(user);
  const pathname = usePathname();
  const isClient = useIsClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [greeting, setGreeting] = useState("Merhaba");
  const [menuPath, setMenuPath] = useState(pathname);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Sayfa değişince menü kapanır (render sırasında senkronize edilir).
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  // Kaydırınca başlık kompakt cam görünüme geçer.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 12);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Masaüstü genişliğine geçilirse açık menü kapanır.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Açıkken: gövde kaydırma kilidi, odak tuzağı ve Esc.
  useEffect(() => {
    if (!menuOpen) return;
    // Yalnızca body kilitlenir; html'e dokunmak yapışkan başlığın kaydırma bağlamını bozar.
    const body = document.body;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const previous = { body: body.style.overflow, padding: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const sheet = sheetRef.current;
    const focusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((item) => item.getClientRects().length > 0);
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!sheet?.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const trigger = triggerRef.current;
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previous.body;
      body.style.paddingRight = previous.padding;
      const active = document.activeElement;
      if (trigger && (!active || active === document.body || sheet?.contains(active))) trigger.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const openMenu = () => {
    setGreeting(greetingFor(new Date().getHours()));
    setMenuOpen(true);
  };
  const closeMenu = () => setMenuOpen(false);
  const themeLabel = theme === "light" ? "Karanlık temayı aç" : "Açık temayı aç";
  const ThemeIcon = theme === "light" ? MoonStar : SunMedium;
  const firstName = displayNameOf(user).split(/\s+/)[0];

  return (
    <>
      <header className={`marketing-header ${styles.header}`} data-scrolled={scrolled ? "true" : "false"}>
        <div className={styles.bar}>
          <Link href="/" className={styles.brand} aria-label="SeninRandevun ana sayfa">
            <Image src="/logo.png" alt="" width={38} height={38} className={styles.brandMark} priority />
            <span className={styles.brandText}>Senin<span>Randevun</span></span>
          </Link>

          <nav className={styles.links} aria-label="Ana menü">
            {productLinks.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`${styles.link} ${item.wide ? styles.linkWide : ""}`} aria-current={active ? "page" : undefined}>
                  {item.live && <i className={styles.liveDot} aria-hidden="true" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.actions}>
            <button type="button" onClick={toggleTheme} className={`${styles.iconButton} ${styles.hideSm}`} aria-label={themeLabel} title={themeLabel}>
              <ThemeIcon size={17} />
            </button>
            {signedIn ? (
              <Link href="/hesabim" className={styles.accountChip} aria-label="Hesabım">
                <span className={styles.avatar} aria-hidden="true">{initialsOf(user)}</span>
                <span className={styles.accountChipText}>Hesabım</span>
              </Link>
            ) : (
              <>
                <Link href="/musteri/giris" className={`${styles.ghostButton} ${styles.hideSm}`}><LogIn size={15} /> Giriş</Link>
                <Link href="/isletmeler" className={`${styles.primaryButton} ${styles.hideSm}`}>İşletmeler için <ArrowUpRight size={15} /></Link>
              </>
            )}
            <button
              ref={triggerRef}
              type="button"
              className={styles.burger}
              onClick={() => (menuOpen ? closeMenu() : openMenu())}
              aria-expanded={menuOpen}
              aria-controls="mobile-customer-menu"
              aria-haspopup="dialog"
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              data-open={menuOpen ? "true" : "false"}
            >
              <span className={styles.burgerLines} aria-hidden="true"><i /><i /><i /></span>
            </button>
          </div>
        </div>
      </header>

      {isClient && createPortal(
        <div className={styles.menuRoot} data-open={menuOpen ? "true" : "false"} inert={!menuOpen}>
          <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" />
          <div ref={sheetRef} id="mobile-customer-menu" className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className={styles.sheetHead}>
              <Link href="/" className={styles.brand} onClick={closeMenu} aria-label="SeninRandevun ana sayfa">
                <Image src="/logo.png" alt="" width={34} height={34} className={styles.brandMark} />
                <span className={styles.brandText}>Senin<span>Randevun</span></span>
              </Link>
              <div className={styles.sheetHeadActions}>
                <button type="button" className={styles.iconButton} onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
                  <ThemeIcon size={18} />
                </button>
                <button ref={closeRef} type="button" className={`${styles.iconButton} ${styles.closeButton}`} onClick={closeMenu} aria-label="Menüyü kapat">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className={styles.sheetBody}>
              <section className={`${styles.greet} ${styles.stagger}`} style={{ "--i": 0 } as CSSProperties}>
                <div className={styles.greetGlow} aria-hidden="true" />
                <div className={styles.greetTop}>
                  <span className={styles.greetMascot}>{menuOpen && <RoviMascot size={64} mood="wave" alt="" interactive={false} />}</span>
                  <div className={styles.greetCopy}>
                    <h2 id={titleId}>{greeting}{signedIn && firstName ? `, ${firstName}` : ""} <span aria-hidden="true">👋</span></h2>
                    <p>Ben Rovi. Bugün sana ne ayarlayalım?</p>
                  </div>
                </div>
                <Link href="/kesfet" className={styles.greetSearch} onClick={closeMenu}>
                  <Search size={17} aria-hidden="true" />
                  <span>İşletme, hizmet veya şehir ara</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </section>

              <section className={`${styles.account} ${styles.stagger}`} style={{ "--i": 1 } as CSSProperties} aria-label="Hesap">
                {signedIn ? (
                  <Link href="/hesabim" className={styles.accountCard} onClick={closeMenu}>
                    <span className={styles.avatarLg} aria-hidden="true">{initialsOf(user)}</span>
                    <span className={styles.accountMeta}>
                      <b>{displayNameOf(user) || "Hesabım"}</b>
                      {user?.email && <small>{user.email}</small>}
                    </span>
                    <span className={styles.accountCta}>Hesabım <ChevronRight size={15} /></span>
                  </Link>
                ) : (
                  <div className={styles.authRow}>
                    <Link href="/musteri/giris" className={styles.authPrimary} onClick={closeMenu}><LogIn size={17} /> Giriş yap</Link>
                    <Link href="/musteri/kayit" className={styles.authSecondary} onClick={closeMenu}>Hesap oluştur</Link>
                  </div>
                )}
              </section>

              <nav className={styles.rows} aria-label="Mobil ana menü">
                {menuLinks.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className={`${styles.row} ${styles.stagger}`}
                      style={{ "--i": index + 2 } as CSSProperties}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={styles.rowIcon} aria-hidden="true"><Icon size={20} />{item.live && <i className={styles.rowLive} />}</span>
                      <span className={styles.rowText}><b>{item.label}</b><small>{item.description}</small></span>
                      <ChevronRight className={styles.rowChevron} size={18} aria-hidden="true" />
                    </Link>
                  );
                })}
              </nav>

              <section className={`${styles.chipsBlock} ${styles.stagger}`} style={{ "--i": 9 } as CSSProperties} aria-labelledby={`${titleId}-cats`}>
                <div className={styles.blockHead}>
                  <span id={`${titleId}-cats`}>Popüler kategoriler</span>
                  <Link href="/kategoriler" onClick={closeMenu}>Tümü <ArrowRight size={13} /></Link>
                </div>
                <div className={styles.chips}>
                  {FEATURED_CATEGORIES.map((category) => (
                    <Link key={category.slug} href={categoryHref(category.slug)} className={styles.chip} onClick={closeMenu}>
                      {category.image && <Image src={category.image} alt="" width={36} height={36} sizes="36px" className={styles.chipImage} />}
                      <span>{category.label}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className={`${styles.promo} ${styles.stagger}`} style={{ "--i": 10 } as CSSProperties}>
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={styles.appBadge} aria-label="SeninRandevun uygulamasını App Store'dan indir (yeni sekmede açılır)">
                  <Apple size={24} fill="currentColor" aria-hidden="true" />
                  <span><small>App Store&apos;dan</small><b>İndir</b></span>
                </a>
                <PlayBadge />
                <Link href="/isletmeler" className={styles.businessCard} onClick={closeMenu}>
                  <span className={styles.businessIcon} aria-hidden="true"><BriefcaseBusiness size={18} /></span>
                  <span><b>İşletmeler için</b><small>İlk ay ücretsiz</small></span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </section>

              <div className={`${styles.sheetFoot} ${styles.stagger}`} style={{ "--i": 11 } as CSSProperties}>
                <Link href="/isletmeler/giris" onClick={closeMenu}>İşletme girişi</Link>
                <Link href="/hakkimizda" onClick={closeMenu}>Hakkımızda</Link>
                <Link href="/iletisim" onClick={closeMenu}>İletişim</Link>
                <Link href="/kvkk" onClick={closeMenu}>KVKK</Link>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const FOOTER_COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Keşfet", links: [["Tüm mağazalar", "/kesfet"], ["Kategoriler", "/kategoriler"], ["Şimdi müsait", "/simdi-musait"], ["Canlı sıra", "/siram"], ["Online randevu", "/online-randevu"], ["Mobil uygulama", "/mobil-uygulama"]] },
  { title: "İşletmeler", links: [["İşletmeler için", "/isletmeler"], ["Özellikler", "/ozellikler"], ["Fiyatlar", "/fiyatlar"], ["Ücretsiz kayıt", "/isletmeler/kayit"], ["İşletme girişi", "/isletmeler/giris"], ["İşletme yardımı", "/isletmeler/yardim"]] },
  { title: "SeninRandevun", links: [["Hakkımızda", "/hakkimizda"], ["İletişim", "/iletisim"], ["Müşteri yardımı", "/yardim-merkezi"], ["Randevularım", "/hesabim"], ["Güvenlik", "/guvenlik"]] },
  { title: "Yasal", links: [["KVKK", "/kvkk"], ["Gizlilik", "/gizlilik"], ["Kullanım koşulları", "/kullanim-kosullari"], ["Çerez politikası", "/cerez-politikasi"]] },
];

const FOOTER_CATEGORIES = CATEGORY_CATALOG.filter((item) => item.landing);

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <section className={styles.footerCta}>
          <div className={styles.footerCtaGrid} aria-hidden="true" />
          <div className={styles.footerCtaCopy}>
            <span className={styles.footerEyebrow}><Sparkles size={13} /> RANDEVUNU KOLAYLAŞTIR</span>
            <h2>İyi hizmetlere,<br /><em>tam zamanında.</em></h2>
            <p>Yakınındaki güvenilir işletmeleri keşfet, gerçek müsaitliği gör ve sana uyan saati saniyeler içinde ayırt.</p>
          </div>
          <div className={styles.footerCtaActions}>
            <Link href="/kesfet" className={styles.footerCtaPrimary}>Mağazaları keşfet <ArrowRight size={17} /></Link>
            <Link href="/kategoriler" className={styles.footerCtaGhost}><LayoutGrid size={16} /> Kategoriler</Link>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={styles.appBadge} aria-label="SeninRandevun uygulamasını App Store'dan indir (yeni sekmede açılır)">
              <Apple size={24} fill="currentColor" aria-hidden="true" />
              <span><small>App Store&apos;dan</small><b>İndir</b></span>
            </a>
            <PlayBadge />
          </div>
        </section>

        <ul className={styles.footerProof}>
          <li><BadgeCheck size={15} /> Doğrulanmış işletmeler</li>
          <li><CalendarCheck2 size={15} /> 7/24 online randevu</li>
          <li><ShieldCheck size={15} /> Güvenli deneyim</li>
        </ul>

        <div className={styles.footerCategories}>
          <span className={styles.footerLabel}>Popüler kategoriler</span>
          <div className={styles.footerCategoryList}>
            {FOOTER_CATEGORIES.map((category) => (
              <Link key={category.slug} href={category.landing ?? categoryHref(category.slug)} className={styles.footerCategory}>
                {category.image && <Image src={category.image} alt="" width={28} height={28} sizes="28px" />}
                <span>{category.label}</span>
              </Link>
            ))}
            <Link href="/kategoriler" className={`${styles.footerCategory} ${styles.footerCategoryAll}`}>Tümü <ArrowRight size={14} /></Link>
          </div>
        </div>

        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.brand} aria-label="SeninRandevun ana sayfa">
              <Image src="/logo.png" alt="" width={36} height={36} className={styles.brandMark} />
              <span className={styles.brandText}>Senin<span>Randevun</span></span>
            </Link>
            <p>Yakınındaki iyi hizmetleri keşfet, sana uygun saati seç ve randevunu anında al.</p>
            <div className={styles.footerStatus}><i /> Sistemler aktif · 7/24 online</div>
            <a href="mailto:info@seninrandevun.com" className={styles.footerEmail}><Mail size={14} /> info@seninrandevun.com</a>
          </div>
          {FOOTER_COLUMNS.map((column) => <FooterColumn key={column.title} title={column.title} links={column.links} />)}
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} SeninRandevun · Tüm hakları saklıdır.</span>
          <button type="button" className={styles.footerCookie} onClick={() => window.dispatchEvent(new Event("seninrandevun:cookie-preferences"))}>Çerez ayarları</button>
          <a className={styles.footerDromocob} href="https://dromocob.tr" target="_blank" rel="noopener noreferrer" aria-label="DROMOCOB web sitesini ziyaret et">
            <i aria-hidden="true">D</i>
            <span><small>TASARIM &amp; TEKNOLOJİ</small><strong>DROMOCOB</strong></span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav className={styles.footerColumn} aria-label={title}>
      <strong>{title}</strong>
      <ul>
        {links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
      </ul>
    </nav>
  );
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return <div className="marketing-page"><LaunchCampaign /><MarketingHeader />{children}<MarketingFooter /></div>;
}

/** Google Play rozeti: mağaza linki tanımlanana kadar "Çok yakında". */
function PlayBadge() {
  const inner = <>
    <Play size={22} fill="currentColor" aria-hidden="true" />
    <span><small>{PLAY_STORE_AVAILABLE ? "Google Play'den" : "Çok yakında"}</small><b>{PLAY_STORE_AVAILABLE ? "İndir" : "Google Play"}</b></span>
  </>;
  return PLAY_STORE_AVAILABLE
    ? <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={styles.appBadge} aria-label="SeninRandevun uygulamasını Google Play'den indir (yeni sekmede açılır)">{inner}</a>
    : <span className={styles.appBadge} style={{ opacity: 0.7, cursor: "default" }} aria-label="Android uygulaması Google Play'de çok yakında">{inner}</span>;
}
