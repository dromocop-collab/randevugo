"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Car, Hourglass, TimerReset } from "lucide-react";
import { Badge, Button, Callout, Switch } from "@/components/dashboard/ui";
import { notifyAppointmentsChanged } from "@/components/dashboard/dashboard-events";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { BUSINESS_DELAY_OPTIONS } from "@/features/appointments/moments-domain";
import { setAppointmentBusinessDelay } from "@/features/appointments/moments-repository";
import type { Appointment } from "@/types/appointments";
import styles from "./appointment-moments.module.css";

const ACTIVE = new Set(["pending", "confirmed"]);

function clock(value: string | null | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** Liste/zaman akışında küçük rozet: müşteri yolda / gecikecek, işletme gecikmeli. */
export function AppointmentMomentBadges({ appointment }: { appointment: Appointment }) {
  const t = useT();
  if (!ACTIVE.has(appointment.status)) return null;
  const arrival = appointment.arrival;
  const delay = appointment.businessDelay?.minutes ?? 0;
  if (!arrival && delay <= 0) return null;
  return (
    <>
      {arrival?.status === "on_the_way" && <Badge size="sm" tone="green" icon={Car} pulse>{t("Yolda")}</Badge>}
      {arrival?.status === "late" && <Badge size="sm" tone="amber" icon={Car}>{t("+{count} dk", { count: arrival.delayMinutes })}</Badge>}
      {delay > 0 && <Badge size="sm" tone="violet" icon={Hourglass}>{t("Biz +{count} dk", { count: delay })}</Badge>}
    </>
  );
}

/**
 * Randevu detayında: müşterinin varış bildirimi + "Gecikmeliyiz" kontrolü.
 * Gecikme müşterinin biletinde görünür; hesabı varsa bildirim gider.
 */
export function AppointmentMomentsPanel({ businessId, appointment, canManage }: { businessId: string; appointment: Appointment; canManage: boolean }) {
  const t = useT();
  const locale = useIntlLocale();
  const [busy, setBusy] = useState<number | null>(null);
  const [cascade, setCascade] = useState(true);
  const [now] = useState(() => Date.now());
  const [delay, setDelay] = useState(appointment.businessDelay?.minutes ?? 0);
  const [prevKey, setPrevKey] = useState(`${appointment.id}:${appointment.businessDelay?.minutes ?? 0}`);
  const key = `${appointment.id}:${appointment.businessDelay?.minutes ?? 0}`;
  if (key !== prevKey) { setPrevKey(key); setDelay(appointment.businessDelay?.minutes ?? 0); }

  if (!ACTIVE.has(appointment.status)) return null;
  const start = new Date(appointment.startAt).getTime();
  const end = new Date(appointment.endAt || appointment.startAt).getTime();
  const delayable = end > now - 30 * 60_000 && start < now + 24 * 60 * 60_000;
  const arrival = appointment.arrival;
  if (!arrival && (!canManage || !delayable)) return null;

  async function save(minutes: number) {
    if (busy !== null) return;
    setBusy(minutes);
    try {
      const result = await setAppointmentBusinessDelay({ businessId, appointmentId: appointment.id, minutes, cascade: cascade && Boolean(appointment.staffId) });
      setDelay(minutes);
      toast.success(minutes === 0
        ? t("Gecikme kaldırıldı.")
        : result.updated > 1
          ? t("{count} randevuya {minutes} dk gecikme bildirildi.", { count: result.updated, minutes })
          : t("Müşteriye {minutes} dk gecikme bildirildi.", { minutes }));
      notifyAppointmentsChanged();
    } catch (error) {
      toast.error(t(userFacingError(error, tk("Gecikme bildirilemedi. Lütfen tekrar deneyin."))));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.wrap}>
      {arrival && (
        <Callout tone={arrival.status === "late" ? "amber" : "green"} icon={Car}
          title={arrival.status === "late" ? t("Müşteri ~{count} dk gecikecek", { count: arrival.delayMinutes }) : t("Müşteri yolda")}>
          <span>{arrival.status === "late"
            ? t("Tahmini varış {time}.", { time: clock(new Date(start + arrival.delayMinutes * 60_000).toISOString(), locale) })
            : t("Biletinden bildirdi{time}.", { time: arrival.updatedAt ? ` · ${clock(arrival.updatedAt, locale)}` : "" })}</span>
        </Callout>
      )}
      {canManage && delayable && (
        <div className={styles.delayBox}>
          <div className={styles.delayHead}>
            <span className={styles.delayIcon}><TimerReset size={17} aria-hidden /></span>
            <div><b>{t("Gecikmeli misiniz?")}</b><small>{t("Müşteri biletinde görür, boşuna erken gelip beklemez.")}</small></div>
          </div>
          <div className={styles.chips} role="group" aria-label={t("Gecikme süresi")}>
            <Button size="sm" variant={delay === 0 ? "primary" : "secondary"} loading={busy === 0} disabled={busy !== null && busy !== 0} onClick={() => void save(0)}>{t("Zamanında")}</Button>
            {BUSINESS_DELAY_OPTIONS.map((minutes) => (
              <Button key={minutes} size="sm" variant={delay === minutes ? "primary" : "secondary"} loading={busy === minutes} disabled={busy !== null && busy !== minutes} onClick={() => void save(minutes)}>
                {t("+{count} dk", { count: minutes })}
              </Button>
            ))}
          </div>
          {appointment.staffId && <Switch checked={cascade} onChange={setCascade} label={t("Sonraki randevulara da yansıt")} description={appointment.staffName ? t("{name} · bugün bu saatten sonraki randevular", { name: appointment.staffName }) : t("Aynı uzmanın bugün bu saatten sonraki randevuları")} />}
        </div>
      )}
    </div>
  );
}
