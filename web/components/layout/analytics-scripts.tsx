"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";
import type { PlatformAnalyticsSettings } from "@/types/platform";

const CONSENT_KEY = "seninrandevun-analytics-consent";
const DEFAULT_GA_ID = "G-REDQN2FVRD";
const DEFAULT_GTM_ID = "GTM-KH38NV3L";

export function AnalyticsScripts() {
  const [analytics, setAnalytics] = useState<PlatformAnalyticsSettings | null>(null);
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "accepted" || saved === "rejected") queueMicrotask(() => setConsent(saved));
    getPlatformSettings()
      .then((settings) => setAnalytics(settings.analytics))
      .catch(() => setAnalytics(null));
  }, []);

  function choose(next: "accepted" | "rejected") {
    window.localStorage.setItem(CONSENT_KEY, next);
    setConsent(next);
  }

  const gaId = analytics?.googleAnalyticsId || DEFAULT_GA_ID;
  const gtmId = analytics?.googleTagManagerId || DEFAULT_GTM_ID;

  return (
    <>
      {consent === "accepted" && gaId && <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />}
      {consent === "accepted" && gaId && <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}</Script>}
      {consent === "accepted" && gtmId && <Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>}
      {consent === "accepted" && analytics?.facebookPixelId && (
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
      {consent === null && <aside className="cookie-consent" role="dialog" aria-live="polite" aria-label="Çerez tercihleri"><div><strong>Gizliliğin senin kontrolünde.</strong><p>Zorunlu çerezler hizmeti çalıştırır. İzin verirsen anonim kullanım verileriyle deneyimi geliştiririz.</p><Link href="/cerez-politikasi">Çerez politikasını incele</Link></div><div><button type="button" onClick={() => choose("rejected")}>Yalnızca zorunlu</button><button type="button" onClick={() => choose("accepted")}>Kabul et</button></div></aside>}
    </>
  );
}
