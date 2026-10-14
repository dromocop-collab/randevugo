import { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/super-admin/admin-shell";
import { InstallAppPrompt } from "@/components/pwa/install-app";

export const metadata: Metadata = {
  title: "Süper Admin",
  robots: { index: false, follow: false },
  manifest: "/pwa/yonetim.webmanifest",
  appleWebApp: { capable: true, title: "SR Yönetim", statusBarStyle: "default" },
  icons: { apple: "/pwa/apple-touch-icon.png" },
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell><InstallAppPrompt app="yonetim" />{children}</AdminShell>;
}
