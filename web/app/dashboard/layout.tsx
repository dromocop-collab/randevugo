import { ReactNode } from "react";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { RequireBusiness } from "@/components/dashboard/require-business";
import { ProtectedRoute } from "@/lib/auth/protected-route";

export const metadata: Metadata = { title: "İşletme Paneli", robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <RequireBusiness>{children}</RequireBusiness>
      </DashboardShell>
    </ProtectedRoute>
  );
}
