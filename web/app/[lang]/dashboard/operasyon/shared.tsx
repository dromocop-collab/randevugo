"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { PaymentMethod, RewardProgramSettings } from "@/types/operations";
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
export const paymentLabels: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", transfer: "Havale / EFT", other: "Diğer" };
export const money = (value: number) => `${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
export const date = (value?: string) => value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
export const errorText = (error: unknown) => {
  const message = error instanceof Error ? error.message : "İşlem tamamlanamadı.";
  if (message.includes("already-exists")) return "Bu randevunun ödemesi daha önce kaydedilmiş.";
  if (message.includes("failed-precondition")) return message.split(":").at(-1)?.trim() || "İşlem koşulları artık geçerli değil.";
  return message;
};

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
  cash: "Kasaya nakit işlensin", card: "Kart tahsilatı olarak işlensin", transfer: "Banka transferi olarak işlensin", other: "Diğer ödeme yöntemi",
};
export function SelectPayment({ value, onChange }: { value: PaymentMethod; onChange: (value: PaymentMethod) => void }) {
  return <SelectField label="Ödeme yöntemi" value={value} onChange={(next) => onChange(next as PaymentMethod)} help={paymentHelp[value]}
    options={Object.entries(paymentLabels).map(([key, label]) => ({ value: key, label }))} />;
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
