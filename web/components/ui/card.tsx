import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export function Card({ title, description, children, className, headerAction }: Props) {
  return (
    <section
      className={cn(
        "premium-card rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-xl shadow-[var(--shadow-soft)] backdrop-blur-xl",
        className
      )}
    >
      {(title || headerAction) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-base font-semibold text-[var(--text-1)]">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-[var(--text-3)]">{description}</p> : null}
          </div>
          {headerAction}
        </div>
      )}
      {!title && !headerAction && description ? <p className="text-sm text-[var(--text-3)]">{description}</p> : null}
      <div className={title || description || headerAction ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

