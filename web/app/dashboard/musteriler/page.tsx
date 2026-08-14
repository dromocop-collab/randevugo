"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { listCustomers } from "@/features/customers/customer-repository";
import type { Customer } from "@/types/customer";
import { formatMoney } from "@/lib/utils/date";

export default function CustomersPage() {
  const { businessId } = useBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!businessId) return;
    listCustomers(businessId).then(setCustomers);
  }, [businessId]);

  return (
    <div className="space-y-4">
      <Card title="Musteriler / CRM" description="Musteri kartlari ve randevu geckmisini yonetin.">
        {customers.length === 0 ? (
          <EmptyState title="Musteri yok" description="Randevular geldikce CRM otomatik dolacak." />
        ) : (
          <div className="space-y-3">
            {customers.map((item) => (
              <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <h3 className="font-medium text-[var(--text-1)]">{item.fullName}</h3>
                <p className="mt-1 text-sm text-[var(--text-3)]">{item.phone} | {item.email || "-"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-2)] sm:grid-cols-4">
                  <p>Toplam: {item.totalAppointments}</p>
                  <p>Tamamlanan: {item.completedAppointments}</p>
                  <p>Iptal: {item.cancelledAppointments}</p>
                  <p>No show: {item.noShowAppointments}</p>
                  <p>Harcama: {formatMoney(item.totalSpent)}</p>
                  <p>Son ziyaret: {item.lastVisitAt ? new Date(item.lastVisitAt).toLocaleDateString("tr-TR") : "-"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
