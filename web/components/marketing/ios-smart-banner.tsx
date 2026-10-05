"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Apple, ArrowUpRight, X } from "lucide-react";
import { APP_STORE_URL } from "@/lib/app-store";

const HIDDEN_KEY = "sr_ios_banner_hidden_until";
// Sabit alt çubuğu olan (randevu al, sihirbaz) ve odak gerektiren sayfalarda banner gösterilmez.
const PRIVATE_ROUTES = ["/dashboard", "/super-admin", "/admin", "/onboarding", "/isletme", "/randevu", "/giris", "/kayit", "/sifremi-unuttum", "/siram"];

function isAppleMobile() {
  const classic = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const modernIpad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classic || modernIpad;
}

// iOS Safari zaten Apple'ın yerel Smart App Banner'ını (layout'taki apple-itunes-app) gösterir; ikinci banner gereksiz.
function isMobileSafari() {
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV/i.test(ua);
}

export function IosSmartBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hiddenOnRoute = PRIVATE_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (hiddenOnRoute || !isAppleMobile() || isMobileSafari()) return;
    let hiddenUntil = 0;
    try { hiddenUntil = Number(window.localStorage.getItem(HIDDEN_KEY) ?? 0); } catch { /* depolama kapalı olabilir */ }
    if (hiddenUntil > Date.now()) return;
    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [hiddenOnRoute, pathname]);

  function dismiss() {
    try { window.localStorage.setItem(HIDDEN_KEY, String(Date.now() + 7 * 86_400_000)); } catch { /* depolama kapalı olabilir */ }
    setVisible(false);
  }

  if (hiddenOnRoute || !visible) return null;

  return <aside className="ios-smart-banner" aria-label="SeninRandevun iOS uygulamasını indir">
    <span className="ios-smart-banner-shine"/>
    <button type="button" onClick={dismiss} aria-label="Uygulama önerisini kapat"><X size={15}/></button>
    <Image src="/icon-192.png" width={52} height={52} alt="SeninRandevun uygulama ikonu"/>
    <div><small><Apple size={10} fill="currentColor"/> APP STORE&apos;DA</small><b>SeninRandevun</b><span>Randevun artık cebinde</span></div>
    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">İndir <ArrowUpRight size={13}/></a>
  </aside>;
}
