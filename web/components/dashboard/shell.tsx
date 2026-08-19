"use client";

import { ReactNode } from "react";
import { DashboardBottomNav, DashboardSidebar } from "@/components/dashboard/navigation";
import { DashboardTopBar } from "@/components/dashboard/topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="panel-shell dashboard-v2 mx-auto flex w-full max-w-[1500px] gap-5 px-3 py-3 lg:px-5 lg:py-5">
      <DashboardSidebar />
      <div className="min-w-0 flex-1 pb-28 lg:pb-6">
        <DashboardTopBar />
        <div className="mt-5">{children}</div>
      </div>
      <DashboardBottomNav />
    </div>
  );
}
