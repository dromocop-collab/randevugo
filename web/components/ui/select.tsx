import { SelectHTMLAttributes } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
}

export function Select({ label, options, ...props }: Props) {
  return (
    <label className="space-y-2 text-sm text-[var(--text-2)]">
      <span>{label}</span>
      <select
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
        {...props}
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
