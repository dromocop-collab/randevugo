"use client";

import { CalendarOff, Coffee, Copy, CopyCheck, Plus, TriangleAlert, X } from "lucide-react";
import { Button, Field, Input, Switch } from "@/components/dashboard/ui";
import type { DaySchedule } from "@/types/business";
import { cx, ws } from "./kit";
import styles from "./week-editor.module.css";

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
export const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Pzt–Paz

export function toMinutes(value?: string) {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}

export function dayError(day: DaySchedule): string | null {
  if (!day.isOpen) return null;
  if (!day.start || !day.end) return "Başlangıç ve bitiş saatini seçin.";
  if (day.start >= day.end) return "Bitiş saati başlangıçtan sonra olmalı. Gece yarısını geçen vardiyaları ayrı günlere bölün.";
  if (day.breakStart) {
    if (!day.breakEnd || day.breakStart >= day.breakEnd) return "Mola bitişi, mola başlangıcından sonra olmalı.";
    if (day.breakStart < day.start || day.breakEnd > day.end) return "Mola, çalışma saatleri içinde olmalı.";
  }
  return null;
}

export function workMinutes(day: DaySchedule) {
  if (!day.isOpen || dayError(day)) return 0;
  const breakMinutes = day.breakStart && day.breakEnd ? toMinutes(day.breakEnd) - toMinutes(day.breakStart) : 0;
  return Math.max(0, toMinutes(day.end) - toMinutes(day.start) - breakMinutes);
}

/** Molayı mümkünse 13:00–14:00'e, değilse günün ortasına yerleştirir. */
export function breakPatch(day: DaySchedule): Partial<DaySchedule> {
  const start = toMinutes(day.start);
  const end = toMinutes(day.end);
  if (start <= 13 * 60 && end >= 14 * 60) return { breakStart: "13:00", breakEnd: "14:00" };
  const middle = Math.max(start, Math.min(end - 60, Math.round((start + end) / 2 / 30) * 30));
  return { breakStart: fromMinutes(middle), breakEnd: fromMinutes(Math.min(end, middle + 60)) };
}

/** Firestore tanımsız alanları reddeder; molası olmayan günlerde mola alanlarını hiç göndermeyelim. */
export function cleanSchedule(days: DaySchedule[]): DaySchedule[] {
  return days.map(({ breakStart, breakEnd, ...rest }) => (breakStart && breakEnd ? { ...rest, breakStart, breakEnd } : rest));
}

/** Kaynak günün saatlerini hafta içine ya da tüm günlere kopyalar. */
export function copySchedule(days: DaySchedule[], source: DaySchedule, target: "weekdays" | "all") {
  return days.map((item) => {
    if (item.day === source.day) return item;
    if (target === "weekdays" && (item.day < 1 || item.day > 5)) return item;
    return { ...item, isOpen: source.isOpen, start: source.start, end: source.end, breakStart: source.breakStart, breakEnd: source.breakEnd };
  });
}

/** Tek günlük düzenleyici: aç/kapat, saatler, mola çipi, kopyalama. */
export function DayCard({ day, onChange, onCopy, closedLabel = "Randevuya kapalı", compact = false }: {
  day: DaySchedule;
  onChange: (patch: Partial<DaySchedule>) => void;
  onCopy: (target: "weekdays" | "all") => void;
  closedLabel?: string;
  compact?: boolean;
}) {
  const error = dayError(day);
  const rangeInvalid = Boolean(error) && day.start >= day.end;
  const name = DAY_NAMES[day.day];
  return (
    <article id={compact ? undefined : `day-${day.day}`} className={cx(styles.day, compact && styles.dayCompact, !day.isOpen && styles.dayClosed, error && styles.dayInvalid)}>
      <header className={styles.dayHead}>
        <span className={cx(styles.dayBadge, day.isOpen && styles.dayBadgeOpen)} aria-hidden="true">{DAY_SHORT[day.day]}</span>
        <div className={styles.dayTitle}>
          <h3>{name}</h3>
          <p>{day.isOpen ? (error ? "Saatleri kontrol edin" : `${day.start}–${day.end} · ${formatDuration(workMinutes(day))}`) : closedLabel}</p>
        </div>
        <Switch checked={day.isOpen} onChange={(next) => onChange({ isOpen: next })} ariaLabel={`${name} açık`} />
      </header>

      {day.isOpen ? (
        <div className={styles.dayBody}>
          <div className={ws.grid2}>
            <Field label="Başlangıç"><Input type="time" step={900} className={cx(rangeInvalid && styles.invalid)} value={day.start} onChange={(event) => onChange({ start: event.target.value })} aria-invalid={rangeInvalid} /></Field>
            <Field label="Bitiş"><Input type="time" step={900} className={cx(rangeInvalid && styles.invalid)} value={day.end} onChange={(event) => onChange({ end: event.target.value })} aria-invalid={rangeInvalid} /></Field>
          </div>

          {day.breakStart ? (
            <div className={styles.breakChip}>
              <span className={styles.breakIcon} aria-hidden="true"><Coffee size={16} /></span>
              <Input type="time" step={900} className={styles.breakInput} value={day.breakStart} onChange={(event) => onChange({ breakStart: event.target.value || undefined })} aria-label={`${name} mola başlangıcı`} />
              <span className={styles.breakDash} aria-hidden="true">–</span>
              <Input type="time" step={900} className={styles.breakInput} value={day.breakEnd ?? ""} onChange={(event) => onChange({ breakEnd: event.target.value || undefined })} aria-label={`${name} mola bitişi`} />
              <Button variant="dangerSoft" iconOnly icon={X} onClick={() => onChange({ breakStart: undefined, breakEnd: undefined })} aria-label={`${name} molasını kaldır`} />
            </div>
          ) : (
            <button type="button" className={styles.addBreak} onClick={() => onChange(breakPatch(day))}><Plus size={15} /> Mola ekle</button>
          )}

          {error ? <p className={styles.error} role="alert"><TriangleAlert size={14} /> {error}</p> : null}

          <div className={styles.dayActions}>
            <Button size="sm" variant="ghost" icon={Copy} onClick={() => onCopy("weekdays")}>Hafta içine</Button>
            <Button size="sm" variant="ghost" icon={CopyCheck} onClick={() => onCopy("all")}>Tüm günlere</Button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.closedHint} onClick={() => onChange({ isOpen: true })}>
          <CalendarOff size={16} aria-hidden="true" /> Kapalı · açmak için dokunun
        </button>
      )}
    </article>
  );
}
