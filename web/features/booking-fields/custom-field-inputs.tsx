"use client";

import { AlertCircle, Check, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CustomBookingField, CustomFieldInputValues } from "./booking-fields-domain";
import styles from "./custom-fields.module.css";

type Value = CustomFieldInputValues[string] | undefined;

/**
 * Müşterinin randevu formunda gördüğü ek alanlar. Randevu sihirbazı ve "Müşteri böyle görecek"
 * önizlemeleri aynı bileşeni kullanır.
 */
export function CustomFieldInputs({
  fields, values, onChange, errors = {}, idPrefix = "custom-field", className, preview = false,
}: {
  fields: CustomBookingField[];
  values: CustomFieldInputValues;
  onChange: (id: string, value: Value) => void;
  /** Alan id → hata metni (yalnızca gösterilecek olanlar). */
  errors?: Record<string, string | null | undefined>;
  idPrefix?: string;
  className?: string;
  /** Önizleme: sayfadaki diğer formlarla id çakışmasın diye ayrı önek verilmeli. */
  preview?: boolean;
}) {
  if (fields.length === 0) return null;
  return (
    <div className={cn(styles.fields, className)} data-preview={preview || undefined}>
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[field.id] ?? null}
          inputId={`${idPrefix}-${field.id}`}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
    </div>
  );
}

function FieldLabel({ field, htmlFor, counter }: { field: CustomBookingField; htmlFor?: string; counter?: string }) {
  const content = <>
    <span className={styles.labelText}>{field.label}</span>
    {field.required ? <em aria-hidden="true">*</em> : <small>İsteğe bağlı</small>}
    {counter && <small className={styles.counter}>{counter}</small>}
  </>;
  return htmlFor
    ? <label htmlFor={htmlFor} className={styles.label}>{content}</label>
    : <span className={styles.label}>{content}</span>;
}

function CustomFieldInput({ field, value, error, inputId, onChange }: {
  field: CustomBookingField;
  value: Value;
  error: string | null;
  inputId: string;
  onChange: (value: Value) => void;
}) {
  const helpId = field.helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const help = field.helpText ? <p id={helpId} className={styles.help}>{field.helpText}</p> : null;
  const errorLine = error ? <p id={errorId} className={styles.error} role="alert"><AlertCircle size={14} aria-hidden /> {error}</p> : null;

  if (field.type === "checkbox") {
    const checked = value === true;
    return (
      <div className={styles.field}>
        <label className={cn(styles.check, checked && styles.checkOn, error && styles.invalid)}>
          <input
            id={inputId}
            type="checkbox"
            className={styles.srOnly}
            checked={checked}
            onChange={(event) => onChange(event.target.checked ? true : undefined)}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
          />
          <span className={styles.checkBox} aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
          <span className={styles.checkText}>
            <b>{field.label}{field.required && <em aria-hidden="true"> *</em>}</b>
            {field.helpText && <small id={helpId}>{field.helpText}</small>}
          </span>
        </label>
        {errorLine}
      </div>
    );
  }

  if (field.type === "number") {
    const min = field.min ?? 0;
    const max = field.max ?? 100_000;
    const numeric = value === undefined || value === "" ? null : Number(value);
    const step = (delta: number) => {
      const base = numeric === null || !Number.isFinite(numeric) ? (delta > 0 ? min - 1 : min + 1) : numeric;
      onChange(Math.min(max, Math.max(min, Math.round(base) + delta)));
    };
    return (
      <div className={styles.field}>
        <FieldLabel field={field} htmlFor={inputId} counter={`${min}–${max}`} />
        <div className={cn(styles.stepper, error && styles.invalid)}>
          <button type="button" className={styles.stepBtn} onClick={() => step(-1)} disabled={numeric !== null && numeric <= min} aria-label={`${field.label} azalt`}><Minus size={18} strokeWidth={2.4} /></button>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={numeric === null || !Number.isFinite(numeric) ? "" : numeric}
            placeholder={field.placeholder ?? "–"}
            onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className={styles.stepValue}
          />
          <button type="button" className={styles.stepBtn} onClick={() => step(1)} disabled={numeric !== null && numeric >= max} aria-label={`${field.label} artır`}><Plus size={18} strokeWidth={2.4} /></button>
        </div>
        {help}
        {errorLine}
      </div>
    );
  }

  if (field.type === "select") {
    const options = field.options ?? [];
    const selected = typeof value === "string" ? value : "";
    if (options.length <= 4) {
      return (
        <div className={styles.field}>
          <FieldLabel field={field} />
          <div role="radiogroup" aria-label={field.label} aria-describedby={describedBy} className={cn(styles.pills, error && styles.invalidGroup)}>
            {options.map((option) => {
              const active = selected === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cn(styles.pill, active && styles.pillOn)}
                  onClick={() => onChange(active && !field.required ? undefined : option)}
                >
                  {active && <Check size={15} strokeWidth={3} aria-hidden />}{option}
                </button>
              );
            })}
          </div>
          {help}
          {errorLine}
        </div>
      );
    }
    return (
      <div className={styles.field}>
        <FieldLabel field={field} htmlFor={inputId} />
        <div className={styles.selectWrap}>
          <select
            id={inputId}
            value={selected}
            onChange={(event) => onChange(event.target.value || undefined)}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className={cn(styles.input, styles.select, error && styles.invalid)}
          >
            <option value="">Seçin…</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown size={18} aria-hidden />
        </div>
        {help}
        {errorLine}
      </div>
    );
  }

  const text = typeof value === "string" ? value : "";
  const limit = field.maxLength ?? (field.type === "textarea" ? 500 : 120);
  if (field.type === "textarea") {
    return (
      <div className={styles.field}>
        <FieldLabel field={field} htmlFor={inputId} counter={`${text.length}/${limit}`} />
        <textarea
          id={inputId}
          value={text}
          maxLength={limit}
          rows={3}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn(styles.input, styles.textarea, error && styles.invalid)}
        />
        {help}
        {errorLine}
      </div>
    );
  }
  return (
    <div className={styles.field}>
      <FieldLabel field={field} htmlFor={inputId} />
      <input
        id={inputId}
        type="text"
        value={text}
        maxLength={limit}
        placeholder={field.placeholder}
        enterKeyHint="next"
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cn(styles.input, error && styles.invalid)}
      />
      {help}
      {errorLine}
    </div>
  );
}
