"use client";

import Link from "@/i18n/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarClock, Clock3, Ticket, Zap } from "lucide-react";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { listLastMinuteOpenings, type LastMinuteOpening } from "@/features/availability/availability-repository";
import { useIntlLocale, useT } from "@/i18n/client";
import type { TFunction } from "@/i18n/config";
import styles from "./home.module.css";

type LiveState = { lastMinute: boolean; liveQueue: boolean };

function openingHref(opening: LastMinuteOpening) {
  const params = new URLSearchParams({ service: opening.serviceId, date: opening.dateKey, start: String(opening.startAtMillis) });
  if (opening.staffId) params.set("staff", opening.staffId);
  return `/isletme/${encodeURIComponent(opening.businessSlug)}/randevu?${params}`;
}

function formatTime(opening: LastMinuteOpening, locale = "tr-TR") {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: opening.timeZone }).format(opening.startAtMillis);
}

function formatDay(opening: LastMinuteOpening, t: TFunction, locale = "tr-TR") {
  const fmt = (ms: number) => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: opening.timeZone }).format(ms);
  const day = fmt(opening.startAtMillis);
  if (day === fmt(Date.now())) return t("Bugün");
  if (day === fmt(Date.now() + 86_400_000)) return t("Yarın");
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: opening.timeZone }).format(opening.startAtMillis);
}

/**
 * "Şimdi müsait" bölümü: platformda canlı özellikler açıksa son dakika boşluklarını ve canlı sırayı gösterir.
 * Özellikler kapalıysa veya veri yoksa hiç çizilmez (boş vaat yok).
 */
export function HomeLiveNow() {
  const t = useT();
  const intlLocale = useIntlLocale();
  const [live, setLive] = useState<LiveState>({ lastMinute: false, liveQueue: false });
  const [openings, setOpenings] = useState<LastMinuteOpening[]>([]);

  useEffect(() => subscribeLiveFeatureAvailability((flags) => setLive({
    lastMinute: flags.isLastMinuteSlotsEnabled,
    liveQueue: flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled,
  })), []);

  useEffect(() => {
    if (!live.lastMinute) { queueMicrotask(() => setOpenings([])); return; }
    let active = true;
    listLastMinuteOpenings().then((rows) => { if (active) setOpenings(rows); }).catch(() => { if (active) setOpenings([]); });
    return () => { active = false; };
  }, [live.lastMinute]);

  if (openings.length === 0 && !live.liveQueue) return null;

  return <section className={`${styles.section} ${styles.liveSection}`} aria-labelledby="home-live-title">
    <div className={styles.wrap}>
      <div className={styles.livePanel} data-reveal="">
        <div className={styles.liveCopy}>
          <span className={styles.livePill}><i aria-hidden="true" /> {t("CANLI")}</span>
          <h2 id="home-live-title">{t("Şimdi müsait,")}<br /><em>{t("beklemeden git.")}</em></h2>
          <p>{openings.length > 0 ? t("İşletmelerin son dakika açılan saatleri. Boşluklar rezerve edilmez; son uygunluk randevu adımında kontrol edilir.") : t("Şu anda müşteri kabul eden işletmeleri gör, sıraya katıl ve sıranı telefonundan takip et.")}</p>
          <div className={styles.liveActions}>
            {live.liveQueue && <Link href="/simdi-musait" className={styles.btnLime}><Zap size={16} aria-hidden="true" /> {t("Açık işletmeler")}</Link>}
            {live.liveQueue && <Link href="/siram" className={styles.btnGhostLight}><Ticket size={16} aria-hidden="true" /> {t("Sıram")}</Link>}
          </div>
        </div>
        {openings.length > 0 ? <ul className={styles.openings}>
          {openings.slice(0, 4).map((opening) => <li key={opening.id}>
            <Link href={openingHref(opening)} className={styles.opening}>
              <span className={styles.openingTime}><small>{formatDay(opening, t, intlLocale)}</small><b>{formatTime(opening, intlLocale)}</b></span>
              <span className={styles.openingInfo}><strong>{opening.businessName}</strong><small>{opening.serviceName}{opening.staffName ? ` · ${opening.staffName}` : ""}</small></span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </li>)}
        </ul> : <div className={styles.liveIdle}>
          <span aria-hidden="true"><Clock3 size={22} /></span>
          <div><strong>{t("Canlı sıra açık")}</strong><small>{t("Sıraya katıl; çağrıldığında haber verelim.")}</small></div>
          <Link href="/simdi-musait" aria-label={t("Şimdi müsait işletmeleri gör")}><ArrowRight size={18} /></Link>
        </div>}
        <CalendarClock className={styles.liveDeco} size={180} aria-hidden="true" />
      </div>
    </div>
  </section>;
}
