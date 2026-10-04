"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock3, Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { createDashboardAppointment, updateDashboardAppointment } from "@/features/appointments/appointment-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import type { Appointment } from "@/types/appointments";
import { millisToZonedDateTime, zonedDateTimeToMillis } from "@/lib/time/zoned";

interface Props {
  businessId: string;
  open: boolean;
  initialStartAt?: Date;
  appointment?: Appointment;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}


function defaultStart() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 30) * 30);
  return date;
}

export function QuickAppointmentModal({ businessId, open, initialStartAt, appointment, onClose, onCreated }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  useEffect(() => {
    if (!open) return;
    const start = appointment ? new Date(appointment.startAt) : initialStartAt ?? defaultStart();
    queueMicrotask(() => {
      // Ön doldurma da işletme saatiyle yapılır (tarayıcı saat diliminden bağımsız).
      const zoned = millisToZonedDateTime(start.getTime());
      setDate(zoned.date);
      setTime(zoned.time);
      setCustomerName(appointment?.customerName === "Rezerve saat" ? "" : appointment?.customerName ?? "");
      setServiceId(appointment?.serviceId ?? "");
      setStaffId(appointment?.staffId ?? "");
    });
    Promise.all([listServices(businessId, true), listStaff(businessId, true)])
      .then(([nextServices, nextStaff]) => {
        setServices(nextServices);
        setStaff(nextStaff);
      })
      .catch(() => toast.error("Hizmet ve çalışan listesi alınamadı."));
  }, [appointment, businessId, initialStartAt, open]);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const previousRootStyles = {
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !savingRef.current) {
        if (dialogRef.current?.querySelector(".sr-select__trigger[aria-expanded='true']")) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      )).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLInputElement>("input[type='date']")?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      Object.assign(body.style, previousBodyStyles);
      Object.assign(root.style, previousRootStyles);
      window.scrollTo(0, scrollY);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  const serviceOptions = useMemo(() => [
    { value: "", label: "İşlem seçmeden devam et", description: "İsterseniz daha sonra ekleyebilirsiniz" },
    ...services.map((service) => ({
      value: service.id,
      label: service.name,
      description: `${service.durationMinutes} dk · ${service.price.toLocaleString("tr-TR")} ₺`,
    })),
  ], [services]);
  const staffOptions = useMemo(() => [
    { value: "", label: "Kişi atamadan devam et", description: "Randevu genel takvimde görünür" },
    ...staff.map((item) => ({ value: item.id, label: item.fullName, description: item.position || "Çalışan" })),
  ], [staff]);

  if (!open) return null;

  function requestClose() {
    if (!savingRef.current) onCloseRef.current();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || !time) {
      toast.error("Lütfen randevu tarihini ve saatini seçin.");
      return;
    }
    // Tarih/saat işletme saatiyle (Europe/Istanbul) yorumlanır; tarayıcının saat dilimi farklı olsa da doğru kaydedilir.
    const startAt = new Date(zonedDateTimeToMillis(date, time));
    if (Number.isNaN(startAt.getTime())) {
      toast.error("Tarih veya saat geçersiz.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        businessId,
        startAtMillis: startAt.getTime(),
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(staffId ? { staffId } : {}),
      };
      if (appointment) await updateDashboardAppointment({ ...input, appointmentId: appointment.id });
      else await createDashboardAppointment(input);
      toast.success(appointment ? "Randevu güncellendi." : "Randevu takvime eklendi; seçilen saat artık dolu görünecek.");
      await onCreated?.();
      onClose();
    } catch (error) {
      toast.error(userFacingError(error, "Randevu kaydedilemedi. Lütfen yeniden deneyin."));
    } finally {
      setSaving(false);
    }
  }

  return createPortal((
    <div className="quick-appointment-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        ref={dialogRef}
        className="quick-appointment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-appointment-title"
        aria-describedby="quick-appointment-description"
        aria-busy={saving}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span className="quick-appointment-icon"><CalendarDays size={23} /></span>
          <div className="quick-appointment-heading">
            <span>{appointment ? "HIZLI DÜZENLEME" : "HIZLI KAYIT"}</span>
            <h2 id="quick-appointment-title">{appointment ? "Randevuyu düzenle" : "Takvime randevu ekle"}</h2>
            <p id="quick-appointment-description">Tarih ve saati seçin. Diğer bilgileri şimdi veya daha sonra ekleyebilirsiniz.</p>
            <div className="quick-appointment-hints" aria-label="Kayıt bilgisi">
              <span><Clock3 size={12} /> 1 dakikada hazır</span>
              <span>Tarih + saat yeterli</span>
            </div>
          </div>
          <button type="button" onClick={requestClose} disabled={saving} aria-label="Pencereyi kapat"><X size={20} /></button>
        </header>

        <form onSubmit={submit}>
          <div className="quick-appointment-time-grid">
            <label>
              <span><CalendarDays size={15} /> Tarih <b>*</b></span>
              <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              <span><Clock3 size={15} /> Saat <b>*</b></span>
              <input type="time" required step="900" value={time} onChange={(event) => setTime(event.target.value)} />
            </label>
          </div>
          <label className="quick-appointment-name">
            <span><UserRound size={15} /> Müşteri adı <small>İsteğe bağlı</small></span>
            <input value={customerName} maxLength={80} placeholder="Örn. Ayşe Yılmaz" onChange={(event) => setCustomerName(event.target.value)} />
          </label>
          <div className="quick-appointment-selects">
            <Select inlineMenu label="İşlem (isteğe bağlı)" options={serviceOptions} value={serviceId} onChange={(event) => setServiceId(event.target.value)} />
            <Select inlineMenu label="Kişi (isteğe bağlı)" options={staffOptions} value={staffId} onChange={(event) => setStaffId(event.target.value)} />
          </div>
          <footer>
            <button type="button" className="quick-appointment-cancel" onClick={requestClose} disabled={saving}>Vazgeç</button>
            <button type="submit" className="quick-appointment-save" disabled={saving || !date || !time}>
              <Plus size={17} /> {saving ? "Kaydediliyor…" : appointment ? "Değişiklikleri kaydet" : "Randevuyu kaydet"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  ), document.body);
}
