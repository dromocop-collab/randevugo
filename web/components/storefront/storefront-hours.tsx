"use client";

import type { DaySchedule } from "@/types/business";
import { Clock3 } from "lucide-react";

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

interface Props {
  workingHours: DaySchedule[];
}

export function StorefrontHours({ workingHours }: Props) {
  const today = new Date().getDay();

  if (workingHours.length === 0) {
    return (
      <section className="storefront-hours-card">
        <h3><Clock3 size={16}/> Çalışma Saatleri</h3>
        <p className="mt-3 text-xs text-[var(--text-3)]">Bilgi eklenmemiş.</p>
      </section>
    );
  }

  const sorted = [...workingHours].sort((a, b) => a.day - b.day);

  return (
    <section className="storefront-hours-card">
      <h3><Clock3 size={16}/> Çalışma Saatleri</h3>
      <div>
        {sorted.map((h) => {
          const isToday = h.day === today;
          return (
            <div
              key={h.day}
              className={isToday ? "is-today" : ""}
            >
              <span className="flex items-center gap-2">
                {isToday && <i/>}
                {DAY_NAMES[h.day]}
              </span>
              {h.isOpen ? (
                <span className="font-medium">{h.start} - {h.end}</span>
              ) : (
                <span className="text-rose-500 font-medium">Kapalı</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
