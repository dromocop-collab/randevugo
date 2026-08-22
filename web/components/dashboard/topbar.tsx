"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/auth-service";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useBusinessContext } from "@/features/businesses/business-context";
import { CirclePlus, Clock3, Compass, ExternalLink, LogOut, MoonStar, Store, SunMedium, UserRound } from "lucide-react";

export function DashboardTopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId } = useBusinessContext();
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  const router = useRouter();

  return (
    <header className="dashboard-topbar dashboard-command-bar">
      <div className="dashboard-command-inner">
        <div className="dashboard-command-copy">
          <p><span /> İŞLETME MERKEZİ</p>
          <h1>Bugünün akışını birlikte yönetin.</h1>
        </div>
        <div className="dashboard-command-actions">
          {businesses.length > 1 && (
            <select
              value={activeBusiness?.id ?? ""}
              onChange={(e) => setBusinessId(e.target.value)}
              className="h-8 max-w-[150px] truncate rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs font-medium text-[var(--text-1)] outline-none hover:bg-[var(--surface-3)] focus:border-[var(--accent)]"
              aria-label="İşletme değiştir"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.status === "pending_review" ? " · Onay bekliyor" : b.status === "rejected" ? " · Reddedildi" : ""}
                </option>
              ))}
            </select>
          )}
          {businesses.length < 3 && <Link href="/onboarding" className="command-link"><CirclePlus size={17} /><span>Yeni mağaza</span></Link>}
          {activeBusiness?.status === "pending_review" && <span className="command-link text-amber-700"><Clock3 size={16} /><span>Süper admin onayı bekleniyor</span></span>}
          <Link href="/kesfet" className="command-link command-link-discover"><Compass size={17} /><span>Keşfet</span></Link>
          {activeBusiness?.slug && <Link href={`/isletme/${activeBusiness.slug}`} className="command-link command-link-store"><Store size={17} /><span>Mağazamı gör</span><ExternalLink size={14} /></Link>}
          <span className="command-account"><i><UserRound size={15} /></i><span><small>Aktif hesap</small><b>{user?.email ?? ""}</b></span></span>
          <Button variant="secondary" className="command-icon" onClick={toggleTheme} aria-label={theme === "light" ? "Karanlık temayı aç" : "Açık temayı aç"}>
            {theme === "light" ? <MoonStar size={17} /> : <SunMedium size={17} />}
          </Button>
          <Button
            variant="ghost"
            className="command-logout"
            onClick={async () => {
              await logout();
              router.push("/isletmeler/giris");
            }}
          >
            <LogOut size={16} /><span>Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
