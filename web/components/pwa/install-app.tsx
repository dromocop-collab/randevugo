"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import styles from "./install-app.module.css";

type PwaApp = "isletme" | "yonetim";

const COPY: Record<PwaApp, { name: string; text: string }> = {
  isletme: { name: "SR İşletme", // i18n-ignore (uygulama adı)
    text: tk("Paneli uygulama gibi tam ekran açın; yeni randevu bildirimleri telefonunuza gelsin.") },
  yonetim: { name: "SR Yönetim", // i18n-ignore (uygulama adı)
    text: tk("Yönetim panelini uygulama gibi açın; uyarı ve ödeme bildirimlerini kaçırmayın.") },
};

const SW_SCOPE: Record<PwaApp, string> = { isletme: "/dashboard", yonetim: "/super-admin" };
const DISMISS_KEY = (app: PwaApp) => `sr.pwa.dismissed.${app}`;
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function dismissedRecently(app: PwaApp) {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY(app)) ?? 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch { return false; }
}

/**
 * PWA kurulum kartı + çevrimdışı service worker kaydı (app-sw.js, yalnız bu bölümün kapsamında).
 * Uygulama içinde (standalone) açıldıysa veya kısa süre önce kapatıldıysa hiçbir şey göstermez.
 */
export function InstallAppPrompt({ app }: { app: PwaApp }) {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/app-sw.js", { scope: SW_SCOPE[app] }).catch(() => undefined);
    }
    if (isStandalone() || dismissedRecently(app)) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIosSafari()) queueMicrotask(() => setMode("ios"));
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [app]);

  if (mode === "hidden") return null;
  const copy = COPY[app];

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY(app), String(Date.now())); } catch { /* depolama kapalıysa yalnız bu oturumda gizlenir */ }
    setMode("hidden");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    setDeferred(null);
    if (choice?.outcome === "accepted") setMode("hidden");
  }

  return (
    <aside className={styles.card} aria-label={t("{name} uygulamasını yükle", { name: copy.name })}>
      <Image src="/pwa/icon-192.png" alt="" width={44} height={44} className={styles.icon} />
      <div className={styles.text}>
        <b>{t("{name} uygulamasını yükleyin", { name: copy.name })}</b>
        <span>{t(copy.text)}</span>
        {mode === "ios" && iosHelp ? (
          <ol className={styles.steps}>
            <li>{t("Safari'de alttaki Paylaş düğmesine dokunun.")} <Share size={14} aria-label={t("Paylaş")} /></li>
            <li><SquarePlus size={14} aria-hidden /> {t("Ana Ekrana Ekle'yi seçin, sonra Ekle'ye dokunun.")}</li>
            <li>{t("Ana ekrandaki {name} simgesinden açıp bildirimlere izin verin (iPhone'da web bildirimleri yalnız bu şekilde çalışır).", { name: copy.name })}</li>
          </ol>
        ) : null}
      </div>
      <div className={styles.actions}>
        {mode === "prompt"
          ? <button type="button" className={styles.primary} onClick={() => void install()}><Download size={15} aria-hidden /> {t("Yükle")}</button>
          : !iosHelp ? <button type="button" className={styles.primary} onClick={() => setIosHelp(true)}><SquarePlus size={15} aria-hidden /> {t("Nasıl?")}</button> : null}
        <button type="button" className={styles.close} onClick={dismiss} aria-label={t("Şimdi değil")}><X size={16} aria-hidden /></button>
      </div>
    </aside>
  );
}
