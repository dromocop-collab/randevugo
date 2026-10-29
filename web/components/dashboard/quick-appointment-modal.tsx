"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { addDays } from "date-fns";
import { CalendarDays, Clock3, Layers, Plus, Save, Scissors, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { createDashboardAppointment, updateDashboardAppointment } from "@/features/appointments/appointment-repository";
import { listServices } from "@/features/services/service-repository";
import { localizedServiceName, localizedVariantName, moneyFormatter, serviceForStaff, servicePriceLabel, variantPriceLabel, variantsOf } from "@/features/services/service-pricing";
import { listStaff } from "@/features/staff/staff-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import type { Appointment } from "@/types/appointments";
import { millisToZonedDateTime, zonedDateTimeToMillis } from "@/lib/time/zoned";
import { Button, Field, FormGrid, Input, NativeSelect, Sheet } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
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
  const t = useT();
  const locale = useIntlLocale();
  const siteLocale = useLocale();
  const money = useMemo(() => moneyFormatter(locale), [locale]);
  const formId = useId();
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [serviceId, setServiceId] = useState("");
  // Seçenekli hizmette seçilen seçenek (yalnız yeni randevuda gönderilir; düzenlemede sunucu desteklemiyor).
  const [variantId, setVariantId] = useState("");
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
      setCustomerName(appointment?.customerName === "Rezerve saat" ? "" : appointment?.customerName ?? ""); // i18n-ignore (veri değeri)
      setServiceId(appointment?.serviceId ?? "");
      setVariantId(appointment?.serviceVariantId ?? "");
      setStaffId(appointment?.staffId ?? "");
    });
    Promise.all([listServices(businessId, true), listStaff(businessId, true)])
      .then(([nextServices, nextStaff]) => {
        setServices(nextServices);
        setStaff(nextStaff);
      })
      .catch(() => toast.error(t("Hizmet ve çalışan listesi alınamadı.")));
  }, [appointment, businessId, initialStartAt, open, t]);

  const quickDays = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const day = addDays(today, offset);
      return { value: millisToZonedDateTime(day.getTime()).date, label: offset === 0 ? t("Bugün") : offset === 1 ? t("Yarın") : new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(day) };
    });
  }, [locale, t]);
  const rawService = services.find((service) => service.id === serviceId);
  // Seçili çalışanın bu hizmete özel süre/fiyat/fiyat tipi (sunucu randevuyu bununla yazar).
  const selectedService = rawService ? serviceForStaff(rawService, staff.find((member) => member.id === staffId)) : undefined;
  const variants = variantsOf(rawService);
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? (appointment ? undefined : variants[0]);
  // Düzenlemede mevcut seçenek yalnız gösterilir.
  const keptVariantName = appointment && appointment.serviceId === serviceId ? appointment.serviceVariantName : undefined;
  const serviceHint = selectedService
    ? selectedVariant && !appointment
      ? t("{minutes} dk · {price}", { minutes: selectedVariant.durationMinutes, price: selectedService.priceType === "quote" ? t("Fiyat görüşmede") : variantPriceLabel(selectedService, selectedVariant, t, money) })
      : t("{minutes} dk · {price}", { minutes: selectedService.durationMinutes, price: servicePriceLabel(selectedService, t, money) })
    : undefined;

  function changeService(nextId: string) {
    setServiceId(nextId);
    setVariantId(variantsOf(services.find((service) => service.id === nextId))[0]?.id ?? "");
  }

  function requestClose() {
    if (!saving) onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || !time) {
      toast.error(t("Lütfen randevu tarihini ve saatini seçin."));
      return;
    }
    // Tarih/saat işletme saatiyle (Europe/Istanbul) yorumlanır; tarayıcının saat dilimi farklı olsa da doğru kaydedilir.
    const startAt = new Date(zonedDateTimeToMillis(date, time));
    if (Number.isNaN(startAt.getTime())) {
      toast.error(t("Tarih veya saat geçersiz."));
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
      else await createDashboardAppointment({ ...input, ...(serviceId && selectedVariant ? { variantId: selectedVariant.id } : {}) });
      toast.success(appointment ? t("Randevu güncellendi.") : t("Randevu takvime eklendi; seçilen saat artık dolu görünecek."));
      await onCreated?.();
      onClose();
    } catch (error) {
      toast.error(t(userFacingError(error, tk("Randevu kaydedilemedi. Lütfen yeniden deneyin."))));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={requestClose}
      dismissible={!saving}
      title={appointment ? t("Randevuyu düzenle") : t("Yeni randevu")}
      description={t("Tarih ve saat yeterli. Diğer bilgileri şimdi veya daha sonra ekleyebilirsiniz.")}
      footer={<>
        <Button variant="secondary" onClick={requestClose} disabled={saving}>{t("Vazgeç")}</Button>
        <Button type="submit" form={formId} variant="primary" icon={appointment ? Save : Plus} loading={saving} disabled={!date || !time}>
          {saving ? t("Kaydediliyor…") : appointment ? t("Değişiklikleri kaydet") : t("Randevuyu kaydet")}
        </Button>
      </>}
    >
      <form id={formId} onSubmit={submit} className={styles.form} aria-busy={saving}>
        <div className={styles.quickDays} role="group" aria-label={t("Hızlı tarih seçimi")}>
          {quickDays.map((day) => (
            <button key={day.value} type="button" className={cn(styles.dayChip, date === day.value && styles.dayChipActive)} aria-pressed={date === day.value} onClick={() => setDate(day.value)}>{day.label}</button>
          ))}
        </div>
        <FormGrid>
          <Field label={<span className={styles.label}><CalendarDays size={14} aria-hidden /> {t("Tarih")} <b>*</b></span>}>
            <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label={<span className={styles.label}><Clock3 size={14} aria-hidden /> {t("Saat")} <b>*</b></span>}>
            <Input type="time" required step={900} value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
        </FormGrid>
        <Field label={<span className={styles.label}><UserRound size={14} aria-hidden /> {t("Müşteri adı")} <small>{t("İsteğe bağlı")}</small></span>}>
          <Input value={customerName} maxLength={80} placeholder={t("Örn. Ayşe Yılmaz")} autoComplete="off" onChange={(event) => setCustomerName(event.target.value)} />
        </Field>
        <FormGrid>
          <Field label={<span className={styles.label}><Scissors size={14} aria-hidden /> {t("İşlem")} <small>{t("İsteğe bağlı")}</small></span>} hint={serviceHint}>
            <NativeSelect value={serviceId} onChange={(event) => changeService(event.target.value)}>
              <option value="">{t("İşlem seçmeden devam et")}</option>
              {services.map((service) => <option key={service.id} value={service.id}>{localizedServiceName(service, siteLocale)} · {t("{minutes} dk", { minutes: service.durationMinutes })}</option>)}
            </NativeSelect>
          </Field>
          <Field label={<span className={styles.label}><UsersRound size={14} aria-hidden /> {t("Kişi")} <small>{t("İsteğe bağlı")}</small></span>}>
            <NativeSelect value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">{t("Kişi atamadan devam et")}</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.position ? ` · ${item.position}` : ""}</option>)}
            </NativeSelect>
          </Field>
        </FormGrid>
        {selectedService && !appointment && variants.length > 0 && (
          <Field label={<span className={styles.label}><Layers size={14} aria-hidden /> {t("Seçenek", { ctx: "hizmet" })}</span>}>
            <NativeSelect value={selectedVariant?.id ?? ""} onChange={(event) => setVariantId(event.target.value)}>
              {variants.map((variant) => <option key={variant.id} value={variant.id}>{localizedVariantName(selectedService, variant, siteLocale)} · {t("{minutes} dk", { minutes: variant.durationMinutes })} · {variantPriceLabel(selectedService, variant, t, money)}</option>)}
            </NativeSelect>
          </Field>
        )}
        {keptVariantName && (
          <Field label={<span className={styles.label}><Layers size={14} aria-hidden /> {t("Seçenek", { ctx: "hizmet" })}</span>} hint={t("Seçenek düzenlemede değiştirilemez; farklı seçenek için yeni randevu oluşturun.")}>
            <Input value={keptVariantName} readOnly disabled />
          </Field>
        )}
      </form>
    </Sheet>
  );
}
