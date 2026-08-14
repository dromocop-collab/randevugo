import { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { RequireBusiness } from "@/components/dashboard/require-business";
import { ProtectedRoute } from "@/lib/auth/protected-route";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardShell>
        <RequireBusiness>{children}</RequireBusiness>
      </DashboardShell>
    </ProtectedRoute>
  );
}
