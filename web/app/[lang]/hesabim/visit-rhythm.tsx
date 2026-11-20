"use client";

import { useMemo, type CSSProperties } from "react";
import Link from "@/i18n/link";
import { CalendarPlus, Repeat2 } from "lucide-react";
import { useIntlLocale, useT } from "@/i18n/client";
import { visitRhythm, type RhythmAppointment, type RhythmSuggestion } from "@/features/appointments/moments-domain";
import styles from "./visit-rhythm.module.css";

function bookHref(item: RhythmSuggestion) {
  const params = new URLSearchParams({ service: item.serviceId });
  if (item.staffId) params.set("staff", item.staffId);
  return `/isletme/${item.businessSlug}/randevu?${params}`;
}

/**
 * Kişisel ritim: aynı hizmeti düzenli alan müşteriye "bir sonraki zaman" tahmini ve tek dokunuşla aynı randevu.
 * Tamamen cihazda hesaplanır (müşterinin kendi geçmişi); öneri yoksa hiç görünmez.
 */
export function VisitRhythm({ appointments, now }: { appointments: RhythmAppointment[]; now: number }) {
  const t = useT();
  const locale = useIntlLocale();
  const items = useMemo(() => visitRhythm(appointments, now, 3), [appointments, now]);
  if (!items.length) return null;

  const when = (item: RhythmSuggestion) => {
    if (item.daysUntil < 0) return t("{count} gün gecikti", { count: -item.daysUntil });
    if (item.daysUntil === 0) return t("Tam zamanı");
    if (item.daysUntil === 1) return t("Yarın zamanı");
    return t("{count} gün sonra", { count: item.daysUntil });
  };

  return (
    <section className={styles.wrap} aria-labelledby="rhythm-title">
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true"><Repeat2 size={18} /></span>
        <div><small>{t("KİŞİSEL RİTMİN")}</small><h3 id="rhythm-title">{t("Bir sonraki zamanını biz hatırladık")}</h3></div>
      </div>
      <div className={styles.list}>
        {items.map((item, index) => {
          const cycle = Math.min(1, Math.max(0, 1 - item.daysUntil / item.everyDays));
          const due = item.daysUntil <= 3;
          return (
            <article key={item.key} className={`${styles.item} ${due ? styles.itemDue : ""}`} style={{ "--i": index, "--p": cycle } as CSSProperties}>
              <span className={styles.ring} aria-hidden="true"><i /></span>
              <div className={styles.body}>
                <b>{item.serviceName}</b>
                <span>{item.businessName}</span>
                <small>{t("Genelde {count} günde bir · tahmini {date}", { count: item.everyDays, date: new Date(item.dueAt).toLocaleDateString(locale, { day: "numeric", month: "long" }) })}</small>
              </div>
              <div className={styles.side}>
                <em className={due ? styles.whenDue : ""}>{when(item)}</em>
                <Link href={bookHref(item)} className={styles.book}><CalendarPlus size={15} aria-hidden="true" /> {t("Aynısını ayarla")}</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
