"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, LoaderCircle, X } from "lucide-react";
import { listAvailableSlots, type AvailableAppointmentSlot } from "@/features/appointments/appointment-repository";
import { appointmentChangeError } from "@/features/appointments/appointment-change";
import { DEFAULT_TIME_ZONE, millisToZonedDateTime } from "@/lib/time/zoned";

const DAY_COUNT = 14;

type Props = {
  businessId: string;
  serviceId: string;
  /** Mevcut çalışan; boşsa tüm uygun çalışanların saatleri listelenir. */
  staffId?: string;
  currentStartAt: string;
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

function chipLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return {
    weekday: date.toLocaleDateString("tr-TR", { weekday: "short", timeZone: "UTC" }),
    day: date.toLocaleDateString("tr-TR", { day: "2-digit", timeZone: "UTC" }),
    month: date.toLocaleDateString("tr-TR", { month: "short", timeZone: "UTC" }),
  };
}

export function RescheduleDialog({ businessId, serviceId, staffId, currentStartAt, title, subtitle, timeZone = DEFAULT_TIME_ZONE, maximumBookingDaysAhead, onClose, onConfirm }: Props) {
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
    listAvailableSlots({ businessId, serviceId, ...(staffId ? { staffId } : {}), date })
      .then((slots) => { if (active) setLoaded({ date, slots: slots.filter((slot) => slot.startAtMillis !== currentStartMillis), error: null }); })
      .catch((reason) => { if (active) setLoaded({ date, slots: [], error: appointmentChangeError(reason, "Müsait saatler yüklenemedi. Lütfen yeniden deneyin.") }); });
    return () => { active = false; };
  }, [businessId, serviceId, staffId, date, currentStartMillis]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busyRef.current) onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true); busyRef.current = true; setError(null);
    try { await onConfirm(selected); }
    catch (reason) { setError(appointmentChangeError(reason, "Randevu saati değiştirilemedi. Lütfen yeniden deneyin.")); }
    finally { setBusy(false); busyRef.current = false; }
  }

  const slots = loading ? [] : loaded?.slots ?? [];
  const selectedDay = selected ? new Date(selected.startAtMillis).toLocaleDateString("tr-TR", { timeZone, day: "2-digit", month: "short" }) : "";

  return <div className="account-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className="relative flex max-h-[min(92vh,760px)] w-[min(560px,100%)] flex-col overflow-hidden rounded-[27px] bg-[#fbfaf5] text-[#0f2a1f] shadow-[0_40px_100px_rgb(0_0_0/.35)]">
      <header className="flex items-start gap-3 border-b border-[#e3e8dc] p-5 pr-14 sm:p-6 sm:pr-16">
        <i className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e6f4ea] text-[#0b6b45]"><CalendarClock size={21}/></i>
        <div className="min-w-0">
          <span className="text-[9px] font-black tracking-[.14em] text-[#3d8a62]">SAATİ DEĞİŞTİR</span>
          <h2 id="reschedule-title" className="truncate text-lg font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#52675c]">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Kapat" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-[#edf2ed] text-[#40594c] disabled:opacity-50"><X size={18}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <p className="text-[10px] font-black tracking-[.14em] text-[#586c61]">TARİH</p>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Tarih seçin">
          {days.map((key) => {
            const label = chipLabel(key);
            const active = key === date;
            return <button key={key} type="button" role="option" aria-selected={active} onClick={() => { setDate(key); setSelected(null); setError(null); }} className={`flex w-[62px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 text-center transition ${active ? "border-[#0b6b45] bg-[#0b6b45] text-white" : "border-[#d8e4d4] bg-white text-[#0f2a1f] hover:border-[#0b6b45]"}`}>
              <small className={`text-[10px] font-bold uppercase ${active ? "text-white/80" : "text-[#586c61]"}`}>{label.weekday}</small>
              <b className="text-lg leading-tight">{label.day}</b>
              <small className={`text-[10px] ${active ? "text-white/80" : "text-[#586c61]"}`}>{label.month}</small>
            </button>;
          })}
        </div>
        <p className="mt-4 text-[10px] font-black tracking-[.14em] text-[#586c61]">MÜSAİT SAATLER</p>
        {loading ? <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Müsait saatler yükleniyor">{Array.from({ length: 10 }).map((_, index) => <i key={index} className="h-10 animate-pulse rounded-xl bg-[#e9eee6]"/>)}</div>
          : loaded?.error ? <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{loaded.error}</p>
          : slots.length === 0 ? <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">Bu tarihte müsait saat yok. Lütfen başka bir gün seçin.</p>
          : <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">{slots.map((slot) => {
            const active = selected?.startAtMillis === slot.startAtMillis;
            return <button key={slot.startAtMillis} type="button" onClick={() => { setSelected(slot); setError(null); }} aria-pressed={active} className={`rounded-xl border py-2.5 text-sm font-semibold transition ${active ? "border-[#0b6b45] bg-[#0b6b45] text-white" : "border-[#d8e4d4] bg-white hover:border-[#0b6b45]"}`}>{slot.label}</button>;
          })}</div>}
        {error && <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
      </div>
      <footer className="grid grid-cols-2 gap-2 border-t border-[#e3e8dc] p-4 sm:p-5">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-[#edf2ed] p-3 text-xs font-extrabold text-[#41594c] disabled:opacity-50">Vazgeç</button>
        <button type="button" onClick={() => void confirm()} disabled={!selected || busy} className="flex items-center justify-center gap-2 rounded-xl bg-[#0b6b45] p-3 text-xs font-extrabold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin"/> : selected ? `${selectedDay} ${selected.label} · Onayla` : "Saat seçin"}</button>
      </footer>
    </section>
  </div>;
}
