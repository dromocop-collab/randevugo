"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { createService, listServices, removeService, updateService } from "@/features/services/service-repository";
import { firstErrorMessage, serviceCreateSchema } from "@/lib/validation/schemas";
import type { Service } from "@/types/service";

export default function ServicesPage() {
  const { businessId } = useBusiness();
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("30");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    listServices(businessId).then((rows) => {
      if (cancelled) return;
      setServices(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!businessId) return;

    const validated = serviceCreateSchema.safeParse({ name, price, duration });
    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    const { name: safeName, price: safePrice, duration: safeDuration } = validated.data;

    await createService(businessId, {
      name: safeName,
      description: "",
      category: "genel",
      price: safePrice,
      durationMinutes: safeDuration,
      currency: "TRY",
      isActive: true,
      isBookableOnline: true,
      requiresDeposit: false,
      depositAmount: 0,
      assignableStaffIds: [],
      imageUrl: "",
      sortOrder: services.length,
    });

    toast.success("Hizmet eklendi");
    setName("");
    setPrice("0");
    setDuration("30");
    setServices(await listServices(businessId));
  }

  return (
    <div className="space-y-4">
      <Card title="Hizmetler" description="Hizmetlerinizi ekleyin, duzenleyin ve yayinlayin.">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
          <Input label="Hizmet Adi" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Fiyat" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <Input label="Sure (dk)" value={duration} onChange={(e) => setDuration(e.target.value)} required />
          <div className="flex items-end">
            <Button className="w-full" type="submit">Ekle</Button>
          </div>
        </form>
      </Card>

      {services.length === 0 ? (
        <EmptyState title="Hizmet yok" description="Ilk hizmetinizi olusturun." />
      ) : (
        <div className="space-y-3">
          {services.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--text-1)]">{item.name}</p>
                  <p className="text-sm text-[var(--text-3)]">{item.durationMinutes} dk | {item.price} {item.currency}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updateService(businessId!, item.id, { isActive: !item.isActive }).then(async () => {
                        setServices(await listServices(businessId!));
                      });
                    }}
                  >
                    {item.isActive ? "Pasif Yap" : "Aktif Yap"}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      removeService(businessId!, item.id).then(async () => {
                        setServices(await listServices(businessId!));
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
