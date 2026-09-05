"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPageView, type AnalyticsDevice } from "@/features/analytics/platform-analytics-repository";

const PRIVATE_PREFIXES = ["/dashboard", "/super-admin", "/admin", "/onboarding", "/hesabim", "/randevu"];

function sessionId() {
  const key = "sr_analytics_session";
  const current = sessionStorage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID();
  sessionStorage.setItem(key, next);
  return next;
}

function deviceType(): AnalyticsDevice {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (/bot|crawler|spider|crawling/i.test(navigator.userAgent)) return;

    const send = () => void recordPageView({
      path: pathname.slice(0, 180),
      title: document.title.slice(0, 180),
      referrer: document.referrer ? new URL(document.referrer).hostname.slice(0, 120) : "direct",
      device: deviceType(),
      sessionId: sessionId(),
    }).catch(() => undefined);

    const timer = window.setTimeout(send, 900);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
