"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";
import type { PlatformAnalyticsSettings } from "@/types/platform";

export function AnalyticsScripts() {
  const [analytics, setAnalytics] = useState<PlatformAnalyticsSettings | null>(null);

  useEffect(() => {
    getPlatformSettings()
      .then((settings) => setAnalytics(settings.analytics))
      .catch(() => setAnalytics(null));
  }, []);

  if (!analytics) return null;

  return (
    <>
      {analytics.googleAnalyticsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${analytics.googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${analytics.googleAnalyticsId}');`}
          </Script>
        </>
      )}
      {analytics.googleTagManagerId && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${analytics.googleTagManagerId}');`}
        </Script>
      )}
      {analytics.facebookPixelId && (
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
    </>
  );
}
