"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/states";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessById, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import type { Appointment } from "@/types/appointments";
import type { Business } from "@/types/business";

interface DashboardData {
  todayCount: number;
  pending: number;
  completed: number;
  cancelled: number;
  customerCount: number;
  serviceCount: number;
  staffCount: number;
  todayRevenue: number;
  upcoming: Appointment[];
}

interface SetupItem {
  label: string;
  done: boolean;
  href: string;
  icon: string;
}

const EMPTY_DATA: DashboardData = {
  todayCount: 0, pending: 0, completed: 0, cancelled: 0,
  customerCount: 0, serviceCount: 0, staffCount: 0, todayRevenue: 0, upcoming: [],
};

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display.toLocaleString("tr-TR")}{suffix || ""}</>;
}

export default function DashboardHomePage() {
  const { businessId } = useBusiness();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;

    Promise.all([
      listAppointments(businessId),
      listCustomers(businessId),
      listServices(businessId),
      listStaff(businessId),
      getBusinessById(businessId),
      listBusinessWorkingHours(businessId),
    ])
      .then(([appts, customers, services, staff, biz, workingHours]) => {
        if (!alive) return;
        setLoadError(null);
        setBusiness(biz);

        const now = Date.now();
        const todayString = new Date(now).toDateString();
        const todayAppts = appts.filter((item) => new Date(item.startAt).toDateString() === todayString);
        const completed = appts.filter((item) => item.status === "completed").length;
        const pending = appts.filter((item) => item.status === "pending" || item.status === "confirmed").length;
        const cancelled = appts.filter((item) => item.status === "cancelled").length;
        const todayRevenue = todayAppts
          .filter((a) => a.status === "completed")
          .reduce((sum, a) => sum + (a.servicePrice ?? 0), 0);

        const upcoming = appts
          .filter((a) => (a.status === "confirmed" || a.status === "pending") && new Date(a.startAt).getTime() > now)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
          .slice(0, 5);

        setData({ todayCount: todayAppts.length, pending, completed, cancelled, customerCount: customers.length, serviceCount: services.length, staffCount: staff.length, todayRevenue, upcoming });

        // Dynamic labels with actual counts
        const items: SetupItem[] = [
          {
            label: biz?.name && biz.phone && biz.email && biz.address && biz.city && biz.district
              ? "İşletme bilgileri tamamlandı" : "İşletme bilgilerini tamamla",
            done: !!(biz?.name && biz.phone && biz.email && biz.address && biz.city && biz.district),
            href: "/dashboard/ayarlar", icon: "🏢",
          },
          {
            label: biz?.category && biz.category !== "diger" ? `Kategori: ${biz.category}` : "Kategori seçilmedi",
            done: !!(biz?.category && biz.category !== "diger"),
            href: "/dashboard/ayarlar", icon: "📂",
          },
          {
            label: workingHours.length > 0 ? "Çalışma saatleri ayarlandı" : "Çalışma saatlerini ayarla",
            done: workingHours.length > 0, href: "/dashboard/calisma-saatleri", icon: "🕐",
          },
          {
            label: services.length > 0 ? `${services.length} hizmet eklendi` : "Henüz hizmet eklenmedi",
            done: services.length > 0, href: "/dashboard/hizmetler", icon: "💇",
          },
          {
            label: staff.length > 0 ? `${staff.length} çalışan eklendi` : "Henüz çalışan eklenmedi",
            done: staff.length > 0, href: "/dashboard/calisanlar", icon: "👤",
          },
          {
            label: biz?.logoUrl ? "Logo yüklendi" : "Logo yükle",
            done: !!biz?.logoUrl, href: "/dashboard/ayarlar", icon: "🖼️",
          },
          {
            label: biz?.description && biz.description.length > 10 ? "Açıklama eklendi" : "Açıklama ekle",
            done: !!(biz?.description && biz.description.length > 10), href: "/dashboard/ayarlar", icon: "📝",
          },
        ];
        setSetupItems(items);
        setTimeout(() => setReady(true), 50);
      })
      .catch((error) => {
        if (!alive) return;
        setData(EMPTY_DATA);
        const message = (error as Error | undefined)?.message ?? "Dashboard verileri alınamadı.";
        setLoadError(message);
        toast.error(message);
      });

    return () => { alive = false; };
  }, [businessId]);

  const completedSteps = setupItems.filter((item) => item.done).length;
  const totalSteps = setupItems.length;
  const completionPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const allComplete = completedSteps === totalSteps;

  const statCards = [
    { label: "Bugünkü Randevular", value: data.todayCount, icon: "📅", textColor: "text-sky-600", bg: "bg-sky-500/5" },
    { label: "Bekleyen", value: data.pending, icon: "⏳", textColor: "text-amber-600", bg: "bg-amber-500/5" },
    { label: "Tamamlanan", value: data.completed, icon: "✅", textColor: "text-emerald-600", bg: "bg-emerald-500/5" },
    { label: "İptaller", value: data.cancelled, icon: "❌", textColor: "text-rose-600", bg: "bg-rose-500/5" },
    { label: "Toplam Müşteri", value: data.customerCount, icon: "👥", textColor: "text-violet-600", bg: "bg-violet-500/5" },
    { label: "Toplam Hizmet", value: data.serviceCount, icon: "💇", textColor: "text-pink-600", bg: "bg-pink-500/5" },
    { label: "Toplam Çalışan", value: data.staffCount, icon: "🧑‍💼", textColor: "text-indigo-600", bg: "bg-indigo-500/5" },
  ];

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{loadError}</p>
        </div>
      )}

      {/* Setup Progress */}
      {setupItems.length > 0 && !allComplete && (
        <div
          className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--surface-1)] p-6 shadow-sm"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-1)]">🎯 Profil Durumu</h3>
              <p className="mt-0.5 text-sm text-[var(--text-3)]">
                {completedSteps}/{totalSteps} adım tamamlandı
              </p>
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--surface-3)" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="var(--accent)" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${completionPercent * 1.76} 176`}
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              </svg>
              <span className="absolute text-sm font-bold text-[var(--accent)]">{completionPercent}%</span>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {setupItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-300 hover:scale-[1.01] hover:shadow-sm ${
                  item.done
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                }`}
                style={{
                  opacity: ready ? 1 : 0, transform: ready ? "translateX(0)" : "translateX(-8px)",
                  transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.4s ease ${i * 0.06}s`,
                }}
              >
                <span className="text-base">{item.done ? "✅" : item.icon}</span>
                <span className={item.done ? "line-through opacity-60" : ""}>{item.label}</span>
                {!item.done && (
                  <svg className="ml-auto h-4 w-4 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Complete Banner */}
      {allComplete && setupItems.length > 0 && (
        <div
          className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-5 shadow-sm"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <span className="text-4xl animate-bounce">🎉</span>
          <div>
            <p className="text-lg font-bold text-emerald-700">Harika! Profiliniz tamamlandı!</p>
            <p className="text-sm text-emerald-600/80">
              İşletmeniz aktif ve müşterileriniz online randevu oluşturabiliyor.
              {business?.slug && (
                <>{" "}<Link href={`/isletme/${business.slug}`} className="font-semibold underline underline-offset-2">Profili Görüntüle →</Link></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] ${stat.bg} p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
            style={{
              opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 0.4s ease ${i * 0.05 + 0.2}s, transform 0.4s ease ${i * 0.05 + 0.2}s`,
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">{stat.label}</p>
              <span className="text-lg opacity-60 transition-transform duration-300 group-hover:scale-125">{stat.icon}</span>
            </div>
            <p className={`mt-2 text-3xl font-black ${stat.textColor}`}>
              <AnimatedNumber value={stat.value} />
            </p>
          </div>
        ))}
        {/* Revenue Card */}
        <div
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-yellow-500/5 p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(16px)",
            transition: `opacity 0.4s ease 0.55s, transform 0.4s ease 0.55s`,
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">Bugünkü Gelir</p>
            <span className="text-lg opacity-60 transition-transform duration-300 group-hover:scale-125">💰</span>
          </div>
          <p className="mt-2 text-3xl font-black text-yellow-600">
            {data.todayRevenue > 0 ? <><AnimatedNumber value={data.todayRevenue} /> ₺</> : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[var(--text-1)]">📋 Yaklaşan Randevular</h3>
              <p className="text-xs text-[var(--text-3)]">Sıradaki operasyon akışı</p>
            </div>
            {data.upcoming.length > 0 && (
              <Link href="/dashboard/randevular" className="text-xs font-medium text-[var(--accent)] hover:underline">Tümünü Gör →</Link>
            )}
          </div>
          {data.upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-sm font-medium text-[var(--text-2)]">Yaklaşan randevu yok</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">Yeni randevular burada görünecek</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {data.upcoming.map((item, i) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 transition-all duration-200 hover:shadow-sm"
                  style={{
                    opacity: ready ? 1 : 0, transform: ready ? "translateX(0)" : "translateX(-8px)",
                    transition: `opacity 0.3s ease ${i * 0.08 + 0.7}s, transform 0.3s ease ${i * 0.08 + 0.7}s`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-1)]">{item.customerName}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      item.status === "confirmed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {item.status === "confirmed" ? "✓ Onaylı" : "⏳ Bekliyor"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-3)]">
                    {new Date(item.startAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {item.serviceName ? ` · ${item.serviceName}` : ""}
                    {item.staffName ? ` · ${item.staffName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.7s, transform 0.5s ease 0.7s",
          }}
        >
          <h3 className="mb-4 font-bold text-[var(--text-1)]">⚡ Hızlı Erişim</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              { href: "/dashboard/hizmetler", label: "Hizmetler", icon: "💇", desc: "Hizmet ekle/düzenle", hoverColor: "hover:border-pink-400/40" },
              { href: "/dashboard/calisanlar", label: "Çalışanlar", icon: "👥", desc: "Ekip yönetimi", hoverColor: "hover:border-indigo-400/40" },
              { href: "/dashboard/calisma-saatleri", label: "Çalışma Saatleri", icon: "🕐", desc: "Saat ayarları", hoverColor: "hover:border-amber-400/40" },
              { href: "/dashboard/ayarlar", label: "Ayarlar", icon: "⚙️", desc: "İşletme bilgileri", hoverColor: "hover:border-sky-400/40" },
              { href: "/dashboard/musteriler", label: "Müşteriler", icon: "👤", desc: "Müşteri listesi", hoverColor: "hover:border-violet-400/40" },
              { href: "/dashboard/randevular", label: "Randevular", icon: "📅", desc: "Tüm randevular", hoverColor: "hover:border-emerald-400/40" },
            ].map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${link.hoverColor}`}
                style={{
                  opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 0.3s ease ${i * 0.05 + 0.8}s, transform 0.3s ease ${i * 0.05 + 0.8}s`,
                }}
              >
                <span className="text-2xl">{link.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{link.label}</p>
                  <p className="text-[10px] text-[var(--text-3)]">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
