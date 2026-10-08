"use client";

import { ReactNode, useEffect, useState } from "react";
import { DashboardBottomNav, DashboardSidebar } from "@/components/dashboard/navigation";
import { DashboardTopBar } from "@/components/dashboard/topbar";
import { SubscriptionStatusBanner } from "@/components/dashboard/subscription-status-banner";
import { SubscriptionFeatureGate } from "@/components/dashboard/subscription-feature-gate";
import { QuickAppointmentModal } from "@/components/dashboard/quick-appointment-modal";
import { SubscriptionPlanProvider } from "@/features/subscriptions/subscription-plan-context";
import { useBusinessContext } from "@/features/businesses/business-context";
import { dashTokensClassName } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import { NEW_APPOINTMENT_EVENT, notifyAppointmentsChanged, openQuickAppointment } from "@/components/dashboard/dashboard-events";
import { useNotificationSoundSync } from "@/features/push/notification-sound-sync";
import styles from "./shell.module.css";

const COLLAPSE_KEY = "sr-dashboard-sidebar-collapsed";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // Randevu sesi tercihini hesaptan al (panelde push ön plan zili seçili sesi çalar).
  useNotificationSoundSync();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY) === "1";
      if (stored) queueMicrotask(() => setCollapsed(true));
    } catch { /* depolama kapalı olabilir */ }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try { window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* yok say */ }
      return next;
    });
  }

  return (
    <SubscriptionPlanProvider>
      <div
        className={cn(dashTokensClassName, styles.shell, "dashboard-v2")}
        data-dash-root=""
        data-sidebar={collapsed ? "collapsed" : "expanded"}
      >
        <a href="#dashboard-main" className={styles.skipLink}>İçeriğe geç</a>
        <DashboardSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        <div className={styles.main}>
          <DashboardTopBar />
          <main id="dashboard-main" className={styles.content} tabIndex={-1}>
            <SubscriptionStatusBanner />
            <SubscriptionFeatureGate>{children}</SubscriptionFeatureGate>
          </main>
        </div>
        <DashboardBottomNav />
        <GlobalQuickAppointment />
      </div>
    </SubscriptionPlanProvider>
  );
}

/** Alt menüdeki "+" ve komut merkezinden açılan, her sayfada çalışan hızlı randevu penceresi. */
function GlobalQuickAppointment() {
  const { businessId } = useBusinessContext();
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState<Date | undefined>();

  useEffect(() => {
    const onOpen = (event: Event) => {
      const millis = (event as CustomEvent<{ startAt?: number }>).detail?.startAt;
      setStartAt(typeof millis === "number" ? new Date(millis) : undefined);
      setOpen(true);
    };
    window.addEventListener(NEW_APPOINTMENT_EVENT, onOpen);
    return () => window.removeEventListener(NEW_APPOINTMENT_EVENT, onOpen);
  }, []);

  // Herkese açık sayfalardaki işletme yardımcısından "Yeni randevu": /dashboard?yeniRandevu=1
  useEffect(() => {
    if (!businessId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("yeniRandevu") !== "1") return;
    url.searchParams.delete("yeniRandevu");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    openQuickAppointment();
  }, [businessId]);

  if (!businessId) return null;
  return (
    <QuickAppointmentModal
      businessId={businessId}
      open={open}
      initialStartAt={startAt}
      onClose={() => setOpen(false)}
      onCreated={notifyAppointmentsChanged}
    />
  );
}
