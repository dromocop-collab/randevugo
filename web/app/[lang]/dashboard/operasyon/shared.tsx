"use client";

import { useCallback, useId, useMemo, type InputHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { PaymentMethod, RewardProgramSettings } from "@/types/operations";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";
import { EmptyState, cx, studio } from "../_studio";
import o from "./ops.module.css";

export const defaultRewardProgram: RewardProgramSettings = {
  enabled: true,
  spendPerPoint: 10,
  pointValueTl: 1,
  minimumRedeemPoints: 1,
  maxRedemptionPercent: 100,
  earnOnPackages: true,
};
export const paymentLabels: Record<PaymentMethod, string> = { cash: tk("Nakit"), card: tk("Kart"), transfer: tk("Havale / EFT"), other: tk("Diğer") };
export const money = (value: number, locale: string) => `${Number(value || 0).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
export const date = (value: string | undefined, locale: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
export const errorText = (error: unknown, t: TFunction) => {
  const message = error instanceof Error ? error.message : "";
  if (!message) return t("İşlem tamamlanamadı.");
  if (message.includes("already-exists")) return t("Bu randevunun ödemesi daha önce kaydedilmiş.");
  if (message.includes("failed-precondition")) {
    const detail = message.split(":").at(-1)?.trim();
    return detail ? t(detail) : t("İşlem koşulları artık geçerli değil.");
  }
  return t(message);
};

/** Etkin dile bağlı biçimlendiriciler: para, tarih, hata metni ve çeviri. */
export function useOps() {
  const t = useT();
  const locale = useIntlLocale();
  const formatMoney = useCallback((value: number) => money(value, locale), [locale]);
  const formatDate = useCallback((value?: string) => date(value, locale), [locale]);
  const formatError = useCallback((error: unknown) => errorText(error, t), [t]);
  return useMemo(() => ({ t, locale, money: formatMoney, date: formatDate, errorText: formatError }), [t, locale, formatMoney, formatDate, formatError]);
}

export interface TabProps {
  businessId: string;
  busy: string;
  setBusy: (value: string) => void;
  onDone: () => Promise<void>;
}

/** Etiketli metin/sayı alanı (16px yazı → iOS yakınlaştırmaz). */
export function Field({ label, help, className, id, type, inputMode, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: ReactNode }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cx(studio.field, className)}>
      <label className={studio.label} htmlFor={fieldId}>{label}</label>
      <input id={fieldId} type={type} inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)} className={studio.input} {...props} />
      {help ? <span className={studio.help}>{help}</span> : null}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, required, disabled, help }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  help?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={studio.field}>
      <label className={studio.label} htmlFor={id}>{label}</label>
      <select id={id} className={studio.select} value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {help ? <span className={studio.help}>{help}</span> : null}
    </div>
  );
}

const paymentHelp: Record<PaymentMethod, string> = {
  cash: tk("Kasaya nakit işlensin"), card: tk("Kart tahsilatı olarak işlensin"), transfer: tk("Banka transferi olarak işlensin"), other: tk("Diğer ödeme yöntemi"),
};
export function SelectPayment({ value, onChange }: { value: PaymentMethod; onChange: (value: PaymentMethod) => void }) {
  const t = useT();
  return <SelectField label={t("Ödeme yöntemi")} value={value} onChange={(next) => onChange(next as PaymentMethod)} help={t(paymentHelp[value])}
    options={Object.entries(paymentLabels).map(([key, label]) => ({ value: key, label: t(label) }))} />;
}

export function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={cx(o.line, strong && o.lineStrong)}><span>{label}</span><b>{value}</b></div>;
}

export function Empty({ text }: { text: string }) {
  return <div className={o.spanAll}><EmptyState mood="idle" size={72} title={text} /></div>;
}

/** Yüklenirken dönen ikon, değilse verilen ikon. */
export function BusyIcon({ busy, icon: Icon, size = 16 }: { busy: boolean; icon?: LucideIcon; size?: number }) {
  if (busy) return <LoaderCircle size={size} className={studio.spin} aria-hidden />;
  return Icon ? <Icon size={size} aria-hidden /> : null;
}

/** Öğeyi görünür alana kaydırır; azaltılmış hareket tercihine uyar. */
export function scrollToEl(element: Element | null | undefined) {
  if (!element || typeof window === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
