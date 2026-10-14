import { ReactNode } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { RequireBusiness } from "@/components/dashboard/require-business";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { InstallAppPrompt } from "@/components/pwa/install-app";

// Kurulabilir "SR İşletme" uygulaması (PWA): müşteri sitesinin manifest'inden ayrı, panelden açılır.
export const metadata: Metadata = {
  title: "İşletme Paneli",
  robots: { index: false, follow: false },
  manifest: "/pwa/isletme.webmanifest",
  appleWebApp: { capable: true, title: "SR İşletme", statusBarStyle: "default" },
  icons: { apple: "/pwa/apple-touch-icon.png" },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute loginPath="/isletmeler/giris">
      <DashboardShell>
        <RequireBusiness><InstallAppPrompt app="isletme" />{children}</RequireBusiness>
      </DashboardShell>
    </ProtectedRoute>
  );
}
