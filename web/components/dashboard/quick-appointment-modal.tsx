"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

interface Props {
  businessId: string;
  open: boolean;
  initialStartAt?: Date;
  appointment?: Appointment;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function defaultStart() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 30) * 30);
  return date;
}

export function QuickAppointmentModal({ businessId, open, initialStartAt, appointment, onClose, onCreated }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = appointment ? new Date(appointment.startAt) : initialStartAt ?? defaultStart();
    queueMicrotask(() => {
      setDate(localDateValue(start));
      setTime(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
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
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || !time) {
      toast.error("Lütfen randevu tarihini ve saatini seçin.");
      return;
    }
    const startAt = new Date(`${date}T${time}:00`);
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
    <div className="quick-appointment-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="quick-appointment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-appointment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span className="quick-appointment-icon"><CalendarDays size={23} /></span>
          <div>
            <span>{appointment ? "HIZLI DÜZENLEME" : "HIZLI KAYIT"}</span>
            <h2 id="quick-appointment-title">{appointment ? "Randevuyu düzenle" : "Takvime randevu ekle"}</h2>
            <p>Tarih ve saati seçin. Diğer bilgileri şimdi veya daha sonra ekleyebilirsiniz.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Pencereyi kapat"><X size={20} /></button>
        </header>

        <form onSubmit={submit}>
          <div className="quick-appointment-time-grid">
            <label>
              <span><CalendarDays size={15} /> Tarih <b>*</b></span>
              <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              <span><Clock3 size={15} /> Saat <b>*</b></span>
              <input type="time" required step="900" value={time} onChange={(event) => setTime(event.target.value)} autoFocus />
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
            <button type="button" className="quick-appointment-cancel" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="quick-appointment-save" disabled={saving || !date || !time}>
              <Plus size={17} /> {saving ? "Kaydediliyor…" : appointment ? "Değişiklikleri kaydet" : "Randevuyu kaydet"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  ), document.body);
}
