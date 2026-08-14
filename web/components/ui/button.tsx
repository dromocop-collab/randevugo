import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-lg shadow-sky-500/25 hover:brightness-105",
  secondary:
    "bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border)] hover:bg-[var(--field-bg-hover)]",
  ghost: "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
