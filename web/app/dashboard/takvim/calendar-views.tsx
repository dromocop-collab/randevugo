"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { BadgeCheck, Check, Clock3, CreditCard, ExternalLink, Pencil, Plus, UserRound } from "lucide-react";
import { AppointmentCustomFields } from "@/features/booking-fields/appointment-custom-fields";
import { Button, KeyValueList, Sheet, StatusPill, appointmentStatusMeta } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import styles from "./calendar.module.css";

export type ViewMode = "gun" | "hafta" | "ay";
export const HOUR_H = 64;
export const UNASSIGNED = "__none";

/* ── Zaman ızgarası (gün: ekip sütunları, hafta: gün sütunları) ── */
export type GridColumn = { key: string; label: string; day: Date; today: boolean; items: Appointment[]; staffId?: string };

export function TimeGrid({ columns, hours, now, onSelect, onCreate, showStaff, staffColumns = false }: {
  columns: GridColumn[];
  hours: { start: number; end: number };
  now: number;
  onSelect: (item: Appointment) => void;
  onCreate: (date: Date) => void;
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

  function slotFromClick(event: ReactMouseEvent<HTMLButtonElement>, day: Date) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = Math.floor(((event.clientY - rect.top) / HOUR_H) * 60 / 30) * 30;
    const date = new Date(day);
    date.setHours(startHour, 0, 0, 0);
    date.setMinutes(date.getMinutes() + Math.max(0, minutes));
    return date;
  }

  const nowDate = new Date(now);
  const nowTop = ((nowDate.getHours() - startHour) + nowDate.getMinutes() / 60) * HOUR_H;

  return (
    <div className={styles.gridScroll} ref={scrollRef}>
      <div className={styles.grid} style={{ "--cols": columns.length, "--hour-h": `${HOUR_H}px`, "--grid-h": `${height}px` } as CSSProperties} data-staff={staffColumns ? "" : undefined}>
        <div className={styles.corner} />
        {columns.map((column) => (
          <div key={`h-${column.key}`} className={cn(styles.colHead, column.today && !staffColumns && styles.colHeadToday)}>
            {staffColumns ? <><span className={styles.staffAvatar} aria-hidden>{initials(column.label)}</span><b>{column.label}</b><small>{column.items.filter((item) => item.status !== "cancelled").length} randevu</small></> : <><small>{format(column.day, "EEE", { locale: tr })}</small><b>{format(column.day, "d")}</b></>}
          </div>
        ))}
        <div className={styles.hoursCol} aria-hidden>
          {hourList.map((hour) => <span key={hour} style={{ height: HOUR_H }}>{String(hour).padStart(2, "0")}:00</span>)}
        </div>
        {columns.map((column) => (
          <div key={column.key} className={cn(styles.col, column.today && styles.colToday)}>
            <button
              type="button"
              className={styles.slotLayer}
              aria-label={`${format(column.day, "d MMMM", { locale: tr })}${staffColumns ? ` · ${column.label}` : ""} için randevu ekle`}
              onClick={(event) => onCreate(slotFromClick(event, column.day))}
            >
              {hourList.map((hour) => <i key={hour} style={{ height: HOUR_H }} />)}
            </button>
            {layoutEvents(column.items).map(({ item, lane, lanes }) => {
              const start = new Date(item.startAt);
              const end = new Date(item.endAt || item.startAt);
              const top = ((start.getHours() - startHour) + start.getMinutes() / 60) * HOUR_H;
              const durationMin = Math.max(20, (end.getTime() - start.getTime()) / 60_000);
              const meta = appointmentStatusMeta[item.status];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(styles.event, styles[`ev-${item.status}`])}
                  style={{ top, height: Math.max(26, (durationMin / 60) * HOUR_H - 3), left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                  onClick={() => onSelect(item)}
                  aria-label={`${format(start, "HH:mm")} ${item.customerName}, ${meta.label}`}
                >
                  <span className={styles.evTime}>{format(start, "HH:mm")}{durationMin >= 55 ? `–${format(end, "HH:mm")}` : ""}</span>
                  <b>{item.customerName}</b>
                  {durationMin >= 55 && <small>{item.serviceName || "Randevu"}{showStaff && item.staffName ? ` · ${item.staffName}` : ""}</small>}
                </button>
              );
            })}
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
  return (
    <div className={styles.agenda}>
      {days.map((day) => {
        const items = appointments.filter((item) => isSameDay(new Date(item.startAt), day));
        return (
          <section key={day.toISOString()} className={cn(styles.agendaDay, isSameDay(day, new Date()) && styles.agendaToday)}>
            <header>
              <div><small>{format(day, "EEEE", { locale: tr })}</small><b>{format(day, "d MMMM", { locale: tr })}</b></div>
              <Button size="sm" variant="soft" icon={Plus} onClick={() => onCreate(withHour(day, 9))}>Ekle</Button>
            </header>
            {items.length ? items.map((item) => (
              <button type="button" key={item.id} className={cn(styles.agendaRow, styles[`ev-${item.status}`])} onClick={() => onSelect(item)}>
                <time>{format(new Date(item.startAt), "HH:mm")}</time>
                <span><b>{item.customerName}</b><small>{item.serviceName || "Randevu"}{item.staffName ? ` · ${item.staffName}` : ""}</small></span>
                <StatusPill status={item.status} size="sm" />
              </button>
            )) : <p className={styles.agendaEmpty}>Randevu yok</p>}
          </section>
        );
      })}
    </div>
  );
}

/* ── Ay görünümü ── */
export function MonthView({ days, cursor, appointments, onSelect, onOpenDay }: { days: Date[]; cursor: Date; appointments: Appointment[]; onSelect: (item: Appointment) => void; onOpenDay: (day: Date) => void }) {
  return (
    <div className={styles.month}>
      <div className={styles.monthHead}>{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className={styles.monthGrid}>
        {days.map((day) => {
          const items = appointments.filter((item) => item.status !== "cancelled" && isSameDay(new Date(item.startAt), day));
          return (
            <div key={day.toISOString()} className={cn(styles.monthDay, !isSameMonth(day, cursor) && styles.monthMuted, isSameDay(day, new Date()) && styles.monthToday)}>
              <button type="button" className={styles.monthNum} onClick={() => onOpenDay(day)} aria-label={`${format(day, "d MMMM", { locale: tr })}, ${items.length} randevu. Günü aç`}>
                <span>{format(day, "d")}</span>
                {items.length > 0 && <em className={styles.monthCount}>{items.length}</em>}
              </button>
              <div className={styles.monthEvents}>
                {items.slice(0, 3).map((item) => (
                  <button key={item.id} type="button" className={cn(styles.monthEvent, styles[`ev-${item.status}`])} onClick={() => onSelect(item)}>
                    <time>{format(new Date(item.startAt), "HH:mm")}</time><span>{item.customerName}</span>
                  </button>
                ))}
                {items.length > 3 && <button type="button" className={styles.monthMore} onClick={() => onOpenDay(day)}>+{items.length - 3} daha</button>}
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
  const services = appointment ? [appointment.serviceName, ...(appointment.additionalServices ?? []).map((service) => service.name)].filter(Boolean).join(" + ") : "";
  const open = ["pending", "confirmed"].includes(appointment?.status ?? "");
  return (
    <Sheet
      open={Boolean(appointment)}
      onClose={onClose}
      placement="side"
      title={appointment?.customerName ?? ""}
      description={appointment ? <StatusPill status={appointment.status} /> : undefined}
      footer={appointment ? <>
        <Button variant="secondary" icon={Pencil} onClick={onEdit}>Hızlı düzenle</Button>
        <Button variant="primary" href={`/dashboard/randevular?appointment=${encodeURIComponent(appointment.id)}`} trailingIcon={ExternalLink}>Tüm ayrıntılar</Button>
      </> : undefined}
    >
      {appointment && (
        <div className={styles.drawer}>
          <KeyValueList items={[
            { label: <><Clock3 size={11} aria-hidden /> Tarih ve saat</>, value: `${format(new Date(appointment.startAt), "d MMMM yyyy, EEEE · HH:mm", { locale: tr })}${appointment.endAt ? ` – ${format(new Date(appointment.endAt), "HH:mm")}` : ""}`, wide: true },
            { label: "Hizmet", value: services || "Hizmet bilgisi girilmemiş", wide: true },
            { label: <><UserRound size={11} aria-hidden /> Çalışan</>, value: appointment.staffName || "Atanmamış" },
            { label: <><CreditCard size={11} aria-hidden /> Ödeme</>, value: appointment.paymentStatus === "paid" ? "Ödendi" : appointment.paymentStatus === "deposit_paid" ? "Kapora ödendi" : appointment.paymentStatus === "refunded" ? "İade edildi" : "Ödeme bekliyor" },
            ...(appointment.servicePrice ? [{ label: "Tutar", value: `${appointment.servicePrice.toLocaleString("tr-TR")} ₺` }] : []),
          ]} />
          {appointment.notes && <div className={styles.note}><small>Randevu notu</small><p>{appointment.notes}</p></div>}
          <AppointmentCustomFields values={appointment.customFields} />
          {canManage && open && (
            <div className={styles.drawerActions}>
              {appointment.status === "pending" && <Button variant="soft" icon={BadgeCheck} loading={updating} onClick={() => onStatus("confirmed")}>Onayla</Button>}
              <Button variant="soft" icon={Check} loading={updating} onClick={() => onStatus("completed")}>Tamamlandı</Button>
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
export function rangeTitle(cursor: Date, view: ViewMode) {
  if (view === "gun") return format(cursor, "d MMMM, EEEE", { locale: tr });
  if (view === "ay") return format(cursor, "MMMM yyyy", { locale: tr });
  const start = startOfWeek(cursor, { weekStartsOn: 1 }), end = endOfWeek(cursor, { weekStartsOn: 1 });
  return `${format(start, "d MMM", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`;
}
