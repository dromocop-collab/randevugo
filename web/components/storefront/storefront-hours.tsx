"use client";

import type { DaySchedule } from "@/types/business";
import { CalendarClock, Clock3 } from "lucide-react";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

const DAY_NAMES = [tk("Pazar"), tk("Pazartesi"), tk("Salı"), tk("Çarşamba"), tk("Perşembe"), tk("Cuma"), tk("Cumartesi")];

interface Props {
  workingHours: DaySchedule[];
}

export function StorefrontHours({ workingHours }: Props) {
  const t = useT();
  const today = new Date().getDay();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (workingHours.length === 0) {
    return (
      <section className="storefront-hours-card">
        <h3><Clock3 size={16}/> {t("Çalışma Saatleri")}</h3>
        <p className="mt-3 text-xs text-[var(--text-3)]">{t("Bilgi eklenmemiş.")}</p>
      </section>
    );
  }

  const sorted = [...workingHours].sort((a, b) => a.day - b.day);
  const todaySchedule = sorted.find((item) => item.day === today);
  const toMinutes = (value?: string) => {
    const [hour = 0, minute = 0] = (value ?? "").split(":").map(Number);
    return hour * 60 + minute;
  };
  const isOpenNow = Boolean(
    todaySchedule?.isOpen &&
    nowMinutes >= toMinutes(todaySchedule.start) &&
    nowMinutes < toMinutes(todaySchedule.end),
  );

  return (
    <section className="storefront-hours-card">
      <header className="storefront-hours-head">
        <span><CalendarClock size={22}/></span>
        <div><small>{t("HAFTALIK PROGRAM")}</small><h3>{t("Mağaza saatleri")}</h3></div>
        <b className={isOpenNow ? "is-open" : "is-closed"}><i/>{isOpenNow ? t("Şimdi açık · {time}", { time: todaySchedule?.end }) : t("Şu an kapalı")}</b>
      </header>
      <div className="storefront-hours-list">
        {sorted.map((h) => {
          const isToday = h.day === today;
          return (
            <div
              key={h.day}
              className={isToday ? "is-today" : ""}
            >
              <span className="flex items-center gap-2">
                {isToday && <i/>}
                {t(DAY_NAMES[h.day])}
              </span>
              {h.isOpen ? (
                <b>{h.start} <em>—</em> {h.end}</b>
              ) : (
                <b className="closed">{t("Kapalı")}</b>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
