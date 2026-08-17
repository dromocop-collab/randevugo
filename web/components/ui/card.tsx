"use client";

import { ReactNode, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  tilt?: boolean;
}

export function Card({ title, description, children, className, headerAction, tilt = false }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tilt || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    },
    [tilt]
  );

  const handleMouseLeave = useCallback(() => {
    if (!tilt || !cardRef.current) return;
    cardRef.current.style.transform = "";
  }, [tilt]);

  return (
    <section
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "premium-card rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-xl shadow-[var(--shadow-soft)] backdrop-blur-xl",
        tilt && "card-3d-inner",
        className
      )}
    >
      {/* Shine overlay for tilt mode */}
      {tilt && <div className="card-3d-shine" />}

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
