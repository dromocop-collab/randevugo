"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import type { Locale as DateLocale } from "date-fns";
import { BadgeCheck, Check, Clock3, CreditCard, ExternalLink, Pencil, Plus, UserRound } from "lucide-react";
import { AppointmentCustomFields } from "@/features/booking-fields/appointment-custom-fields";
import { Badge, Button, KeyValueList, Sheet, StatusPill, appointmentStatusMeta } from "@/components/dashboard/ui";
import { appointmentPriceLabel, localizedAppointmentServiceName, needsFinalPrice } from "@/features/services/service-pricing";
import { cn } from "@/lib/utils/cn";
import { tk } from "@/i18n/config";
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import { DATE_FNS_LOCALES, useDateFnsLocale } from "@/i18n/date";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import styles from "./calendar.module.css";

export type ViewMode = "gun" | "hafta" | "ay";
export const HOUR_H = 64;
export const UNASSIGNED = "__none";

/** date-fns biçimlendirme dili (etkin site diline göre). */
export const useDateLocale: () => DateLocale = useDateFnsLocale;

/* ── Zaman ızgarası (gün: ekip sütunları, hafta: gün sütunları) ── */
export type GridColumn = { key: string; label: string; day: Date; today: boolean; items: Appointment[]; staffId?: string };

/** Sürükle-bırak ile taşıma hedefi (sayfa onay sorar, sunucu çakışma/çalışma saatini yeniden denetler). */
export type MoveTarget = { startAt: Date; endAt: Date; staffId?: string; staffLabel?: string };

type DragState = {
  item: Appointment; pointerId: number; touch: boolean; active: boolean;
  startX: number; startY: number; grabOffset: number; durationMin: number;
  col: number; minutes: number;
};

const MOVABLE: AppointmentStatus[] = ["pending", "confirmed"];
const LONG_PRESS_MS = 380;

export function TimeGrid({ columns, hours, now, onSelect, onCreate, onMove, snapMinutes = 15, showStaff, staffColumns = false }: {
  columns: GridColumn[];
  hours: { start: number; end: number };
  now: number;
  onSelect: (item: Appointment) => void;
  onCreate: (date: Date) => void;
  /** Verilirse aktif randevular sürüklenerek taşınabilir. */
  onMove?: (item: Appointment, target: MoveTarget) => void;
  snapMinutes?: number;
  showStaff?: boolean;
  staffColumns?: boolean;
}) {
  // Aralık dışındaki randevular da görünsün.
  const all = columns.flatMap((column) => column.items);
  const startHour = Math.min(hours.start, ...all.map((item) => new Date(item.startAt).getHours()));
  const endHour = Math.max(hours.end, ...all.map((item) => { const end = new Date(item.endAt || item.startAt); return Math.min(24, end.getHours() + (end.getMinutes() ? 1 : 0)); }));
  const hourList = Array.from({ length: Math.max(1, endHour - startHour) }, (_, index) => startHour + index);
  const height = hourList.length * HOUR_H;
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragRef = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const t = useT();
  const siteLocale = useLocale();
  const locale = useDateLocale();
  const snap = Math.max(5, Math.min(60, Math.round(snapMinutes) || 15));

  // Bugün görünüyorsa "şimdi" çizgisine kaydır.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !columns.some((column) => column.today)) return;
    const nowDate = new Date(now);
    const top = ((nowDate.getHours() - startHour) + nowDate.getMinutes() / 60) * HOUR_H;
    if (top > 0 && top < height) el.scrollTop = Math.max(0, top - 120);
    // Yalnızca ilk çizimde.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sayfadan çıkılırsa açık dinleyiciler kalmasın.
  useEffect(() => () => cleanupRef.current?.(), []);

  function slotFromClick(event: ReactMouseEvent<HTMLButtonElement>, day: Date) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = Math.floor(((event.clientY - rect.top) / HOUR_H) * 60 / 30) * 30;
    const date = new Date(day);
    date.setHours(startHour, 0, 0, 0);
    date.setMinutes(date.getMinutes() + Math.max(0, minutes));
    return date;
  }

  /** Sürüklenen randevunun hedefi: saat, çalışan ve neden bırakılamayacağı. */
  function resolveTarget(state: DragState) {
    const column = columns[state.col];
    const startAt = new Date(column.day);
    startAt.setHours(startHour, 0, 0, 0);
    startAt.setMinutes(state.minutes);
    const endAt = new Date(startAt.getTime() + state.durationMin * 60_000);
    const item = state.item;
    const staffId = staffColumns ? (column.staffId === UNASSIGNED ? undefined : column.staffId) : item.staffId;
    const sameStaff = (other: Appointment) => !staffId || !other.staffId || other.staffId === staffId;
    const unchanged = startAt.getTime() === new Date(item.startAt).getTime() && (staffId ?? "") === (item.staffId ?? "");
    let reason: string | null = null;
    if (staffColumns && column.staffId === UNASSIGNED && item.staffId) reason = tk("Çalışana ata");
    else if (startAt.getTime() < now) reason = tk("Geçmiş saat");
    else if (columns.flatMap((entry) => entry.items).some((other) => other.id !== item.id && MOVABLE.includes(other.status) && sameStaff(other)
      && new Date(other.startAt).getTime() < endAt.getTime() && new Date(other.endAt || other.startAt).getTime() > startAt.getTime())) reason = tk("Dolu");
    return { column, startAt, endAt, staffId, unchanged, reason };
  }

  function placeDrag(state: DragState, clientX: number, clientY: number) {
    let col = state.col;
    if (!staffColumns || columns.length > 1) {
      colRefs.current.forEach((element, index) => {
        const rect = element?.getBoundingClientRect();
        if (rect && clientX >= rect.left && clientX < rect.right) col = index;
      });
    }
    const rect = colRefs.current[col]?.getBoundingClientRect();
    if (!rect) return state;
    const raw = ((clientY - rect.top - state.grabOffset) / HOUR_H) * 60;
    const maxMinutes = Math.max(0, hourList.length * 60 - Math.min(state.durationMin, 60));
    const minutes = Math.min(maxMinutes, Math.max(0, Math.round(raw / snap) * snap));
    return { ...state, col, minutes };
  }

  function endDrag(commit: boolean) {
    const state = dragRef.current;
    cleanupRef.current?.();
    cleanupRef.current = null;
    dragRef.current = null;
    setDrag(null);
    if (!state?.active) return;
    // Bırakma sonrası gelen tıklama çekmeceyi açmasın.
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    if (!commit || !onMove) return;
    const target = resolveTarget(state);
    if (target.unchanged) return;
    if (target.reason) { toast.error(t("Buraya taşınamaz: {reason}", { reason: t(target.reason) })); return; }
    onMove(state.item, { startAt: target.startAt, endAt: target.endAt, staffId: target.staffId, staffLabel: staffColumns ? target.column.label : undefined });
  }

  function startPointer(event: ReactPointerEvent<HTMLButtonElement>, item: Appointment, col: number, minutes: number, durationMin: number) {
    if (!onMove || !MOVABLE.includes(item.status) || (event.pointerType === "mouse" && event.button !== 0)) return;
    cleanupRef.current?.();
    const touch = event.pointerType !== "mouse";
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { item, pointerId: event.pointerId, touch, active: false, startX: event.clientX, startY: event.clientY,
      grabOffset: event.clientY - rect.top, durationMin, col, minutes };
    const activate = () => {
      const state = dragRef.current;
      if (!state || state.active) return;
      dragRef.current = { ...state, active: true };
      setDrag(dragRef.current);
      if (state.touch) navigator.vibrate?.(12);
    };
    const timer = touch ? window.setTimeout(activate, LONG_PRESS_MS) : 0;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const state = dragRef.current;
      if (!state || moveEvent.pointerId !== state.pointerId) return;
      const distance = Math.hypot(moveEvent.clientX - state.startX, moveEvent.clientY - state.startY);
      if (!state.active) {
        // Dokunmatikte uzun basmadan önce hareket = kaydırma; sürükleme iptal.
        if (state.touch) { if (distance > 8) endDrag(false); return; }
        if (distance < 5) return;
        activate();
      }
      const next = placeDrag(dragRef.current!, moveEvent.clientX, moveEvent.clientY);
      dragRef.current = next;
      setDrag(next);
      // Kenara yaklaşınca ızgarayı kaydır.
      const scroller = scrollRef.current;
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        if (moveEvent.clientY < box.top + 40) scroller.scrollTop -= 16;
        else if (moveEvent.clientY > box.bottom - 40) scroller.scrollTop += 16;
      }
    };
    const onPointerUp = (upEvent: PointerEvent) => { if (upEvent.pointerId === dragRef.current?.pointerId) endDrag(true); };
    const onPointerCancel = () => endDrag(false);
    const onKeyDown = (keyEvent: KeyboardEvent) => { if (keyEvent.key === "Escape") endDrag(false); };
    // Sürüklerken sayfanın kaymasını engelle (iOS yalnız pasif olmayan touchmove ile durur).
    const onTouchMove = (touchEvent: TouchEvent) => { if (dragRef.current?.active) touchEvent.preventDefault(); };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    cleanupRef.current = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }

  const nowDate = new Date(now);
  const nowTop = ((nowDate.getHours() - startHour) + nowDate.getMinutes() / 60) * HOUR_H;
  const target = drag?.active ? resolveTarget(drag) : null;

  return (
    <div className={styles.gridScroll} ref={scrollRef}>
      <div className={cn(styles.grid, drag?.active && styles.gridDragging)} style={{ "--cols": columns.length, "--hour-h": `${HOUR_H}px`, "--grid-h": `${height}px` } as CSSProperties} data-staff={staffColumns ? "" : undefined}>
        <div className={styles.corner} />
        {columns.map((column) => (
          <div key={`h-${column.key}`} className={cn(styles.colHead, column.today && !staffColumns && styles.colHeadToday)}>
            {staffColumns ? <><span className={styles.staffAvatar} aria-hidden>{initials(column.label)}</span><b>{column.label}</b><small>{t("{count} randevu", { count: column.items.filter((item) => item.status !== "cancelled").length })}</small></> : <><small>{format(column.day, "EEE", { locale })}</small><b>{format(column.day, "d")}</b></>}
          </div>
        ))}
        <div className={styles.hoursCol} aria-hidden>
          {hourList.map((hour) => <span key={hour} style={{ height: HOUR_H }}>{String(hour).padStart(2, "0")}:00</span>)}
        </div>
        {columns.map((column, colIndex) => (
          <div key={column.key} ref={(element) => { colRefs.current[colIndex] = element; }} className={cn(styles.col, column.today && styles.colToday)}>
            <button
              type="button"
              className={styles.slotLayer}
              aria-label={staffColumns ? t("{date} · {staff} için randevu ekle", { date: format(column.day, "d MMMM", { locale }), staff: column.label }) : t("{date} için randevu ekle", { date: format(column.day, "d MMMM", { locale }) })}
              onClick={(event) => onCreate(slotFromClick(event, column.day))}
            >
              {hourList.map((hour) => <i key={hour} style={{ height: HOUR_H }} />)}
            </button>
            {layoutEvents(column.items).map(({ item, lane, lanes }) => {
              const start = new Date(item.startAt);
              const end = new Date(item.endAt || item.startAt);
              const top = ((start.getHours() - startHour) + start.getMinutes() / 60) * HOUR_H;
              const durationMin = Math.max(20, (end.getTime() - start.getTime()) / 60_000);
              const realDuration = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60_000) || Number(item.serviceDurationMinutes) || 30);
              const meta = appointmentStatusMeta[item.status];
              const movable = Boolean(onMove) && MOVABLE.includes(item.status);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(styles.event, styles[`ev-${item.status}`], movable && styles.eventMovable, drag?.active && drag.item.id === item.id && styles.eventDragging)}
                  style={{ top, height: Math.max(26, (durationMin / 60) * HOUR_H - 3), left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                  onPointerDown={(event) => startPointer(event, item, colIndex, (start.getHours() - startHour) * 60 + start.getMinutes(), realDuration)}
                  onContextMenu={movable ? (event) => event.preventDefault() : undefined}
                  onTouchEnd={(event) => { if (dragRef.current?.active || suppressClickRef.current) event.stopPropagation(); }}
                  onClick={() => { if (!suppressClickRef.current) onSelect(item); }}
                  aria-label={`${format(start, "HH:mm")} ${item.customerName}, ${t(meta.label)}`}
                  title={movable ? t("Taşımak için sürükleyin") : undefined}
                >
                  <span className={styles.evTime}>{format(start, "HH:mm")}{durationMin >= 55 ? `–${format(end, "HH:mm")}` : ""}</span>
                  <b>{item.customerName}</b>
                  {durationMin >= 55 && <small>{localizedAppointmentServiceName(item, siteLocale) || t("Randevu")}{showStaff && item.staffName ? ` · ${item.staffName}` : ""}</small>}
                </button>
              );
            })}
            {target && drag && drag.col === colIndex && (
              <div
                className={cn(styles.dropGhost, target.reason && styles.dropGhostInvalid)}
                style={{ top: (drag.minutes / 60) * HOUR_H, height: Math.max(26, (Math.max(20, drag.durationMin) / 60) * HOUR_H - 3) }}
                aria-hidden
              >
                <b>{format(target.startAt, "HH:mm")}–{format(target.endAt, "HH:mm")}</b>
                <small>{target.reason ? t(target.reason) : drag.item.customerName}</small>
              </div>
            )}
            {column.today && nowTop >= 0 && nowTop <= height && <span className={styles.nowLine} style={{ top: nowTop }} aria-hidden />}
          </div>
        ))}
      </div>
    </div>
  );
}

function layoutEvents(items: Appointment[]) {
  const sorted = [...items].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  const result: Array<{ item: Appointment; lane: number; lanes: number }> = [];
  let cluster: Array<{ item: Appointment; lane: number; end: number }> = [];
  let clusterEnd = 0;
  const flush = () => { const lanes = Math.max(1, ...cluster.map((entry) => entry.lane + 1)); cluster.forEach((entry) => result.push({ item: entry.item, lane: entry.lane, lanes })); cluster = []; };
  for (const item of sorted) {
    const start = new Date(item.startAt).getTime();
    const end = Math.max(start + 20 * 60_000, new Date(item.endAt || item.startAt).getTime());
    if (cluster.length && start >= clusterEnd) flush();
    const used = new Set(cluster.filter((entry) => entry.end > start).map((entry) => entry.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;
    cluster.push({ item, lane, end });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return result;
}

/* ── Mobil hafta listesi ── */
export function WeekAgenda({ days, appointments, onSelect, onCreate }: { days: Date[]; appointments: Appointment[]; onSelect: (item: Appointment) => void; onCreate: (date: Date) => void }) {
  const t = useT();
  const siteLocale = useLocale();
  const locale = useDateLocale();
  return (
    <div className={styles.agenda}>
      {days.map((day) => {
        const items = appointments.filter((item) => isSameDay(new Date(item.startAt), day));
        return (
          <section key={day.toISOString()} className={cn(styles.agendaDay, isSameDay(day, new Date()) && styles.agendaToday)}>
            <header>
              <div><small>{format(day, "EEEE", { locale })}</small><b>{format(day, "d MMMM", { locale })}</b></div>
              <Button size="sm" variant="soft" icon={Plus} onClick={() => onCreate(withHour(day, 9))}>{t("Ekle")}</Button>
            </header>
            {items.length ? items.map((item) => (
              <button type="button" key={item.id} className={cn(styles.agendaRow, styles[`ev-${item.status}`])} onClick={() => onSelect(item)}>
                <time>{format(new Date(item.startAt), "HH:mm")}</time>
                <span><b>{item.customerName}</b><small>{localizedAppointmentServiceName(item, siteLocale) || t("Randevu")}{item.staffName ? ` · ${item.staffName}` : ""}</small></span>
                <StatusPill status={item.status} size="sm" />
              </button>
            )) : <p className={styles.agendaEmpty}>{t("Randevu yok")}</p>}
          </section>
        );
      })}
    </div>
  );
}

/* ── Ay görünümü ── */
export function MonthView({ days, cursor, appointments, onSelect, onOpenDay }: { days: Date[]; cursor: Date; appointments: Appointment[]; onSelect: (item: Appointment) => void; onOpenDay: (day: Date) => void }) {
  const t = useT();
  const locale = useDateLocale();
  // Pazartesi başlayan kısa gün adları (etkin dilde); 2024-01-01 bir pazartesidir.
  const weekdayNames = days.length >= 7 ? days.slice(0, 7).map((day) => format(day, "EEE", { locale })) : Array.from({ length: 7 }, (_, index) => format(new Date(2024, 0, 1 + index), "EEE", { locale }));
  return (
    <div className={styles.month}>
      <div className={styles.monthHead}>{weekdayNames.map((day, index) => <span key={index}>{day}</span>)}</div>
      <div className={styles.monthGrid}>
        {days.map((day) => {
          const items = appointments.filter((item) => item.status !== "cancelled" && isSameDay(new Date(item.startAt), day));
          return (
            <div key={day.toISOString()} className={cn(styles.monthDay, !isSameMonth(day, cursor) && styles.monthMuted, isSameDay(day, new Date()) && styles.monthToday)}>
              <button type="button" className={styles.monthNum} onClick={() => onOpenDay(day)} aria-label={t("{date}, {count} randevu. Günü aç", { date: format(day, "d MMMM", { locale }), count: items.length })}>
                <span>{format(day, "d")}</span>
                {items.length > 0 && <em className={styles.monthCount}>{items.length}</em>}
              </button>
              <div className={styles.monthEvents}>
                {items.slice(0, 3).map((item) => (
                  <button key={item.id} type="button" className={cn(styles.monthEvent, styles[`ev-${item.status}`])} onClick={() => onSelect(item)}>
                    <time>{format(new Date(item.startAt), "HH:mm")}</time><span>{item.customerName}</span>
                  </button>
                ))}
                {items.length > 3 && <button type="button" className={styles.monthMore} onClick={() => onOpenDay(day)}>{t("+{count} daha", { count: items.length - 3 })}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Randevu çekmecesi ── */
export function AppointmentDrawer({ appointment, canManage, updating, onClose, onEdit, onStatus }: {
  appointment: Appointment | null;
  canManage: boolean;
  updating: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: AppointmentStatus) => void;
}) {
  const siteLocale = useLocale();
  const services = appointment ? [localizedAppointmentServiceName(appointment, siteLocale), ...(appointment.additionalServices ?? []).map((service) => service.name)].filter(Boolean).join(" + ") : "";
  const open = ["pending", "confirmed"].includes(appointment?.status ?? "");
  const t = useT();
  const locale = useDateLocale();
  const intlLocale = useIntlLocale();
  return (
    <Sheet
      open={Boolean(appointment)}
      onClose={onClose}
      placement="side"
      title={appointment?.customerName ?? ""}
      description={appointment ? <StatusPill status={appointment.status} /> : undefined}
      footer={appointment ? <>
        <Button variant="secondary" icon={Pencil} onClick={onEdit}>{t("Hızlı düzenle")}</Button>
        <Button variant="primary" href={`/dashboard/randevular?appointment=${encodeURIComponent(appointment.id)}`} trailingIcon={ExternalLink}>{t("Tüm ayrıntılar")}</Button>
      </> : undefined}
    >
      {appointment && (
        <div className={styles.drawer}>
          <KeyValueList items={[
            { label: <><Clock3 size={11} aria-hidden /> {t("Tarih ve saat")}</>, value: `${format(new Date(appointment.startAt), "d MMMM yyyy, EEEE · HH:mm", { locale })}${appointment.endAt ? ` – ${format(new Date(appointment.endAt), "HH:mm")}` : ""}`, wide: true },
            { label: t("Hizmet"), value: services || t("Hizmet bilgisi girilmemiş"), wide: true },
            { label: <><UserRound size={11} aria-hidden /> {t("Çalışan")}</>, value: appointment.staffName || t("Atanmamış") },
            { label: <><CreditCard size={11} aria-hidden /> {t("Ödeme")}</>, value: appointment.paymentStatus === "paid" ? t("Ödendi") : appointment.paymentStatus === "deposit_paid" ? t("Kapora ödendi") : appointment.paymentStatus === "refunded" ? t("İade edildi") : t("Ödeme bekliyor") },
            ...(appointment.servicePrice || (appointment.servicePriceType ?? "fixed") !== "fixed" ? [{ label: t("Tutar"), value: <span className={styles.priceValue}>{appointmentPriceLabel(appointment, t, (value) => `${value.toLocaleString(intlLocale)} ₺`)}{needsFinalPrice(appointment) && <Badge size="sm" tone="amber">{t("Fiyat bekliyor")}</Badge>}</span> }] : []),
          ]} />
          {appointment.notes && <div className={styles.note}><small>{t("Randevu notu")}</small><p>{appointment.notes}</p></div>}
          <AppointmentCustomFields values={appointment.customFields} />
          {canManage && open && (
            <div className={styles.drawerActions}>
              {appointment.status === "pending" && <Button variant="soft" icon={BadgeCheck} loading={updating} onClick={() => onStatus("confirmed")}>{t("Onayla")}</Button>}
              <Button variant="soft" icon={Check} loading={updating} onClick={() => onStatus("completed")}>{t("Tamamlandı")}</Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toLocaleUpperCase("tr-TR");
}
export function withHour(day: Date, hour: number) { const date = new Date(day); date.setHours(hour, 0, 0, 0); return date; }
export function eachDay(start: Date, end: Date) { const days: Date[] = []; for (let day = start; day <= end; day = addDays(day, 1)) days.push(day); return days; }
export function getRange(cursor: Date, view: ViewMode) {
  // Gün görünümünde de haftanın tamamı yüklenir: gün şeridindeki sayılar ve kaydırma anında çalışır.
  if (view === "gun" || view === "hafta") return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
  const monthStart = startOfMonth(cursor), monthEnd = endOfMonth(cursor);
  return { start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) };
}
export function rangeTitle(cursor: Date, view: ViewMode, locale: DateLocale = DATE_FNS_LOCALES.tr) {
  if (view === "gun") return format(cursor, "d MMMM, EEEE", { locale });
  if (view === "ay") return format(cursor, "MMMM yyyy", { locale });
  const start = startOfWeek(cursor, { weekStartsOn: 1 }), end = endOfWeek(cursor, { weekStartsOn: 1 });
  return `${format(start, "d MMM", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;
}
