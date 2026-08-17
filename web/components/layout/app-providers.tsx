"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-context";
import { BusinessProvider } from "@/features/businesses/business-context";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SupportBubble } from "@/components/ui/support-bubble";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { AnalyticsScripts } from "@/components/layout/analytics-scripts";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BusinessProvider>
          <AnalyticsScripts />
          <MaintenanceGate>
            <AnnouncementBanner />
            {children}
          </MaintenanceGate>
          <ToastProvider />
          <SupportBubble />
        </BusinessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

