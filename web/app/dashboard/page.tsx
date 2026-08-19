"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessById, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import type { Appointment } from "@/types/appointments";
import type { Business } from "@/types/business";
import {
  ArrowUpRight, Building2, CalendarCheck2, CalendarDays, CheckCircle2,
  CircleDollarSign, Clock3, Copy, Eye, FileText, FolderOpen, ImageIcon,
  Inbox, ListChecks, PartyPopper, Scissors, Settings2,
  UserRound, UsersRound, XCircle, Zap, type LucideIcon,
} from "lucide-react";

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
  icon: LucideIcon;
}

const EMPTY_DATA: DashboardData = {
  todayCount: 0, pending: 0, completed: 0, cancelled: 0,
  customerCount: 0, serviceCount: 0, staffCount: 0, todayRevenue: 0, upcoming: [],
};

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
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
            href: "/dashboard/ayarlar", icon: Building2,
          },
          {
            label: biz?.category && biz.category !== "diger" ? `Kategori: ${biz.category}` : "Kategori seçilmedi",
            done: !!(biz?.category && biz.category !== "diger"),
            href: "/dashboard/ayarlar", icon: FolderOpen,
          },
          {
            label: workingHours.length > 0 ? "Çalışma saatleri ayarlandı" : "Çalışma saatlerini ayarla",
            done: workingHours.length > 0, href: "/dashboard/calisma-saatleri", icon: Clock3,
          },
          {
            label: services.length > 0 ? `${services.length} hizmet eklendi` : "Henüz hizmet eklenmedi",
            done: services.length > 0, href: "/dashboard/hizmetler", icon: Scissors,
          },
          {
            label: staff.length > 0 ? `${staff.length} çalışan eklendi` : "Henüz çalışan eklenmedi",
            done: staff.length > 0, href: "/dashboard/calisanlar", icon: UserRound,
          },
          {
            label: biz?.logoUrl ? "Logo yüklendi" : "Logo yükle",
            done: !!biz?.logoUrl, href: "/dashboard/ayarlar", icon: ImageIcon,
          },
          {
            label: biz?.description && biz.description.length > 10 ? "Açıklama eklendi" : "Açıklama ekle",
            done: !!(biz?.description && biz.description.length > 10), href: "/dashboard/ayarlar", icon: FileText,
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
    { label: "Bugünkü Randevular", value: data.todayCount, icon: CalendarDays, tone: "ocean", note: "Günlük program" },
    { label: "Bekleyen", value: data.pending, icon: Clock3, tone: "amber", note: "Aksiyon bekliyor" },
    { label: "Tamamlanan", value: data.completed, icon: CheckCircle2, tone: "emerald", note: "Başarıyla tamamlandı" },
    { label: "İptaller", value: data.cancelled, icon: XCircle, tone: "rose", note: "Toplam iptal" },
    { label: "Toplam Müşteri", value: data.customerCount, icon: UsersRound, tone: "violet", note: "CRM büyüklüğü" },
    { label: "Toplam Hizmet", value: data.serviceCount, icon: Scissors, tone: "magenta", note: "Aktif portföy" },
    { label: "Toplam Çalışan", value: data.staffCount, icon: UserRound, tone: "indigo", note: "Ekip kapasitesi" },
    { label: "Bugünkü Gelir", value: data.todayRevenue, icon: CircleDollarSign, tone: "gold", note: "Tamamlanan işlemler", currency: true },
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
              <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-1)]"><ListChecks size={20} /> Profil Durumu</h3>
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
              (() => {
                const ItemIcon = item.icon;
                return (
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
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/50">{item.done ? <CheckCircle2 size={16} /> : <ItemIcon size={16} />}</span>
                <span className={item.done ? "line-through opacity-60" : ""}>{item.label}</span>
                {!item.done && (
                  <svg className="ml-auto h-4 w-4 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
                );
              })()
            ))}
          </div>
        </div>
      )}

      {/* All Complete Banner — Ultra Premium */}
      {allComplete && setupItems.length > 0 && (
        <div
          className="dashboard-profile-ready"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          {/* Animated gradient top border */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#06b6d4,#8b5cf6,#10b981)] bg-[length:200%_100%]" style={{ animation: "shimmer 3s linear infinite" }} />
          
          {/* Background particles */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute right-1/3 top-1/2 h-20 w-20 rounded-full bg-violet-500/5 blur-2xl" />

          <div className="dashboard-profile-ready__inner">
            <div className="dashboard-profile-ready__main">
              {/* Left side */}
              <div className="dashboard-profile-ready__identity">
                <div className="dashboard-profile-ready__icon">
                  <PartyPopper size={25} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--text-1)]">
                    Profiliniz hazır!
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-3)]">
                    İşletmeniz aktif — müşterileriniz online randevu alabiliyor.
                  </p>
                  
                  {/* Store URL display */}
                  {business?.slug && (
                    <div className="dashboard-profile-ready__url">
                      <Copy size={14} className="text-[var(--text-3)]" />
                      <code className="text-xs font-medium text-[var(--text-2)]">
                        seninrandevun.com/isletme/{business.slug}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side — Action buttons */}
              <div className="dashboard-profile-ready__actions">
                {business?.slug && (
                  <>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/isletme/${business.slug}`;
                        navigator.clipboard.writeText(url).then(() => {
                          toast.success("Mağaza linki kopyalandı.");
                        }).catch(() => {
                          toast.error("Kopyalama başarısız");
                        });
                      }}
                      className="profile-ready-copy"
                    >
                      <Copy size={17} />
                      Linki Kopyala
                    </button>
                    <Link
                      href={`/isletme/${business.slug}`}
                      className="profile-ready-view"
                    >
                      <Eye size={17} /> Profili Gör <ArrowUpRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Completion badges */}
            <div className="dashboard-profile-ready__checks">
              {setupItems.map((item) => (
                <span key={item.label}>{(() => { const SetupIcon = item.icon; return <SetupIcon size={14} />; })()}<b>{item.label}</b><CheckCircle2 size={13} /></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Store Link Quick Copy — shows even when profile incomplete */}
      {!allComplete && business?.slug && setupItems.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-3.5"
          style={{
            opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
          }}
        >
          <Copy size={15} />
          <code className="text-xs font-medium text-[var(--text-2)]">
            seninrandevun.com/isletme/{business.slug}
          </code>
          <button
            onClick={() => {
              const url = `${window.location.origin}/isletme/${business.slug}`;
              navigator.clipboard.writeText(url).then(() => {
                toast.success("Mağaza linki kopyalandı.");
              }).catch(() => {
                toast.error("Kopyalama başarısız");
              });
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Kopyala
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-kpi-grid">
        {statCards.map((stat, i) => (
          (() => {
            const StatIcon = stat.icon;
            return (
          <Link
            key={stat.label}
            href={stat.label.includes("Müşteri") ? "/dashboard/musteriler" : stat.label.includes("Hizmet") ? "/dashboard/hizmetler" : stat.label.includes("Çalışan") ? "/dashboard/calisanlar" : "/dashboard/randevular"}
            className={`dashboard-kpi-card kpi-${stat.tone}`}
            style={{
              opacity: ready ? 1 : 0, transform: ready ? undefined : "translateY(16px)",
              transition: `opacity 0.4s ease ${i * 0.05 + 0.2}s, transform 0.4s ease ${i * 0.05 + 0.2}s`,
            }}
          >
            <div className="dashboard-kpi-head"><p>{stat.label}</p><span><StatIcon size={21} strokeWidth={1.8} /></span></div>
            <strong><AnimatedNumber value={stat.value} suffix={stat.currency ? " ₺" : undefined} /></strong>
            <small>{stat.note}<ArrowUpRight size={13} /></small>
          </Link>
            );
          })()
        ))}
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
              <h3 className="flex items-center gap-2 font-bold text-[var(--text-1)]"><CalendarCheck2 size={19} /> Yaklaşan Randevular</h3>
              <p className="text-xs text-[var(--text-3)]">Sıradaki operasyon akışı</p>
            </div>
            {data.upcoming.length > 0 && (
              <Link href="/dashboard/randevular" className="text-xs font-medium text-[var(--accent)] hover:underline">Tümünü Gör →</Link>
            )}
          </div>
          {data.upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
              <Inbox className="mx-auto text-[var(--text-3)]" size={31} strokeWidth={1.5} />
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
                      {item.status === "confirmed" ? <><CheckCircle2 size={12} /> Onaylı</> : <><Clock3 size={12} /> Bekliyor</>}
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
          <h3 className="mb-4 flex items-center gap-2 font-bold text-[var(--text-1)]"><Zap size={19} /> Hızlı Erişim</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              { href: "/dashboard/hizmetler", label: "Hizmetler", icon: Scissors, desc: "Hizmet ekle/düzenle", hoverColor: "hover:border-pink-400/40" },
              { href: "/dashboard/calisanlar", label: "Çalışanlar", icon: UsersRound, desc: "Ekip yönetimi", hoverColor: "hover:border-indigo-400/40" },
              { href: "/dashboard/calisma-saatleri", label: "Çalışma Saatleri", icon: Clock3, desc: "Saat ayarları", hoverColor: "hover:border-amber-400/40" },
              { href: "/dashboard/ayarlar", label: "Ayarlar", icon: Settings2, desc: "İşletme bilgileri", hoverColor: "hover:border-sky-400/40" },
              { href: "/dashboard/musteriler", label: "Müşteriler", icon: UserRound, desc: "Müşteri listesi", hoverColor: "hover:border-violet-400/40" },
              { href: "/dashboard/randevular", label: "Randevular", icon: CalendarDays, desc: "Tüm randevular", hoverColor: "hover:border-emerald-400/40" },
            ].map((link, i) => (
              (() => {
                const LinkIcon = link.icon;
                return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${link.hoverColor}`}
                style={{
                  opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 0.3s ease ${i * 0.05 + 0.8}s, transform 0.3s ease ${i * 0.05 + 0.8}s`,
                }}
              >
                <span className="quick-link-icon"><LinkIcon size={20} strokeWidth={1.8} /></span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{link.label}</p>
                  <p className="text-[10px] text-[var(--text-3)]">{link.desc}</p>
                </div>
              </Link>
                );
              })()
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
