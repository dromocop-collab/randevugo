"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { listAppointmentsByDateRange } from "@/features/appointments/appointment-repository";
import type { Appointment } from "@/types/appointments";

type ViewMode = "gun" | "hafta" | "ay";

export default function CalendarPage() {
  const { businessId } = useBusiness();
  const [view, setView] = useState<ViewMode>("hafta");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!businessId) return;

    const now = new Date();
    const end =
      view === "gun" ? addDays(now, 1) : view === "hafta" ? addDays(now, 7) : addDays(now, 30);

    listAppointmentsByDateRange(businessId, now, end).then(setAppointments);
  }, [businessId, view]);

  const grouped = useMemo(() => {
    return appointments.reduce<Record<string, Appointment[]>>((acc, item) => {
      const day = new Date(item.startAt).toLocaleDateString("tr-TR");
      acc[day] = acc[day] ?? [];
      acc[day]!.push(item);
      return acc;
    }, {});
  }, [appointments]);

  return (
    <div className="space-y-4">
      <Card title="Takvim" description="Gunluk, haftalik ve aylik planinizi yonetin.">
        <div className="flex gap-2">
          {(["gun", "hafta", "ay"] as ViewMode[]).map((item) => (
            <Button key={item} variant={view === item ? "primary" : "secondary"} onClick={() => setView(item)}>
              {item.toUpperCase()}
            </Button>
          ))}
        </div>
      </Card>

      {appointments.length === 0 ? (
        <EmptyState title="Takvim bos" description="Secilen aralikta randevu bulunmuyor." />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, items]) => (
            <Card key={day} title={day}>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-sm">
                    <p className="font-medium text-[var(--text-1)]">{item.customerName}</p>
                    <p className="text-[var(--text-3)]">
                      {item.startAt.slice(11, 16)} - {item.endAt.slice(11, 16)} | {item.status} | odeme: {item.paymentStatus}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
