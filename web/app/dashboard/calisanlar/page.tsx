"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { createStaff, listStaff, removeStaff, updateStaff } from "@/features/staff/staff-repository";
import { firstErrorMessage, staffCreateSchema } from "@/lib/validation/schemas";
import type { Staff } from "@/types/staff";

const defaultHours = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  day,
  isOpen: day !== 0,
  start: "09:00",
  end: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
}));

export default function StaffPage() {
  const { businessId } = useBusiness();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    listStaff(businessId).then((rows) => {
      if (cancelled) return;
      setStaff(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!businessId) return;

    const validated = staffCreateSchema.safeParse({ name, phone, email });
    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    const { name: safeName, phone: safePhone, email: safeEmail } = validated.data;

    await createStaff(businessId, {
      fullName: safeName,
      photoUrl: "",
      phone: safePhone,
      email: safeEmail,
      position: "Uzman",
      isActive: true,
      serviceIds: [],
      workingHours: defaultHours,
      leaveDates: [],
      appointmentCapacity: 1,
    });

    toast.success("Calisan eklendi");
    setName("");
    setPhone("");
    setEmail("");
    setStaff(await listStaff(businessId));
  }

  return (
    <div className="space-y-4">
      <Card title="Calisanlar" description="Ekip, kapasite, mesai ve hizmet atamalarini yonetin.">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
          <Input label="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="flex items-end">
            <Button className="w-full" type="submit">Ekle</Button>
          </div>
        </form>
      </Card>

      {staff.length === 0 ? (
        <EmptyState title="Calisan yok" description="Ilk ekip uyeinizi ekleyin." />
      ) : (
        <div className="space-y-3">
          {staff.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--text-1)]">{item.fullName}</p>
                  <p className="text-sm text-[var(--text-3)]">{item.phone} | {item.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updateStaff(businessId!, item.id, { isActive: !item.isActive }).then(async () => {
                        setStaff(await listStaff(businessId!));
                      });
                    }}
                  >
                    {item.isActive ? "Pasif Yap" : "Aktif Yap"}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      removeStaff(businessId!, item.id).then(async () => {
                        setStaff(await listStaff(businessId!));
                      })
                    }
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
