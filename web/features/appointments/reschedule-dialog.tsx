"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarClock, CalendarX2, LoaderCircle } from "lucide-react";
import { BottomSheet, DateStrip, SlotGroups } from "@/components/booking/booking-parts";
import bookingStyles from "@/components/booking/booking.module.css";
import styles from "./reschedule-dialog.module.css";
import { listAvailableSlots, type AvailableAppointmentSlot } from "@/features/appointments/appointment-repository";
import { appointmentChangeError } from "@/features/appointments/appointment-change";
import { DEFAULT_TIME_ZONE, millisToZonedDateTime } from "@/lib/time/zoned";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

const DAY_COUNT = 14;

type Props = {
  businessId: string;
  serviceId: string;
  /** Seçenekli hizmette randevudaki seçenek (süre ondan hesaplanır). */
  variantId?: string;
  /** Mevcut çalışan; boşsa tüm uygun çalışanların saatleri listelenir. */
  staffId?: string;
  currentStartAt: string;
  /** Randevunun kayıtlı toplam süresi (ek hizmetler dahil); saatler bu süreye göre listelenir. */
  durationMinutes?: number;
  title: string;
  subtitle?: string;
  timeZone?: string;
  maximumBookingDaysAhead?: number;
  onClose: () => void;
  onConfirm: (slot: AvailableAppointmentSlot) => Promise<void>;
};

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function RescheduleDialog({ businessId, serviceId, variantId, staffId, currentStartAt, durationMinutes, title, subtitle, timeZone = DEFAULT_TIME_ZONE, maximumBookingDaysAhead, onClose, onConfirm }: Props) {
  const t = useT();
  const intlLocale = useIntlLocale();
  const [today] = useState(() => millisToZonedDateTime(Date.now(), timeZone).date);
  const days = useMemo(() => {
    const count = Math.max(1, Math.min(DAY_COUNT, (maximumBookingDaysAhead ?? DAY_COUNT) + 1));
    return Array.from({ length: count }, (_, index) => addDays(today, index));
  }, [today, maximumBookingDaysAhead]);
  const currentStartMillis = new Date(currentStartAt).getTime();
  const [date, setDate] = useState(days[0]);
  const [loaded, setLoaded] = useState<{ date: string; slots: AvailableAppointmentSlot[]; error: string | null } | null>(null);
  const [selected, setSelected] = useState<AvailableAppointmentSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const loading = loaded?.date !== date;

  useEffect(() => {
    let active = true;
    const appointmentDurationMinutes = durationMinutes && durationMinutes >= 5 && durationMinutes <= 480 ? Math.round(durationMinutes) : undefined;
    listAvailableSlots({ businessId, serviceId, ...(variantId ? { variantId } : {}), ...(staffId ? { staffId } : {}), date, ...(appointmentDurationMinutes ? { appointmentDurationMinutes } : {}) })
      .then((slots) => { if (active) setLoaded({ date, slots: slots.filter((slot) => slot.startAtMillis !== currentStartMillis), error: null }); })
      .catch((reason) => { if (active) setLoaded({ date, slots: [], error: appointmentChangeError(reason, tk("Müsait saatler yüklenemedi. Lütfen yeniden deneyin.")) }); });
    return () => { active = false; };
  }, [businessId, serviceId, variantId, staffId, date, currentStartMillis, durationMinutes]);

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true); busyRef.current = true; setError(null);
    try { await onConfirm(selected); }
    catch (reason) { setError(appointmentChangeError(reason, tk("Randevu saati değiştirilemedi. Lütfen yeniden deneyin."))); }
    finally { setBusy(false); busyRef.current = false; }
  }

  const slots = loading ? [] : loaded?.slots ?? [];
  const selectedDay = selected ? new Date(selected.startAtMillis).toLocaleDateString(intlLocale, { timeZone, day: "2-digit", month: "short" }) : "";
  const currentLabel = Number.isNaN(currentStartMillis) ? "" : new Date(currentStartMillis).toLocaleString(intlLocale, { timeZone, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return <BottomSheet
    eyebrow={t("SAATİ DEĞİŞTİR")}
    title={title}
    description={subtitle}
    busy={busy}
    onClose={onClose}
    footer={<div className={styles.footer}>
      <button type="button" onClick={onClose} disabled={busy} className={bookingStyles.ghost}>{t("Vazgeç")}</button>
      <button type="button" onClick={() => void confirm()} disabled={!selected || busy} className={bookingStyles.primary}>
        {busy ? <LoaderCircle size={18} className={styles.spin} /> : selected ? <><CalendarClock size={18} /> {t("{day} {time} · Onayla", { day: selectedDay, time: selected.label })}</> : t("Yeni saat seçin")}
      </button>
    </div>}
  >
    {currentLabel && <div className={styles.current}><CalendarClock size={16} /><span>{t("Mevcut randevu:")} <b>{currentLabel}</b></span></div>}
    <p className={styles.label}>{t("Yeni tarih")}</p>
    <DateStrip days={days} value={date} today={today} counts={{}} loading={false} onSelect={(key) => { setDate(key); setSelected(null); setError(null); }} />
    <p className={styles.label}>{t("Müsait saatler")}</p>
    <div aria-live="polite">
      {loading ? <div className={bookingStyles.skeletonGrid} aria-label={t("Müsait saatler yükleniyor")}>{Array.from({ length: 10 }).map((_, index) => <i key={index} />)}</div>
        : loaded?.error ? <p className={styles.error} role="alert"><AlertCircle size={16} /> {t(loaded.error)}</p>
        : slots.length === 0 ? <div className={bookingStyles.noSlots}><i><CalendarX2 size={22} /></i><b>{t("Bu tarihte müsait saat yok")}</b><p>{t("Lütfen başka bir gün seçin.")}</p></div>
        : <SlotGroups slots={slots} value={selected?.label ?? ""} onSelect={(slot) => { setSelected(slot); setError(null); }} />}
    </div>
    {error && <p role="alert" className={styles.error}><AlertCircle size={16} /> {t(error)}</p>}
  </BottomSheet>;
}
