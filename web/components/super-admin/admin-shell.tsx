"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { BellRing, Moon, Search, ShieldCheck, Sun } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";
import { AdminMobileNav, AdminSidebar, useUnreadAlertCount } from "@/components/super-admin/admin-sidebar";
import { AdminCommandPalette } from "@/components/super-admin/admin-command-palette";
import { ALERTS_HREF, currentNavItem, ADMIN_NAV_GROUPS } from "@/components/super-admin/admin-nav";
import { adminTokensClassName, EmptyState } from "@/components/super-admin/ui";
import { BrandPageLoader } from "@/components/ui/brand-page-loader";
import { logout } from "@/features/auth/auth-service";
import { cn } from "@/lib/utils/cn";
import styles from "./admin-shell.module.css";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";
const COLLAPSE_KEY = "superAdmin.sidebarCollapsed";

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const isPrimaryAdmin = user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL;
  const [adminCheck, setAdminCheck] = useState<{ uid: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/giris");
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !user || isPrimaryAdmin) return;
    getDoc(doc(getDb(), "platformAdmins", user.uid))
      .then((snap) => setAdminCheck({ uid: user.uid, allowed: snap.exists() }))
      .catch(() => setAdminCheck({ uid: user.uid, allowed: false }));
  }, [isPrimaryAdmin, status, user]);

  // Birincil yönetici her zaman yetkili; diğerleri için Firestore kontrolü beklenir.
  const allowed = isPrimaryAdmin ? true : user && adminCheck?.uid === user.uid ? adminCheck.allowed : null;

  if (status === "loading" || status === "unauthenticated" || allowed === null) {
    return (
      <BrandPageLoader
        title={status === "unauthenticated" ? "Girişe yönlendiriliyorsunuz" : "Yetkiniz güvenle doğrulanıyor"}
        label={status === "unauthenticated" ? "Güvenli giriş ekranı hazırlanıyor." : "Platform yönetim alanınız ve erişim izinleriniz hazırlanıyor."}
        eyebrow="PLATFORM GÜVENLİK KATMANI"
        securityMode
      />
    );
  }

  if (!allowed) {
    return (
      <main className={cn(adminTokensClassName, "mx-auto max-w-lg px-4 py-20")}>
        <EmptyState icon={ShieldCheck} title="Yetkisiz erişim" description="Bu alan yalnızca platform yöneticilerine açıktır." />
      </main>
    );
  }

  return <AdminFrame email={user?.email}>{children}</AdminFrame>;
}

/** Yetki doğrulandıktan sonraki kabuk; mock/önizleme için ayrı dışa aktarılır. */
export function AdminFrame({ children, email }: { children: ReactNode; email?: string | null }) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const unreadAlerts = useUnreadAlertCount(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* depolama kapalı */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      try { window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1"); } catch { /* depolama kapalı */ }
      return !value;
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/isletmeler/giris");
  }, [router]);

  const current = currentNavItem(pathname);
  const group = current ? ADMIN_NAV_GROUPS.find((item) => item.items.includes(current))?.label : undefined;
  const isAssistant = pathname.startsWith("/super-admin/asistan");

  return (
    // "admin-v2": asistan sayfasının global tam ekran kuralları bu sınıfa bağlı.
    <div data-admin-root className={cn("admin-v2", adminTokensClassName, styles.root, collapsed && styles.collapsed, isAssistant && styles.assistantRoute)}>
      <AdminSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} unreadAlerts={unreadAlerts} onOpenSearch={() => setPaletteOpen(true)} onLogout={() => void handleLogout()} />
      <div className={cn("min-w-0", styles.main)}>
        <header className={styles.topbar}>
          <Link href="/super-admin" className={styles.mobileBrand} aria-label="Platform özeti"><ShieldCheck size={19} /></Link>
          <div className={styles.crumb}>
            <small>{group ?? "Süper admin"}</small>
            <b>{current?.label ?? "Platform"}</b>
          </div>
          <div className={styles.topActions}>
            <button type="button" className={styles.topSearch} onClick={() => setPaletteOpen(true)}>
              <Search size={15} aria-hidden /><span>Ara veya git…</span><kbd className={styles.kbd}>⌘K</kbd>
            </button>
            <button type="button" className={cn(styles.iconBtn, styles.searchIconBtn)} onClick={() => setPaletteOpen(true)} aria-label="Ara veya git"><Search size={17} /></button>
            <Link href={ALERTS_HREF} className={cn(styles.iconBtn, styles.desktopOnly)} aria-label={unreadAlerts ? `${unreadAlerts} okunmamış uyarı` : "Uyarılar"}>
              <BellRing size={17} />
              {unreadAlerts > 0 && <b className={styles.dotBadge}>{unreadAlerts > 99 ? "99+" : unreadAlerts}</b>}
            </Link>
            <button type="button" className={styles.iconBtn} onClick={toggleTheme} aria-label={theme === "light" ? "Koyu temaya geç" : "Açık temaya geç"}>
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            {email && <span className={styles.accountChip} title={email}>{email}</span>}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
      <AdminMobileNav unreadAlerts={unreadAlerts} email={email} theme={theme} onToggleTheme={toggleTheme} onLogout={() => void handleLogout()} onOpenSearch={() => setPaletteOpen(true)} />
      <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
