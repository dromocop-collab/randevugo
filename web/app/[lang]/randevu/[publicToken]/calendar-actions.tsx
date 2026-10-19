"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { BellRing, ChevronRight, Download, LoaderCircle, Share2 } from "lucide-react";
import {
  addToDeviceCalendar,
  detectCalendarPlatform,
  googleCalendarUrl,
  outlookCalendarUrl,
  supportsAppleWallet,
  type CalendarEventInput,
  type CalendarPlatform,
} from "@/lib/calendar/appointment-calendar";
import styles from "./calendar-actions.module.css";

type Props = { event: CalendarEventInput; publicToken: string; appleWalletEnabled: boolean };

const COPY: Record<CalendarPlatform, { title: string; hint: string }> = {
  apple: { title: "Apple Takvim'e ekle", hint: "Tek dokunuş · 1 gün ve 1 saat önce hatırlatır" },
  android: { title: "Telefon takvimine ekle", hint: "Google / Samsung Takvim · hatırlatmalı" },
  desktop: { title: "Takvime ekle", hint: "Apple, Outlook ve diğer takvimler (.ics)" },
};

/** Cihaza göre doğru takvim + Apple Cüzdan kartı. */
export function CalendarActions({ event, publicToken, appleWalletEnabled }: Props) {
  // Bu bileşen yalnızca istemcide (veri yüklendikten sonra) çizilir; cihaz tespiti ilk render'da güvenli.
  const [platform] = useState<CalendarPlatform>(() => detectCalendarPlatform());
  const [walletDevice] = useState(() => supportsAppleWallet());
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const [walletBusy, setWalletBusy] = useState(false);
  const walletReady = appleWalletEnabled && walletDevice;

  const base = `/api/randevu/${encodeURIComponent(publicToken)}`;
  const fileName = `randevu-${event.start.toISOString().slice(0, 10)}.ics`;
  const copy = COPY[platform];
  const day = format(event.start, "d");
  const weekday = format(event.start, "EEEE", { locale: tr });

  function addToCalendar() {
    if (addToDeviceCalendar(event, { publicToken, fileName }) === "download") {
      toast.success("Takvim dosyası indirildi. Açınca randevu takviminize eklenir.");
    }
  }

  async function addToWallet() {
    if (walletBusy) return;
    setWalletBusy(true);
    const url = new URL(`${base}/cuzdan.pkpass`, window.location.origin).href;
    try {
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(await response.text().catch(() => ""));
      window.location.assign(url);
    } catch (reason) {
      const message = reason instanceof Error && reason.message && reason.message.length < 120 ? reason.message : "";
      toast.error(message || "Cüzdan kartı şu anda hazırlanamadı. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      window.setTimeout(() => setWalletBusy(false), 1200);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: event.title, text: `${event.title} · ${format(event.start, "d MMMM EEEE HH:mm", { locale: tr })}`, url: event.url });
    } catch { /* kullanıcı vazgeçti */ }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.kicker}><BellRing size={13} /> TAKVİM VE CÜZDAN</span>
        {canShare && event.url && <button type="button" className={styles.share} onClick={share} aria-label="Randevuyu paylaş"><Share2 size={15} /></button>}
      </div>

      <button type="button" className={styles.hero} onClick={addToCalendar}>
        {platform === "desktop"
          ? <span className={`${styles.glyph} ${styles.glyphFile}`} aria-hidden="true"><Download size={22} /></span>
          : <span className={`${styles.glyph} ${platform === "apple" ? styles.glyphApple : styles.glyphAndroid}`} aria-hidden="true"><small>{weekday}</small><b>{day}</b></span>}
        <span className={styles.heroText}><b>{copy.title}</b><small>{copy.hint}</small></span>
        <ChevronRight size={20} className={styles.heroArrow} aria-hidden="true" />
      </button>

      <div className={styles.tiles}>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={styles.tile}>
          <span className={styles.gcal} aria-hidden="true"><i /><b>{day}</b></span>
          <span className={styles.tileText}><small>Takvim</small><b>Google</b></span>
        </a>
        {walletReady ? (
          <button type="button" onClick={addToWallet} className={`${styles.tile} ${styles.wallet}`} aria-busy={walletBusy}>
            <span className={styles.walletGlyph} aria-hidden="true">{walletBusy ? <LoaderCircle size={18} className={styles.spin} /> : <><i /><i /><i /><i /></>}</span>
            <span className={styles.tileText}><small>Apple</small><b>Cüzdan</b></span>
          </button>
        ) : (
          <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={styles.tile}>
            <span className={styles.outlook} aria-hidden="true">O</span>
            <span className={styles.tileText}><small>Takvim</small><b>Outlook</b></span>
            </a>
        )}
      </div>
    </div>
  );
}
