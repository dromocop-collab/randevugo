"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { addDays } from "date-fns";
import { CalendarDays, Clock3, Plus, Save, Scissors, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { createDashboardAppointment, updateDashboardAppointment } from "@/features/appointments/appointment-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import type { Appointment } from "@/types/appointments";
import { millisToZonedDateTime, zonedDateTimeToMillis } from "@/lib/time/zoned";
import { Button, Field, FormGrid, Input, NativeSelect, Sheet } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./quick-appointment-modal.module.css";

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

/** Hızlı randevu ekleme/düzenleme. Tarih+saat zorunlu; müşteri, işlem ve kişi isteğe bağlı. */
export function QuickAppointmentModal({ businessId, open, initialStartAt, appointment, onClose, onCreated }: Props) {
  const formId = useId();
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

  const quickDays = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const day = addDays(today, offset);
      return { value: millisToZonedDateTime(day.getTime()).date, label: offset === 0 ? "Bugün" : offset === 1 ? "Yarın" : new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric" }).format(day) };
    });
  }, []);
  const selectedService = services.find((service) => service.id === serviceId);

  function requestClose() {
    if (!saving) onClose();
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

  return (
    <Sheet
      open={open}
      onClose={requestClose}
      dismissible={!saving}
      title={appointment ? "Randevuyu düzenle" : "Yeni randevu"}
      description="Tarih ve saat yeterli. Diğer bilgileri şimdi veya daha sonra ekleyebilirsiniz."
      footer={<>
        <Button variant="secondary" onClick={requestClose} disabled={saving}>Vazgeç</Button>
        <Button type="submit" form={formId} variant="primary" icon={appointment ? Save : Plus} loading={saving} disabled={!date || !time}>
          {saving ? "Kaydediliyor…" : appointment ? "Değişiklikleri kaydet" : "Randevuyu kaydet"}
        </Button>
      </>}
    >
      <form id={formId} onSubmit={submit} className={styles.form} aria-busy={saving}>
        <div className={styles.quickDays} role="group" aria-label="Hızlı tarih seçimi">
          {quickDays.map((day) => (
            <button key={day.value} type="button" className={cn(styles.dayChip, date === day.value && styles.dayChipActive)} aria-pressed={date === day.value} onClick={() => setDate(day.value)}>{day.label}</button>
          ))}
        </div>
        <FormGrid>
          <Field label={<span className={styles.label}><CalendarDays size={14} aria-hidden /> Tarih <b>*</b></span>}>
            <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label={<span className={styles.label}><Clock3 size={14} aria-hidden /> Saat <b>*</b></span>}>
            <Input type="time" required step={900} value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
        </FormGrid>
        <Field label={<span className={styles.label}><UserRound size={14} aria-hidden /> Müşteri adı <small>İsteğe bağlı</small></span>}>
          <Input value={customerName} maxLength={80} placeholder="Örn. Ayşe Yılmaz" autoComplete="off" onChange={(event) => setCustomerName(event.target.value)} />
        </Field>
        <FormGrid>
          <Field label={<span className={styles.label}><Scissors size={14} aria-hidden /> İşlem <small>İsteğe bağlı</small></span>} hint={selectedService ? `${selectedService.durationMinutes} dk · ${selectedService.price.toLocaleString("tr-TR")} ₺` : undefined}>
            <NativeSelect value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">İşlem seçmeden devam et</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} dk</option>)}
            </NativeSelect>
          </Field>
          <Field label={<span className={styles.label}><UsersRound size={14} aria-hidden /> Kişi <small>İsteğe bağlı</small></span>}>
            <NativeSelect value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Kişi atamadan devam et</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.position ? ` · ${item.position}` : ""}</option>)}
            </NativeSelect>
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
