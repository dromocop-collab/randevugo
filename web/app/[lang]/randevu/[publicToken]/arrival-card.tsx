"use client";

import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Car, Clock3, Hourglass, LoaderCircle, Navigation, Undo2 } from "lucide-react";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import { appointmentChangeError } from "@/features/appointments/appointment-change";
import { reportAppointmentArrival } from "@/features/appointments/moments-repository";
import { CUSTOMER_DELAY_OPTIONS, expectedStartMs, type ArrivalState, type BusinessDelayState } from "@/features/appointments/moments-domain";
import styles from "./arrival.module.css";

function clock(ms: number, locale: string) {
  return new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** İşletme gecikme bildirdiyse biletin üstünde sakin bir şerit. */
export function BusinessDelayBanner({ delay, startMs }: { delay: BusinessDelayState; startMs: number }) {
  const t = useT();
  const locale = useIntlLocale();
  return (
    <div className={styles.delay} role="status">
      <i aria-hidden="true"><Hourglass size={18} /></i>
      <span>
        <b>{t("İşletme yaklaşık {count} dk gecikmeli", { count: delay.minutes })}</b>
        <small>{t("Tahmini başlangıç {time}. Acele etmene gerek yok.", { time: clock(expectedStartMs(startMs, delay), locale) })}</small>
      </span>
    </div>
  );
}

/**
 * "Yoldayım / Gecikeceğim" kartı: randevudan 3 saat önce açılır, başladıktan 30 dk sonra kapanır.
 * Bildirim anında işletmenin telefonuna gider; telefonla aramaya gerek kalmaz.
 */
export function ArrivalCard({ publicToken, phase, arrival, updatesLeft, startMs, onChanged }: {
  publicToken: string;
  phase: "soon" | "open";
  arrival: ArrivalState | null;
  updatesLeft: number;
  startMs: number;
  onChanged: () => void;
}) {
  const t = useT();
  const locale = useIntlLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const locked = phase !== "open" || updatesLeft <= 0;

  async function send(status: "on_the_way" | "late" | "clear", delayMinutes?: number) {
    if (busy || locked) return;
    const key = status === "late" ? `late-${delayMinutes}` : status;
    setBusy(key);
    try {
      await reportAppointmentArrival({ publicToken, status, ...(delayMinutes ? { delayMinutes } : {}) });
      toast.success(status === "clear" ? t("Varış bildirimin geri alındı.") : status === "late" ? t("İşletmeye {count} dk gecikeceğin iletildi.", { count: delayMinutes ?? 0 }) : t("İşletmeye yolda olduğun iletildi."));
      onChanged();
    } catch (error) {
      toast.error(t(appointmentChangeError(error, tk("Bildirim gönderilemedi. Lütfen yeniden deneyin."))));
    } finally {
      setBusy(null);
    }
  }

  const current = arrival
    ? arrival.status === "late"
      ? t("~{count} dk gecikeceğini bildirdin · tahmini varış {time}", { count: arrival.delayMinutes, time: clock(startMs + arrival.delayMinutes * 60_000, locale) })
      : t("Yolda olduğunu bildirdin")
    : null;

  return (
    <section className={styles.card} style={{ "--i": 0 } as CSSProperties} aria-labelledby="arrival-title">
      <div className={styles.head}>
        <i aria-hidden="true"><Navigation size={20} /></i>
        <div><small>{t("VARIŞ DURUMU")}</small><h2 id="arrival-title">{t("İşletmeye tek dokunuşla haber ver")}</h2></div>
        {phase === "open" && <span className={styles.live} aria-hidden="true"><em />{t("Canlı")}</span>}
      </div>
      {phase === "soon"
        ? <p className={styles.hint}><Clock3 size={14} aria-hidden="true" /> {t("Randevuna 3 saat kala buradan \"Yoldayım\" ya da \"Gecikeceğim\" diyebilirsin; işletme anında görür.")}</p>
        : <>
          {current && <p className={`${styles.current} ${arrival?.status === "late" ? styles.currentLate : ""}`} role="status"><Car size={15} aria-hidden="true" /> {current}</p>}
          <button type="button" className={`${styles.primary} ${arrival?.status === "on_the_way" ? styles.primaryOn : ""}`} onClick={() => void send("on_the_way")} disabled={locked || Boolean(busy)} aria-pressed={arrival?.status === "on_the_way"}>
            {busy === "on_the_way" ? <LoaderCircle size={18} className={styles.spin} aria-hidden="true" /> : <Car size={18} aria-hidden="true" />} {t("Yoldayım")}
          </button>
          <div className={styles.lateLabel}>{t("Gecikeceğim")}</div>
          <div className={styles.chips} role="group" aria-label={t("Gecikme süresi")}>
            {CUSTOMER_DELAY_OPTIONS.map((minutes) => {
              const on = arrival?.status === "late" && arrival.delayMinutes === minutes;
              return (
                <button key={minutes} type="button" className={`${styles.chip} ${on ? styles.chipOn : ""}`} onClick={() => void send("late", minutes)} disabled={locked || Boolean(busy)} aria-pressed={on}>
                  {busy === `late-${minutes}` ? <LoaderCircle size={14} className={styles.spin} aria-hidden="true" /> : null}{t("{count} dk", { count: minutes })}
                </button>
              );
            })}
          </div>
          <div className={styles.foot}>
            <span>{updatesLeft > 0 ? t("{count} bildirim hakkın kaldı", { count: updatesLeft }) : t("Bildirim hakkın doldu; gerekirse işletmeyi ara.")}</span>
            {arrival && updatesLeft > 0 && <button type="button" className={styles.undo} onClick={() => void send("clear")} disabled={Boolean(busy)}><Undo2 size={14} aria-hidden="true" /> {t("Geri al")}</button>}
          </div>
        </>}
    </section>
  );
}
