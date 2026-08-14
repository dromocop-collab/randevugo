"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { createSpecialDay, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import type { DaySchedule } from "@/types/business";

export default function WorkingHoursPage() {
  const { businessId } = useBusiness();
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>([]);
  const [date, setDate] = useState("");
  const [type, setType] = useState("holiday");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    listBusinessWorkingHours(businessId).then((rows) => {
      if (cancelled) return;
      setWorkingHours(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!businessId) return;

    await createSpecialDay(businessId, { date, type, description });
    setWorkingHours(await listBusinessWorkingHours(businessId));
    setDate("");
    setDescription("");
  }

  return (
    <div className="space-y-4">
      <Card title="Calisma Saatleri" description="Gunluk mesai, mola, tatil ve ozel gunleri yonetin.">
        {workingHours.length === 0 ? (
          <EmptyState title="Saat bilgisi yok" description="Onboarding sonrasi saatler otomatik gelir." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {workingHours.map((item) => (
              <li key={`${item.day}-${item.start}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-sm">
                Gun: {item.day} | {item.isOpen ? "Acik" : "Kapali"} | {item.start}-{item.end}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ozel Gun Ekle" description="Tatil, izin veya ozel saat tanimlayin.">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <Input label="Tarih" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Select
            label="Tip"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: "holiday", label: "Tatil" },
              { value: "leave", label: "Izin" },
              { value: "closed", label: "Kapali" },
              { value: "custom", label: "Ozel" },
            ]}
          />
          <Input label="Aciklama" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex items-end">
            <Button className="w-full" type="submit">Kaydet</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
