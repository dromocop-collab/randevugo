"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider } from "@/features/auth/auth-context";
import { BusinessProvider } from "@/features/businesses/business-context";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SupportBubble } from "@/components/ui/support-bubble";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { AnalyticsScripts } from "@/components/layout/analytics-scripts";
import { PageViewTracker } from "@/components/layout/page-view-tracker";
import { BrandCursor } from "@/components/ui/brand-cursor";
import { initializeFirebaseAppCheck } from "@/lib/firebase/app-check";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    initializeFirebaseAppCheck();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BusinessProvider>
          <AnalyticsScripts />
          <PageViewTracker />
          <MaintenanceGate>
            <AnnouncementBanner />
            {children}
          </MaintenanceGate>
          <ToastProvider />
          <SupportBubble />
          <BrandCursor />
        </BusinessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
