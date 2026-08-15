import { ReactNode } from "react";
import { AdminShell } from "@/components/super-admin/admin-shell";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
