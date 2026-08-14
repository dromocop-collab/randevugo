import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: Props) {
  return (
    <label className="space-y-2 text-sm text-[var(--text-2)]">
      <span>{label}</span>
      <input
        className={cn(
          "w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none transition hover:bg-[var(--field-bg-hover)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]",
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}
