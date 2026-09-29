"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";
import type { PlatformAnalyticsSettings } from "@/types/platform";

const CONSENT_KEY = "seninrandevun-cookie-consent-v1";
const LEGACY_CONSENT_KEY = "seninrandevun-analytics-consent";
const DEFAULT_GA_ID = "G-REDQN2FVRD";
const DEFAULT_GTM_ID = "GTM-KH38NV3L";

interface CookiePreferences {
  version: 1;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

function readPreferences(): CookiePreferences | null {
  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<CookiePreferences>;
      if (parsed.version === 1 && typeof parsed.analytics === "boolean" && typeof parsed.marketing === "boolean") {
        return { version: 1, analytics: parsed.analytics, marketing: parsed.marketing, updatedAt: parsed.updatedAt ?? new Date().toISOString() };
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_CONSENT_KEY);
    if (legacy === "accepted" || legacy === "rejected") {
      return { version: 1, analytics: legacy === "accepted", marketing: legacy === "accepted", updatedAt: new Date().toISOString() };
    }
  } catch { /* Malformed browser preferences are treated as no consent. */ }
  return null;
}

export function AnalyticsScripts() {
  const [analytics, setAnalytics] = useState<PlatformAnalyticsSettings | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    const saved = readPreferences();
    queueMicrotask(() => {
      setPreferences(saved);
      setDraft({ analytics: saved?.analytics ?? false, marketing: saved?.marketing ?? false });
      setDialogOpen(!saved);
    });
    getPlatformSettings()
      .then((settings) => setAnalytics(settings.analytics))
      .catch(() => setAnalytics(null));
    const openPreferences = () => {
      const current = readPreferences();
      setDraft({ analytics: current?.analytics ?? false, marketing: current?.marketing ?? false });
      setEditing(true);
      setDialogOpen(true);
    };
    window.addEventListener("seninrandevun:cookie-preferences", openPreferences);
    return () => window.removeEventListener("seninrandevun:cookie-preferences", openPreferences);
  }, []);

  function save(next: Pick<CookiePreferences, "analytics" | "marketing">) {
    const value: CookiePreferences = { version: 1, ...next, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    window.localStorage.removeItem(LEGACY_CONSENT_KEY);
    setPreferences(value);
    setDraft(next);
    setDialogOpen(false);
    setEditing(false);
  }

  const gaId = analytics?.googleAnalyticsId || DEFAULT_GA_ID;
  const gtmId = analytics?.googleTagManagerId || DEFAULT_GTM_ID;

  return (
    <>
      {preferences?.analytics && gaId && <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />}
      {preferences?.analytics && gaId && <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}</Script>}
      {preferences?.analytics && gtmId && <Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>}
      {preferences?.marketing && analytics?.facebookPixelId && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${analytics.facebookPixelId}');
            fbq('track', 'PageView');`}
        </Script>
      )}
      {dialogOpen && <aside className={`cookie-consent ${editing ? "is-editing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
        <div className="cookie-consent__copy"><strong id="cookie-title">Çerez tercihleri senin kontrolünde.</strong><p>Zorunlu çerezler hizmeti çalıştırır. Analitik ve pazarlama çerezleri yalnızca seçiminle etkinleşir.</p><Link href="/cerez-politikasi">Çerez politikasını incele</Link></div>
        {editing && <div className="cookie-preferences">
          <label><span><b>Zorunlu</b><small>Güvenli giriş, tercih ve temel işlevler</small></span><input type="checkbox" checked disabled aria-label="Zorunlu çerezler her zaman etkin" /></label>
          <label><span><b>Analitik</b><small>Anonim kullanım ve performans ölçümü</small></span><input type="checkbox" checked={draft.analytics} onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))} /></label>
          <label><span><b>Pazarlama</b><small>Kampanya performansı ve ilgili içerikler</small></span><input type="checkbox" checked={draft.marketing} onChange={(event) => setDraft((current) => ({ ...current, marketing: event.target.checked }))} /></label>
        </div>}
        <div className="cookie-consent__actions"><button type="button" onClick={() => save({ analytics: false, marketing: false })}>Tümünü reddet</button>{editing ? <button type="button" onClick={() => save(draft)}>Tercihleri kaydet</button> : <button type="button" onClick={() => setEditing(true)}>Tercihleri yönet</button>}<button type="button" onClick={() => save({ analytics: true, marketing: true })}>Tümünü kabul et</button></div>
      </aside>}
    </>
  );
}
