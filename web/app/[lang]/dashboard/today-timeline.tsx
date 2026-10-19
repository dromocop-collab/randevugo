"use client";

import Link from "@/i18n/link";
import { StatusPill } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import { useIntlLocale, useT } from "@/i18n/client";
import type { Appointment } from "@/types/appointments";
import styles from "./home.module.css";

const ACTIVE = new Set(["pending", "confirmed", "completed"]);
function timeOf(value: string, locale: string) { return new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }); }

/** Bugün ekranındaki zaman akışı: geçmiş soluk, sıradaki vurgulu, devam eden canlı; "Şimdi" çizgisi. */
export function TodayTimeline({ items, now }: { items: Appointment[]; now: number }) {
  const t = useT();
  const locale = useIntlLocale();
  const nextIndex = items.findIndex((item) => ["pending", "confirmed"].includes(item.status) && new Date(item.endAt || item.startAt).getTime() > now);
  const nowIndex = items.findIndex((item) => new Date(item.startAt).getTime() > now);
  return (
    <ol className={styles.timeline}>
      {items.map((item, index) => {
        const start = new Date(item.startAt).getTime();
        const end = new Date(item.endAt || item.startAt).getTime();
        const inProgress = start <= now && end > now && ACTIVE.has(item.status) && item.status !== "completed";
        const past = end <= now;
        const services = [item.serviceName, ...(item.additionalServices ?? []).map((service) => service.name)].filter(Boolean).join(" + ");
        return (
          <li key={item.id} className={cn(styles.tlItem, past && styles.tlPast, index === nextIndex && styles.tlNext, inProgress && styles.tlLive, item.status === "cancelled" && styles.tlCancelled)}>
            {index === nowIndex && nowIndex > 0 && <span className={styles.nowLine} aria-label={t("Şimdi")}><i>{t("Şimdi")}</i></span>}
            <Link href={`/dashboard/randevular?appointment=${encodeURIComponent(item.id)}`} className={styles.tlLink}>
              <time className={styles.tlTime}><b>{timeOf(item.startAt, locale)}</b>{item.endAt && <small>{timeOf(item.endAt, locale)}</small>}</time>
              <span className={styles.tlRail} aria-hidden><i /></span>
              <span className={styles.tlBody}>
                <b>{item.customerName}</b>
                <small>{services || t("Hizmet")}{item.staffName ? ` · ${item.staffName}` : ""}</small>
              </span>
              <span className={styles.tlStatus}>
                {inProgress ? <span className={styles.liveTag}>{t("Şu an")}</span> : index === nextIndex ? <span className={styles.nextTag}>{t("Sıradaki")}</span> : null}
                <StatusPill status={item.status} size="sm" />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
