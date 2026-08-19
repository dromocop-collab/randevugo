import { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/super-admin/admin-shell";

export const metadata: Metadata = { title: "Süper Admin", robots: { index: false, follow: false } };

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
