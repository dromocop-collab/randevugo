"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, CreditCard, Plus, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { listAppointmentsByDateRange } from "@/features/appointments/appointment-repository";
import type { Appointment, AppointmentStatus } from "@/types/appointments";

type ViewMode = "gun" | "hafta" | "ay";
const HOURS = Array.from({ length: 13 }, (_, index) => index + 8);
const VIEW_LABELS: Record<ViewMode, string> = { gun: "Gün", hafta: "Hafta", ay: "Ay" };
const STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: "Bekliyor", className: "calendar-event--pending" }, confirmed: { label: "Onaylı", className: "calendar-event--confirmed" }, completed: { label: "Tamamlandı", className: "calendar-event--completed" }, cancelled: { label: "İptal", className: "calendar-event--cancelled" }, no_show: { label: "Gelmedi", className: "calendar-event--no-show" },
};

export default function CalendarPage() {
  const { businessId, businesses } = useBusiness();
  const [view, setView] = useState<ViewMode>("hafta");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const range = useMemo(() => getRange(cursor, view), [cursor, view]);
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  const newAppointmentHref = activeBusiness?.slug ? `/isletme/${activeBusiness.slug}/randevu` : "/dashboard/randevular";

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(""); } });
    listAppointmentsByDateRange(businessId, range.start, addDays(range.end, 1))
      .then((items) => { if (active) setAppointments(items.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Takvim yüklenemedi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, range.start, range.end]);

  const days = useMemo(() => eachDay(range.start, range.end), [range]);
  const todayCount = appointments.filter((item) => isSameDay(new Date(item.startAt), new Date())).length;
  const confirmedCount = appointments.filter((item) => item.status === "confirmed").length;
  const occupancy = Math.min(100, Math.round((appointments.length / Math.max(days.length * 6, 1)) * 100));
  function move(direction: -1 | 1) { setCursor((date) => view === "gun" ? (direction > 0 ? addDays(date, 1) : subDays(date, 1)) : view === "hafta" ? (direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1)) : (direction > 0 ? addMonths(date, 1) : subMonths(date, 1))); }

  return <div className="calendar-page space-y-5">
    <section className="calendar-hero"><div className="calendar-hero__glow" /><div className="relative z-10"><div className="calendar-kicker"><Sparkles size={14} /> Akıllı planlama merkezi</div><h1>Takvim</h1><p>Ekibinizin zamanını, müşteri akışını ve günlük kapasiteyi tek bakışta yönetin.</p></div><div className="calendar-metrics relative z-10"><MiniMetric label="Bugün" value={String(todayCount)} icon={<CalendarDays size={17} />} /><MiniMetric label="Onaylı" value={String(confirmedCount)} icon={<UserRound size={17} />} /><MiniMetric label="Doluluk" value={`%${occupancy}`} icon={<RefreshCw size={17} />} /></div></section>
    <section className="calendar-panel">
      <header className="calendar-toolbar"><div className="calendar-navigation"><button type="button" onClick={() => move(-1)} aria-label="Önceki dönem"><ChevronLeft size={19} /></button><button type="button" className="calendar-today" onClick={() => setCursor(startOfDay(new Date()))}>Bugün</button><button type="button" onClick={() => move(1)} aria-label="Sonraki dönem"><ChevronRight size={19} /></button><div className="calendar-title"><strong>{rangeTitle(cursor, view)}</strong><span>{appointments.length} randevu</span></div></div><div className="calendar-actions"><div className="calendar-view-switch" role="tablist" aria-label="Takvim görünümü">{(Object.keys(VIEW_LABELS) as ViewMode[]).map((item) => <button type="button" key={item} role="tab" aria-selected={view === item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{VIEW_LABELS[item]}</button>)}</div><Link className="calendar-add" href={newAppointmentHref}><Plus size={17} /> <span>Yeni randevu</span></Link></div></header>
      {error && <div className="calendar-error">{error}</div>}{loading ? <CalendarSkeleton /> : view === "ay" ? <MonthView days={days} cursor={cursor} appointments={appointments} onSelect={setSelected} /> : <TimeGrid days={days} appointments={appointments} onSelect={setSelected} />}
    </section>{selected && <AppointmentDrawer appointment={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function MonthView({ days, cursor, appointments, onSelect }: { days: Date[]; cursor: Date; appointments: Appointment[]; onSelect: (item: Appointment) => void }) { return <div className="month-calendar"><div className="month-weekdays">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid">{days.map((day) => { const items = appointments.filter((item) => isSameDay(new Date(item.startAt), day)); return <div key={day.toISOString()} className={`month-day ${!isSameMonth(day, cursor) ? "muted" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}><div className="month-day__number"><span>{format(day, "d")}</span><small>{format(day, "MMM", { locale: tr })}</small></div><div className="month-events">{items.slice(0, 3).map((item) => <button key={item.id} className={STATUS[item.status].className} onClick={() => onSelect(item)}><time>{format(new Date(item.startAt), "HH:mm")}</time><span>{item.customerName}</span></button>)}{items.length > 3 && <span className="month-more">+{items.length - 3} randevu</span>}</div></div>; })}</div></div>; }
function TimeGrid({ days, appointments, onSelect }: { days: Date[]; appointments: Appointment[]; onSelect: (item: Appointment) => void }) { return <div className="time-grid-scroll"><div className="time-grid" style={{ "--calendar-columns": days.length } as CSSProperties}><div className="time-grid__corner" />{days.map((day) => <div key={`head-${day.toISOString()}`} className={`time-grid__day ${isSameDay(day, new Date()) ? "today" : ""}`}><span>{format(day, "EEE", { locale: tr })}</span><strong>{format(day, "d")}</strong></div>)}{HOURS.map((hour) => <TimeRow key={hour} hour={hour} days={days} appointments={appointments} onSelect={onSelect} />)}</div></div>; }
function TimeRow({ hour, days, appointments, onSelect }: { hour: number; days: Date[]; appointments: Appointment[]; onSelect: (item: Appointment) => void }) { return <><div className="time-label">{String(hour).padStart(2, "0")}:00</div>{days.map((day) => { const items = appointments.filter((item) => isSameDay(new Date(item.startAt), day) && new Date(item.startAt).getHours() === hour); return <div key={`${day.toISOString()}-${hour}`} className="time-cell">{items.map((item) => <button key={item.id} className={`calendar-event ${STATUS[item.status].className}`} onClick={() => onSelect(item)}><div><time>{format(new Date(item.startAt), "HH:mm")}</time><span>{STATUS[item.status].label}</span></div><strong>{item.customerName}</strong><small>{item.serviceName || "Randevu"}</small></button>)}</div>; })}</>; }
function AppointmentDrawer({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) { return <div className="calendar-drawer-backdrop" role="presentation" onMouseDown={onClose}><aside className="calendar-drawer" role="dialog" aria-modal="true" aria-labelledby="calendar-appointment-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="drawer-close" onClick={onClose} aria-label="Detayı kapat">×</button><div className={`drawer-status ${STATUS[appointment.status].className}`}>{STATUS[appointment.status].label}</div><h2 id="calendar-appointment-title">{appointment.customerName}</h2><p>{appointment.serviceName || "Hizmet bilgisi girilmemiş"}</p><div className="drawer-details"><div><Clock3 size={18} /><span><small>Tarih ve saat</small><strong>{format(new Date(appointment.startAt), "d MMMM yyyy, HH:mm", { locale: tr })} – {format(new Date(appointment.endAt), "HH:mm")}</strong></span></div><div><UserRound size={18} /><span><small>Çalışan</small><strong>{appointment.staffName || "Atanmamış"}</strong></span></div><div><CreditCard size={18} /><span><small>Ödeme</small><strong>{appointment.paymentStatus === "paid" ? "Ödendi" : appointment.paymentStatus === "deposit_paid" ? "Kapora ödendi" : "Ödeme bekliyor"}</strong></span></div></div>{appointment.notes && <div className="drawer-note"><small>Randevu notu</small><p>{appointment.notes}</p></div>}<Link className="drawer-primary" href={`/dashboard/randevular?appointment=${encodeURIComponent(appointment.id)}`}>Randevuyu yönet</Link></aside></div>; }
function MiniMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) { return <div>{icon}<span><small>{label}</small><strong>{value}</strong></span></div>; }
function CalendarSkeleton() { return <div className="calendar-skeleton"><div /><div /><div /><div /></div>; }
function eachDay(start: Date, end: Date) { const days: Date[] = []; for (let day = start; day <= end; day = addDays(day, 1)) days.push(day); return days; }
function getRange(cursor: Date, view: ViewMode) { if (view === "gun") return { start: startOfDay(cursor), end: startOfDay(cursor) }; if (view === "hafta") return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) }; const monthStart = startOfMonth(cursor), monthEnd = endOfMonth(cursor); return { start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) }; }
function rangeTitle(cursor: Date, view: ViewMode) { if (view === "gun") return format(cursor, "d MMMM yyyy, EEEE", { locale: tr }); if (view === "ay") return format(cursor, "MMMM yyyy", { locale: tr }); const start = startOfWeek(cursor, { weekStartsOn: 1 }), end = endOfWeek(cursor, { weekStartsOn: 1 }); return `${format(start, "d MMM", { locale: tr })} – ${format(end, "d MMM yyyy", { locale: tr })}`; }
