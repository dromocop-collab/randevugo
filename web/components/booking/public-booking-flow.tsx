"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createAppointment, listAvailableSlots, type AvailableAppointmentSlot } from "@/features/appointments/appointment-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";

interface Props {
  businessId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessHours: DaySchedule[];
  minimumBookingNoticeMinutes: number;
  appointmentBufferMinutes: number;
  maximumBookingDaysAhead: number;
}

export function PublicBookingFlow(props: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointmentsDate, setAppointmentsDate] = useState(new Date().toISOString().slice(0, 10));
  const [availableSlots, setAvailableSlots] = useState<AvailableAppointmentSlot[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [slot, setSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([listServices(props.businessId, true), listStaff(props.businessId, true)]).then(
      ([serviceRows, staffRows]) => {
        setServices(serviceRows);
        setStaff(staffRows);
        setServiceId(serviceRows[0]?.id ?? "");
        setStaffId(staffRows[0]?.id ?? "");
      }
    );
  }, [props.businessId]);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    listAvailableSlots({ businessId: props.businessId, serviceId, staffId, date: appointmentsDate })
      .then((rows) => { if (!cancelled) setAvailableSlots(rows); })
      .catch((error) => {
        if (!cancelled) {
          setAvailableSlots([]);
          toast.error((error as Error).message || "Uygun saatler alınamadı.");
        }
      });
    return () => { cancelled = true; };
  }, [appointmentsDate, props.businessId, serviceId, staffId]);

  const selectedService = useMemo(() => services.find((item) => item.id === serviceId), [serviceId, services]);
  const selectedStaff = useMemo(() => staff.find((item) => item.id === staffId), [staff, staffId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedService || !slot) return;

    const selectedSlot = availableSlots.find((item) => item.label === slot);
    if (!selectedSlot) return;

    try {
      await createAppointment({
        businessId: props.businessId,
        staffId: selectedSlot.staffId ?? selectedStaff?.id ?? "",
        serviceId: selectedService.id,
        customerName,
        customerPhone,
        customerEmail,
        notes,
        startAtMillis: selectedSlot.startAtMillis,
      });
      toast.success("Randevunuz olusturuldu");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
      setSlot("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Card title={props.businessName} description="Online randevu olustur">
        <p className="text-sm text-[var(--text-3)]">{props.businessPhone} | {props.businessEmail}</p>
      </Card>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <Card title="1. Hizmet Sec">
          <Select
            label="Hizmet"
            value={serviceId}
            onChange={(e) => { setServiceId(e.target.value); setSlot(""); }}
            options={services.map((item) => ({ value: item.id, label: `${item.name} - ${item.durationMinutes} dk` }))}
          />
        </Card>

        <Card title="2. Calisan Sec">
          <Select
            label="Calisan"
            value={staffId}
            onChange={(e) => { setStaffId(e.target.value); setSlot(""); }}
            options={[
              { value: "", label: "Uygun herhangi bir çalışan" },
              ...staff.map((item) => ({ value: item.id, label: item.fullName })),
            ]}
          />
        </Card>

        <Card title="3. Tarih ve Saat">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Tarih"
              type="date"
              value={appointmentsDate}
              onChange={(e) => { setAppointmentsDate(e.target.value); setSlot(""); }}
              required
            />
            <Select
              label="Saat"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              options={[
                { value: "", label: "Uygun saat secin" },
                ...availableSlots.map((item) => ({ value: item.label, label: item.label })),
              ]}
            />
          </div>
        </Card>

        <Card title="4. Musteri Bilgileri">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Ad Soyad" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            <Input label="Telefon" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
            <Input
              label="E-posta"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            <Input label="Not" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Card>

        <Button className="w-full" type="submit">Randevuyu Onayla</Button>
      </form>
    </main>
  );
}
