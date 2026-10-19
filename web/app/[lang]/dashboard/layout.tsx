import { ReactNode } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { RequireBusiness } from "@/components/dashboard/require-business";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { InstallAppPrompt } from "@/components/pwa/install-app";
import { getT } from "@/i18n/server";

// Kurulabilir "SR İşletme" uygulaması (PWA): müşteri sitesinin manifest'inden ayrı, panelden açılır.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
  title: t("İşletme Paneli"),
  robots: { index: false, follow: false },
  manifest: "/pwa/isletme.webmanifest",
  appleWebApp: { capable: true, title: "SR İşletme", statusBarStyle: "default" }, // i18n-ignore
  icons: { apple: "/pwa/apple-touch-icon.png" },
  };
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute loginPath="/isletmeler/giris">
      <DashboardShell>
        <RequireBusiness><InstallAppPrompt app="isletme" />{children}</RequireBusiness>
      </DashboardShell>
    </ProtectedRoute>
  );
}
