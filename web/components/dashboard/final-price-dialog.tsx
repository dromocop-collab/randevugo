"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button, Field, Input, Sheet } from "@/components/dashboard/ui";
import { appointmentPriceLabel, extrasTotal, localizedAppointmentServiceName, moneyFormatter } from "@/features/services/service-pricing";
import { useIntlLocale, useLocale, useT } from "@/i18n/client";
import type { Appointment } from "@/types/appointments";
import styles from "./final-price-dialog.module.css";

/**
 * Fiyatı iş bitince kesinleşen (başlangıç / aralık / görüşmede) randevuyu tamamlarken kesin tutarı sorar.
 * Tutar zorunludur; ek hizmet varsa girilen tutar ek hizmetler dahil toplamdır.
 */
export function FinalPriceDialog({ appointment, busy = false, onClose, onConfirm }: {
  appointment: Appointment | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (finalPrice: { total: number; extrasTotal: number }) => void;
}) {
  const t = useT();
  const formId = useId();
  const [valid, setValid] = useState(false);
  return (
    <Sheet
      open={Boolean(appointment)}
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={t("Kesin tutarı girin")}
      description={t("Bu hizmetin fiyatı iş bitince belirlenir. Tamamlamak için müşterinin ödeyeceği tutarı yazın.")}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>{t("Vazgeç")}</Button>
        <Button type="submit" form={formId} variant="primary" icon={Check} loading={busy} disabled={!valid}>{t("Kaydet ve tamamla")}</Button>
      </>}
    >
      {appointment && <FinalPriceForm key={appointment.id} formId={formId} appointment={appointment} busy={busy} onValidChange={setValid} onConfirm={onConfirm} />}
    </Sheet>
  );
}

function FinalPriceForm({ formId, appointment, busy, onValidChange, onConfirm }: {
  formId: string;
  appointment: Appointment;
  busy: boolean;
  onValidChange: (valid: boolean) => void;
  onConfirm: (finalPrice: { total: number; extrasTotal: number }) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const money = moneyFormatter(useIntlLocale());
  const extras = extrasTotal(appointment);
  const isQuote = appointment.servicePriceType === "quote";
  const [value, setValue] = useState(() => isQuote ? "" : String(Number(appointment.servicePrice ?? 0)));
  const amount = value.trim() === "" ? Number.NaN : Number(value);
  const valid = Number.isFinite(amount) && amount >= extras;
  const showError = value.trim() !== "" && !valid;
  useEffect(() => { onValidChange(valid); }, [onValidChange, valid]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    onConfirm({ total: amount, extrasTotal: extras });
  }

  return (
    <form id={formId} onSubmit={submit} className={styles.form}>
      <div className={styles.summary}>
        <b>{localizedAppointmentServiceName(appointment, locale) || t("Hizmet")}</b>
        <small>{t("Tahmini: {price}", { price: appointmentPriceLabel(appointment, t, money) })}</small>
      </div>
      <Field
        label={t("Kesin tutar (₺)")}
        hint={extras > 0 ? t("Ek hizmetler dahil toplam tutar.") : t("Müşterinin ödeyeceği hizmet tutarı.")}
        error={showError ? t("Hizmet tutarı ek hizmetlerin toplamından ({amount}) az olamaz.", { amount: money(extras) }) : undefined}
      >
        <Input type="number" inputMode="decimal" min={extras} step="any" required data-autofocus value={value}
          placeholder={isQuote ? t("Örn. 750") : undefined} aria-invalid={showError}
          onChange={(event) => setValue(event.target.value)} />
      </Field>
    </form>
  );
}
