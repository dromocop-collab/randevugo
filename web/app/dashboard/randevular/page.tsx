"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import {
  listAppointments,
  updateAppointmentStatus,
} from "@/features/appointments/appointment-repository";
import type { Appointment, AppointmentStatus } from "@/types/appointments";

const statusOptions = [
  { value: "all", label: "Tum durumlar" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

export default function AppointmentsPage() {
  const { businessId } = useBusiness();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    listAppointments(businessId).then((rows) => {
      if (cancelled) return;
      setAppointments(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const filtered = appointments.filter((item) => (status === "all" ? true : item.status === status));

  async function setStatusAction(appointmentId: string, nextStatus: AppointmentStatus) {
    if (!businessId) return;

    await updateAppointmentStatus(businessId, appointmentId, nextStatus);
    toast.success("Randevu guncellendi");
    setAppointments(await listAppointments(businessId));
  }

  return (
    <div className="space-y-4">
      <Card title="Randevu Yonetimi" description="Onay, iptal, tamamlandi, gelmedi aksiyonlarini yonetin.">
        <div className="max-w-xs">
          <Select label="Durum Filtre" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Randevu bulunmadi" description="Filtreye uygun randevu yok." />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--text-1)]">{item.customerName}</p>
                  <p className="text-sm text-[var(--text-3)]">
                    {new Date(item.startAt).toLocaleString("tr-TR")} | {item.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setStatusAction(item.id, "confirmed")}>Onayla</Button>
                  <Button variant="secondary" onClick={() => setStatusAction(item.id, "completed")}>Tamamlandi</Button>
                  <Button variant="danger" onClick={() => setStatusAction(item.id, "cancelled")}>Iptal Et</Button>
                  <Button variant="ghost" onClick={() => setStatusAction(item.id, "no_show")}>Gelmedi</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
