"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";

const ADMIN_EMAIL = "cihatwin@gmail.com";
// Maintenance mode never blocks these paths (admin login/panel must stay reachable)
const ALWAYS_ALLOWED_PREFIXES = ["/super-admin", "/giris"];

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then((settings) => setMaintenanceMode(settings.maintenanceMode))
      .catch(() => setMaintenanceMode(false))
      .finally(() => setChecked(true));
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const isAllowedPath = ALWAYS_ALLOWED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (checked && maintenanceMode && !isAdmin && !isAllowedPath) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-1)] px-6 text-center">
        <span className="text-5xl">🛠️</span>
        <h1 className="text-xl font-bold text-[var(--text-1)]">Bakım Çalışması</h1>
        <p className="max-w-md text-sm text-[var(--text-3)]">
          Platformumuzda kısa süreli bir bakım çalışması yapılıyor. Kısa süre içinde tekrar
          hizmetinizdeyiz.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
