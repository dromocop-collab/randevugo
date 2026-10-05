"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { CheckCircle2, ChevronLeft, ChevronRight, MoonStar, ShieldCheck, Sun, Sunrise, X } from "lucide-react";
import type { AvailableAppointmentSlot } from "@/features/appointments/appointment-repository";
import { dateFromIso, dayPartOf, type DayPart } from "./booking-utils";
import s from "./booking.module.css";

/* ━━━ Alt sayfa (iOS benzeri) ━━━ */
export function BottomSheet({
  eyebrow,
  title,
  description,
  onClose,
  children,
  footer,
  busy = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { onCloseRef.current = onClose; busyRef.current = busy; });

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    const focusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const focusTimer = window.setTimeout(() => (focusable()[1] ?? focusable()[0])?.focus({ preventScroll: true }), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) { onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={`${s.tokens} ${s.sheetBackdrop}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={sheetRef} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={s.grabber} aria-hidden="true" />
        <header className={s.sheetHead}>
          <div>
            {eyebrow && <small>{eyebrow}</small>}
            <h3 id={titleId}>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose} disabled={busy} aria-label="Kapat"><X size={19} /></button>
        </header>
        <div className={s.sheetBody}>{children}</div>
        {footer && <footer className={s.sheetFoot}>{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

/* ━━━ Yatay tarih şeridi ━━━ */
export function DateStrip({
  days,
  value,
  today,
  counts,
  loading,
  onSelect,
}: {
  days: string[];
  value: string;
  today: string;
  counts: Record<string, number>;
  loading: boolean;
  onSelect: (value: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const tomorrow = days[days.indexOf(today) + 1];

  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-date="${value}"]`);
    if (!strip || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: Math.max(0, chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2), behavior: reduce ? "auto" : "smooth" });
  }, [value]);

  return <div ref={stripRef} className={s.dateStrip} role="group" aria-label="Tarih seçin">
    {days.map((iso) => {
      const date = dateFromIso(iso);
      const known = iso in counts;
      const count = counts[iso] ?? 0;
      const disabled = known && count === 0 && iso !== value;
      const selected = iso === value;
      const dow = iso === today ? "Bugün" : iso === tomorrow ? "Yarın" : format(date, "EEE", { locale: tr });
      const stateClass = !known ? (loading ? s.dateLoading : "") : count > 3 ? s.dateAvail : count > 0 ? s.dateFew : "";
      const availabilityText = !known ? (loading ? "müsaitlik yükleniyor" : "seçince saatler kontrol edilir") : count > 0 ? `${count} müsait saat` : "müsait saat yok";
      return <button
        key={iso}
        type="button"
        data-date={iso}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${format(date, "d MMMM EEEE", { locale: tr })}, ${availabilityText}`}
        className={`${s.dateChip} ${stateClass} ${selected ? s.dateChipOn : ""}`}
        onClick={() => onSelect(iso)}
      >
        <span className={s.dateDow}>{dow}</span>
        <span className={s.dateNum}>{format(date, "d")}</span>
        <span className={s.dateMon}>{format(date, "MMM", { locale: tr })}</span>
        <i className={s.dateDot} aria-hidden="true" />
      </button>;
    })}
  </div>;
}

/* ━━━ Saat grupları ━━━ */
const DAY_PARTS: Array<{ key: DayPart; label: string; icon: typeof Sun }> = [
  { key: "morning", label: "Sabah", icon: Sunrise },
  { key: "noon", label: "Öğle", icon: Sun },
  { key: "evening", label: "Akşam", icon: MoonStar },
];

export function SlotGroups({ slots, value, onSelect }: { slots: AvailableAppointmentSlot[]; value: string; onSelect: (slot: AvailableAppointmentSlot) => void }) {
  return <>
    {DAY_PARTS.map((part, partIndex) => {
      const items = slots.filter((slot) => dayPartOf(slot.label) === part.key);
      if (!items.length) return null;
      const Icon = part.icon;
      return <div key={part.key} className={s.slotGroup} style={{ animationDelay: `${partIndex * 70}ms` }} role="group" aria-label={`${part.label} saatleri`}>
        <div className={s.slotGroupHead}><i><Icon size={16} /></i>{part.label}<small>{items.length} saat</small></div>
        <div className={s.slotGrid}>
          {items.map((slot) => <button
            key={slot.startAtMillis}
            type="button"
            aria-pressed={value === slot.label}
            className={`${s.slot} ${value === slot.label ? s.slotOn : ""}`}
            onClick={() => onSelect(slot)}
          >{slot.label}</button>)}
        </div>
      </div>;
    })}
  </>;
}

/* ━━━ Aylık takvim (alt sayfa) ━━━ */
export function CalendarSheet({
  value,
  min,
  max,
  counts,
  loading,
  onRangeChange,
  onSelect,
  onClose,
}: {
  value: string;
  min: string;
  max: string;
  counts: Record<string, number>;
  loading: boolean;
  onRangeChange: (start: string, end: string) => void;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(dateFromIso(value)));
  const minMonth = startOfMonth(dateFromIso(min));
  const maxMonth = startOfMonth(dateFromIso(max));
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }) });
  const gridStart = format(days[0], "yyyy-MM-dd");
  const gridEnd = format(days[days.length - 1], "yyyy-MM-dd");
  const rangeStart = gridStart < min ? min : gridStart;
  const rangeEnd = gridEnd > max ? max : gridEnd;

  useEffect(() => {
    if (rangeStart <= rangeEnd) onRangeChange(rangeStart, rangeEnd);
  }, [onRangeChange, rangeEnd, rangeStart]);

  return <BottomSheet
    eyebrow="TÜM TARİHLER"
    title={format(visibleMonth, "MMMM yyyy", { locale: tr })}
    onClose={onClose}
    footer={<>
      <span className={s.calLegend}>
        <span><i style={{ background: "var(--soft)", border: "1px solid var(--line-strong)" }} />Müsait</span>
        <span><i style={{ background: "var(--green-2)" }} />Seçili</span>
        {loading && <b>Yükleniyor…</b>}
      </span>
      <button type="button" className={s.iconBtn} onClick={() => setVisibleMonth((month) => addMonths(month, -1))} disabled={visibleMonth <= minMonth} aria-label="Önceki ay"><ChevronLeft size={18} /></button>
      <button type="button" className={s.iconBtn} onClick={() => setVisibleMonth((month) => addMonths(month, 1))} disabled={visibleMonth >= maxMonth} aria-label="Sonraki ay"><ChevronRight size={18} /></button>
    </>}
  >
    <div className={s.calWeek} aria-hidden="true">{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className={s.calDays} aria-busy={loading}>
      {days.map((day) => {
        const iso = format(day, "yyyy-MM-dd");
        const outside = day.getMonth() !== visibleMonth.getMonth();
        const outsideRange = iso < min || iso > max;
        const known = iso in counts;
        const count = counts[iso] ?? 0;
        const disabled = outsideRange || (known && count === 0);
        const selected = iso === value;
        const label = outsideRange ? "randevu aralığı dışında" : !known ? (loading ? "müsaitlik yükleniyor" : "seçince kontrol edilir") : count > 0 ? `${count} müsait saat` : "müsait saat yok";
        return <button
          key={iso}
          type="button"
          disabled={disabled}
          aria-pressed={selected}
          aria-label={`${format(day, "d MMMM yyyy EEEE", { locale: tr })}, ${label}`}
          className={`${s.calDay} ${outside ? s.calOutside : ""} ${iso === min ? s.calToday : ""} ${known && count > 0 ? s.calAvail : ""} ${selected ? s.calOn : ""}`}
          onClick={() => { onSelect(iso); onClose(); }}
        >
          {format(day, "d")}
          {known && count > 0 && <small>{count}</small>}
        </button>;
      })}
    </div>
  </BottomSheet>;
}

/* ━━━ KVKK aydınlatma (alt sayfa) ━━━ */
export function PrivacySheet({ onClose }: { onClose: () => void }) {
  const items = [
    ["Hangi bilgiler işlenir?", "Telefon numaran; işletmenin ayarına göre ad-soyad, e-posta ve isteğe bağlı randevu notun; seçtiğin hizmet, çalışan, tarih ve saat bilgileri."],
    ["Neden işlenir?", "Randevuyu oluşturmak ve yönetmek, telefonunu doğrulamak, çakışmayı önlemek, randevu bildirimlerini iletmek ve işlem güvenliğini sağlamak için."],
    ["Kimlerle paylaşılır?", "Randevunun yürütülmesi için seçtiğin işletmeyle; hizmetin çalışması için gerekli barındırma, doğrulama, SMS/e-posta ve güvenlik sağlayıcılarıyla amaçla sınırlı olarak."],
    ["Hukuki sebep ve saklama", "Veriler sözleşmenin kurulması/ifası, hukuki yükümlülük, hakkın tesisi ve meşru menfaat sebeplerine dayanılarak; amaç ve yasal saklama yükümlülüğü sürdüğü kadar işlenir."],
  ];
  return <BottomSheet
    eyebrow="KVKK · RANDEVU SÜRECİ"
    title="Randevu Aydınlatma Metni"
    description="Bilgilerinin neden ve nasıl işlendiğini sade biçimde incele."
    onClose={onClose}
    footer={<>
      <a className={s.textLink} href="/kvkk#randevu-aydinlatmasi" target="_blank" rel="noreferrer">Tam KVKK metni</a>
      <button type="button" className={s.primary} onClick={onClose}>Anladım <CheckCircle2 size={17} /></button>
    </>}
  >
    {items.map(([title, text], index) => <article key={title} className={s.privacyItem}>
      <b>{String(index + 1).padStart(2, "0")}</b>
      <div><h4>{title}</h4><p>{text}</p></div>
    </article>)}
    <aside className={s.privacyAside}><ShieldCheck size={17} /><p style={{ margin: 0 }}>Telefon doğrulama kodu yalnızca güvenlik içindir. Bu bilgilendirme pazarlama izni veya açık rıza talebi değildir.</p></aside>
  </BottomSheet>;
}
