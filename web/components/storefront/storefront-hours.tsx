"use client";

import type { DaySchedule } from "@/types/business";

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

interface Props {
  workingHours: DaySchedule[];
}

export function StorefrontHours({ workingHours }: Props) {
  const today = new Date().getDay();

  if (workingHours.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Çalışma Saatleri</h3>
        <p className="mt-3 text-xs text-[var(--text-3)]">Bilgi eklenmemiş.</p>
      </section>
    );
  }

  const sorted = [...workingHours].sort((a, b) => a.day - b.day);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
        🕐 Çalışma Saatleri
      </h3>
      <div className="mt-3 space-y-1">
        {sorted.map((h) => {
          const isToday = h.day === today;
          return (
            <div
              key={h.day}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                isToday
                  ? "bg-[var(--accent)]/5 font-semibold text-[var(--accent)]"
                  : "text-[var(--text-2)]"
              }`}
            >
              <span className="flex items-center gap-2">
                {isToday && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
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
