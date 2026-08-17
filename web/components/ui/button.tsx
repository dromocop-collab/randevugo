"use client";

import { ButtonHTMLAttributes, ReactNode, useCallback, useRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  glow?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "btn-premium bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/35 hover:brightness-110",
  secondary:
    "bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border)] hover:bg-[var(--field-bg-hover)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] hover:shadow-md",
  ghost:
    "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]",
  danger:
    "btn-premium bg-[linear-gradient(135deg,#e11d48,#be123c)] text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/35 hover:brightness-110",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs gap-1.5 rounded-lg",
  md: "px-5 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-7 py-3.5 text-base gap-2.5 rounded-xl",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  iconLeft,
  iconRight,
  glow = false,
  disabled,
  children,
  onClick,
  ...props
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // Ripple effect
      const btn = btnRef.current;
      if (btn && (variant === "primary" || variant === "danger")) {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height);
        ripple.className = "ripple-circle";
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      }
      onClick?.(e);
    },
    [onClick, variant]
  );

  return (
    <button
      ref={btnRef}
      className={cn(
        "btn-ripple inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses[size],
        variantClasses[variant],
        glow && (variant === "primary" || variant === "danger") && "btn-glow",
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
          <path d="M12 2a10 10 0 019.95 9" strokeLinecap="round" />
        </svg>
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}
