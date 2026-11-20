"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "@/i18n/link";
import { ArrowRight, Leaf, Flame, Activity } from "lucide-react";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import type { DaySchedule } from "@/types/business";
import { busyHighlights, busyLevel, gridHourRange, openHoursOf, type BusyWindow } from "@/features/appointments/moments-domain";
import { getBusinessBusyHours, type BusyHoursResult } from "@/features/appointments/moments-repository";
import { DAY_NAMES, WEEK_ORDER } from "./utils";
import styles from "./busy-hours.module.css";

const SHORT_DAYS = [tk("Paz"), tk("Pzt"), tk("Sal"), tk("Çar"), tk("Per"), tk("Cum"), tk("Cmt")];

function hh(hour: number) { return `${String(hour).padStart(2, "0")}:00`; }

/**
 * "Ne zaman gelsem?" — son 8 haftanın randevu yoğunluğu (göreli, ham sayı yok).
 * Ekrana yaklaşınca yüklenir; yeterli veri yoksa hiç görünmez.
 */
export function BusyHoursSection({ businessId, workingHours, today, nowHour, bookingHref }: {
  businessId: string; workingHours: DaySchedule[]; today: number | null; nowHour: number | null; bookingHref: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<BusyHoursResult | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !businessId) return;
    let cancelled = false;
    const load = () => { getBusinessBusyHours(businessId).then((result) => { if (!cancelled) setData(result); }).catch(() => undefined); };
    if (typeof IntersectionObserver === "undefined") { load(); return () => { cancelled = true; }; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, [businessId]);

  const range = useMemo(() => gridHourRange(workingHours), [workingHours]);
  const highlights = useMemo(() => (data?.enough ? busyHighlights(data.grid, workingHours, 3) : { calm: [], peak: null }), [data, workingHours]);
  const ready = Boolean(data?.enough && range && highlights.calm.length);

  const label = (window: BusyWindow) => `${t(DAY_NAMES[window.day])} ${hh(window.startHour)}–${hh(window.endHour)}`;
  const hours = range ? Array.from({ length: range[1] - range[0] }, (_, index) => range[0] + index) : [];

  return (
    <div ref={ref} className={styles.anchor}>
      {ready && data && range && (
        <article className={styles.card} aria-labelledby="busy-title">
          <header className={styles.head}>
            <span className={styles.icon} aria-hidden="true"><Activity size={18} /></span>
            <div>
              <h3 id="busy-title">{t("Ne zaman gelsem?")}</h3>
              <p>{t("Son {weeks} haftanın randevu yoğunluğuna göre sakin ve yoğun saatler.", { weeks: data.weeks })}</p>
            </div>
          </header>

          <div className={styles.tips}>
            {highlights.calm.map((window, index) => (
              <span key={`${window.day}-${window.startHour}`} className={`${styles.tip} ${index === 0 ? styles.tipBest : ""}`}>
                <Leaf size={14} aria-hidden="true" />
                <span><small>{index === 0 ? t("EN SAKİN") : t("SAKİN")}</small><b>{label(window)}</b></span>
              </span>
            ))}
            {highlights.peak && (
              <span className={`${styles.tip} ${styles.tipPeak}`}>
                <Flame size={14} aria-hidden="true" />
                <span><small>{t("EN YOĞUN")}</small><b>{label(highlights.peak)}</b></span>
              </span>
            )}
          </div>

          <div className={styles.heat} role="table" aria-label={t("Gün ve saate göre yoğunluk")} style={{ "--cols": hours.length } as CSSProperties}>
            <div className={styles.row} role="row">
              <span className={styles.dayCell} role="columnheader" />
              {hours.map((hour) => <span key={hour} className={styles.hourHead} role="columnheader">{hour % 2 === 0 ? String(hour).padStart(2, "0") : ""}</span>)}
            </div>
            {WEEK_ORDER.map((day) => {
              const schedule = workingHours.find((item) => item.day === day);
              const open = new Set(openHoursOf(schedule));
              const isToday = today === day;
              return (
                <div key={day} className={`${styles.row} ${isToday ? styles.rowToday : ""}`} role="row">
                  <span className={styles.dayCell} role="rowheader">{t(SHORT_DAYS[day])}</span>
                  {hours.map((hour) => {
                    if (!open.has(hour)) return <span key={hour} className={styles.closed} role="cell" aria-label={t("{day} {time}: kapalı", { day: t(DAY_NAMES[day]), time: hh(hour) })} />;
                    const value = data.grid[day]?.[hour] ?? 0;
                    const level = busyLevel(value);
                    const word = [t("Çok sakin"), t("Sakin"), t("Orta"), t("Yoğun"), t("Çok yoğun")][level];
                    return (
                      <span key={hour} role="cell" data-level={level}
                        className={`${styles.cell} ${isToday && nowHour === hour ? styles.cellNow : ""}`}
                        title={`${t(DAY_NAMES[day])} ${hh(hour)} · ${word}`} aria-label={`${t(DAY_NAMES[day])} ${hh(hour)}: ${word}`} />
                    );
                  })}
                </div>
              );
            })}
          </div>

          <footer className={styles.foot}>
            <span className={styles.legend} aria-hidden="true">
              {t("Sakin")} {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)} {t("Yoğun")}
            </span>
            <Link href={bookingHref} className={styles.cta}>{t("Sakin bir saate randevu al")} <ArrowRight size={15} aria-hidden="true" /></Link>
          </footer>
        </article>
      )}
    </div>
  );
}
