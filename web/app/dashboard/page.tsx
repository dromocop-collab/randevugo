"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { useBusiness } from "@/hooks/use-business";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import type { Appointment } from "@/types/appointments";

export default function DashboardHomePage() {
  const { businessId } = useBusiness();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;

    let alive = true;

    Promise.all([
      listAppointments(businessId),
      listCustomers(businessId),
      listServices(businessId),
      listStaff(businessId),
    ])
      .then(([appts, customers, services, staff]) => {
        if (!alive) return;
        setLoadError(null);
        setAppointments(appts);
        setCustomerCount(customers.length);
        setServiceCount(services.length);
        setStaffCount(staff.length);
      })
      .catch((error) => {
        if (!alive) return;
        setAppointments([]);
        setCustomerCount(0);
        setServiceCount(0);
        setStaffCount(0);
        const message = (error as Error | undefined)?.message ?? "Dashboard verileri alinamadi.";
        setLoadError(message);
        toast.error(message);
      });

    return () => {
      alive = false;
    };
  }, [businessId]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayAppointments = appointments.filter(
      (item) => new Date(item.startAt).toDateString() === today
    ).length;

    const completed = appointments.filter((item) => item.status === "completed").length;
    const pending = appointments.filter((item) => item.status === "pending").length;
    const cancelled = appointments.filter((item) => item.status === "cancelled").length;

    return [
      { label: "Bugunku Randevular", value: String(todayAppointments), delta: "+12%" },
      { label: "Bekleyen", value: String(pending), delta: "Canli" },
      { label: "Tamamlanan", value: String(completed), delta: "+8%" },
      { label: "Iptaller", value: String(cancelled), delta: "Kontrol" },
      { label: "Toplam Musteri", value: String(customerCount), delta: "+5 yeni" },
      { label: "Toplam Hizmet", value: String(serviceCount) },
      { label: "Toplam Calisan", value: String(staffCount) },
      { label: "Yaklasan", value: String(appointments.slice(0, 5).length) },
    ];
  }, [appointments, customerCount, serviceCount, staffCount]);

  return (
    <div className="space-y-4">
      {loadError ? (
        <Card title="Erisim Uyarisi" description="Bazi panel verileri icin yetki dogrulamasi gerekiyor.">
          <p className="text-sm text-rose-600">{loadError}</p>
        </Card>
      ) : null}
      <StatGrid items={stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Yaklasan Randevular" description="Siradaki operasyon akisi">
          {appointments.length === 0 ? (
            <EmptyState title="Randevu yok" description="Ilk randevu olusunca burada gorunecek." />
          ) : (
            <ul className="space-y-3">
              {appointments.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                  <p className="text-sm font-medium text-[var(--text-1)]">{item.customerName}</p>
                  <p className="mt-1 text-xs text-[var(--text-3)]">
                    {new Date(item.startAt).toLocaleString("tr-TR")} - {item.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Son Islemler" description="Panelde gerceklesen son hareketler">
          <ul className="space-y-3 text-sm text-[var(--text-2)]">
            <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">Yeni randevu olusturma akisi aktif.</li>
            <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">Musteri kayit/CRM paneli hazir.</li>
            <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">Calisan ve hizmet yonetimi aktif.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
