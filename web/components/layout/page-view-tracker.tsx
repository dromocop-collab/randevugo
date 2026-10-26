"use client";

import { useEffect, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { usePathname as useNextPathname } from "next/navigation";
import { getFirebaseApp } from "@/lib/firebase/client";
import { recordPageView, type AnalyticsDevice } from "@/features/analytics/platform-analytics-repository";

// Ziyaret sayımı sunucuda yapılır (functions trackVisit): aynı cihaz + IP tek ziyaretçi, aynı sayfa 30 dk'da bir,
// yöneticiler / botlar / otomasyon hariç. IP ve çerez tutulmaz. Görünür sekmede dakikada bir "canlı" sinyali gider.
// Sunucu fonksiyonu yoksa (henüz yayınlanmadıysa) eski istemci kaydına düşer.

const PRIVATE_PREFIXES = ["/dashboard", "/super-admin", "/admin", "/onboarding", "/hesabim", "/randevu"];

function stripLocale(path: string) {
  return path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
}

function sessionId() {
  const key = "sr_analytics_session";
  try {
    const current = sessionStorage.getItem(key);
    if (current) return current;
    const next = crypto.randomUUID();
    sessionStorage.setItem(key, next);
    return next;
  } catch { return "no-storage"; }
}

function deviceType(): AnalyticsDevice {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

function externalReferrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : null;
  } catch { return null; }
}

const track = () => httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), "trackVisit");

/** Otomasyon tarayıcıları (testler, botlar) ve demo/test Firebase projeleri hiç sayılmaz; istek de gönderilmez. */
function trackingDisabled() {
  if (navigator.webdriver) return true;
  return String(getFirebaseApp().options.projectId ?? "").startsWith("demo-");
}

export function PageViewTracker() {
  const fullPath = useNextPathname() ?? "/";
  const firstView = useRef(true);

  useEffect(() => {
    const path = stripLocale(fullPath);
    if (PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix))) return;
    if (/bot|crawler|spider|crawling|headless/i.test(navigator.userAgent) || trackingDisabled()) return;
    const params = new URLSearchParams(window.location.search);
    // Yönlendiren ve utm yalnız sayfanın ilk açılışında anlamlı; site içi geçişlerde gönderilmez.
    const isFirst = firstView.current;
    firstView.current = false;
    const payload = {
      type: "view", path: fullPath, width: window.innerWidth, webdriver: navigator.webdriver === true,
      referrer: isFirst ? externalReferrerHost() : null,
      utmSource: isFirst ? params.get("utm_source") : null, utmMedium: isFirst ? params.get("utm_medium") : null,
      utmCampaign: isFirst ? params.get("utm_campaign") : null,
    };
    const timer = window.setTimeout(() => {
      track()(payload).catch(() => recordPageView({
        path: path.slice(0, 180), title: document.title.slice(0, 180),
        referrer: externalReferrerHost() ?? "direct", device: deviceType(), sessionId: sessionId(),
      }).catch(() => undefined));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [fullPath]);

  // Canlı ziyaretçi sinyali: yalnız sekme görünürken, dakikada bir.
  useEffect(() => {
    const path = stripLocale(fullPath);
    if (PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix)) || trackingDisabled()) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      track()({ type: "ping", path: fullPath }).catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [fullPath]);

  return null;
}
