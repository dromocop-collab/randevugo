"use client";

import { ReactNode } from "react";
import { DashboardBottomNav, DashboardSidebar } from "@/components/dashboard/navigation";
import { DashboardTopBar } from "@/components/dashboard/topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="panel-shell mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 lg:px-6">
      <DashboardSidebar />
      <div className="min-w-0 flex-1 pb-28 lg:pb-6">
        <DashboardTopBar />
        <div className="mt-6">{children}</div>
      </div>
      <DashboardBottomNav />
    </div>
  );
}
