"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight, ArrowUpRight, Building2, CalendarCheck2, CalendarDays,
  CircleDollarSign, Clock3, FileText, FolderOpen, ImageIcon,
  MessageCircleMore, Scissors, Settings2, Sparkles, UserRound, UsersRound,
  WalletCards, Zap, type LucideIcon,
} from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessById, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { SetupAssistant, type SetupAssistantStep } from "@/components/dashboard/setup-assistant";
import type { Appointment } from "@/types/appointments";
import type { Business } from "@/types/business";

interface DashboardData {
  todayCount: number;
  waitingCount: number;
  completedCount: number;
  customerCount: number;
  todayRevenue: number;
  upcoming: Appointment[];
}

interface SetupItem {
  id: "business" | "category" | "hours" | "services" | "staff" | "logo" | "description";
  label: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
}

const EMPTY_DATA: DashboardData = {
  todayCount: 0,
  waitingCount: 0,
  completedCount: 0,
  customerCount: 0,
  todayRevenue: 0,
  upcoming: [],
};

export default function DashboardHomePage() {
  const { businessId, access } = useBusiness();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [business, setBusiness] = useState<Business | null>(null);
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let active = true;

    Promise.all([
      listAppointments(businessId),
      listCustomers(businessId),
      listServices(businessId),
      listStaff(businessId),
      getBusinessById(businessId),
      listBusinessWorkingHours(businessId),
    ])
      .then(([appointments, customers, services, staff, currentBusiness, workingHours]) => {
        if (!active) return;
        const now = Date.now();
        const today = new Date(now).toDateString();
        const todayAppointments = appointments.filter(
          (item) => new Date(item.startAt).toDateString() === today,
        );
        const upcoming = appointments
          .filter(
            (item) =>
              ["pending", "confirmed"].includes(item.status) &&
              new Date(item.startAt).getTime() > now,
          )
          .sort(
            (left, right) =>
              new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
          )
          .slice(0, 4);

        setBusiness(currentBusiness);
        setData({
          todayCount: todayAppointments.length,
          waitingCount: todayAppointments.filter((item) => item.status === "pending").length,
          completedCount: todayAppointments.filter((item) => item.status === "completed").length,
          customerCount: customers.length,
          todayRevenue: todayAppointments
            .filter((item) => item.status === "completed")
            .reduce((sum, item) => sum + (item.servicePrice ?? 0), 0),
          upcoming,
        });
        setSetupItems([
          {
            id: "business",
            label: "İşletme bilgilerini tamamla",
            done: Boolean(
              currentBusiness?.name &&
                currentBusiness.phone &&
                currentBusiness.email &&
                currentBusiness.address &&
                currentBusiness.city &&
                currentBusiness.district,
            ),
            href: "/dashboard/ayarlar",
            icon: Building2,
          },
          {
            id: "category",
            label: "İşletme kategorisini seç",
            done: Boolean(currentBusiness?.category && currentBusiness.category !== "diger"),
            href: "/dashboard/ayarlar",
            icon: FolderOpen,
          },
          {
            id: "hours",
            label: "Çalışma saatlerini ayarla",
            done: workingHours.length > 0,
            href: "/dashboard/calisma-saatleri",
            icon: Clock3,
          },
          {
            id: "services",
            label: "İlk hizmetini ekle",
            done: services.length > 0,
            href: "/dashboard/hizmetler",
            icon: Scissors,
          },
          {
            id: "staff",
            label: "Ekibini tanımla",
            done: staff.length > 0,
            href: "/dashboard/calisanlar",
            icon: UserRound,
          },
          {
            id: "logo",
            label: "Logo ekle",
            done: Boolean(currentBusiness?.logoUrl),
            href: "/dashboard/ayarlar",
            icon: ImageIcon,
          },
          {
            id: "description",
            label: "İşletme açıklamasını ekle",
            done: Boolean(currentBusiness?.description && currentBusiness.description.length > 10),
            href: "/dashboard/ayarlar",
            icon: FileText,
          },
        ]);
        setLoadError(null);
        setReady(true);
      })
      .catch((error) => {
        if (!active) return;
        const message = userFacingError(
          error,
          "İşletme verileri şu anda alınamadı. Lütfen yeniden deneyin.",
        );
        setLoadError(message);
        setReady(true);
        toast.error(message);
      });

    return () => {
      active = false;
    };
  }, [businessId]);

  const completedSteps = setupItems.filter((item) => item.done).length;
  const nextSetupItem = setupItems.find((item) => !item.done);
  const isPublished = business?.status === "active" && business.isPublished === true;
  const bookingHref = "/dashboard/takvim?new=1";
  const setupDone = (id: SetupItem["id"]) =>
    setupItems.find((item) => item.id === id)?.done === true;

  const assistantSteps: SetupAssistantStep[] = [
    {
      title: "Mağaza profilini tamamla",
      description: "İşletme bilgilerini, kategoriyi, açıklamayı ve logonu tamamla.",
      href: "/dashboard/ayarlar",
      action: "Profil ayarlarını aç",
      done: ["business", "category", "logo", "description"].every((id) =>
        setupDone(id as SetupItem["id"]),
      ),
    },
    {
      title: "Çalışma saatlerini kontrol et",
      description: "Açık günleri, molaları ve kapanış saatini düzenle.",
      href: "/dashboard/calisma-saatleri",
      action: "Saatleri kontrol et",
      done: setupDone("hours"),
    },
    {
      title: "Hizmetlerini ekle",
      description: "Randevu alınacak hizmetleri, sürelerini ve fiyatlarını ekle.",
      href: "/dashboard/hizmetler",
      action: "Hizmet ekle",
      done: setupDone("services"),
    },
    {
      title: "Ekibini tanımla",
      description: "Hizmet verecek kişileri ve uzmanlıklarını seç.",
      href: "/dashboard/calisanlar",
      action: "Çalışan ekle",
      done: setupDone("staff"),
    },
  ];

  const summary = [
    {
      label: "Bugünkü randevu",
      value: data.todayCount.toLocaleString("tr-TR"),
      note: `${data.completedCount} tamamlandı`,
      href: "/dashboard/randevular",
      icon: CalendarDays,
      tone: "is-core",
    },
    {
      label: "Onay bekleyen",
      value: data.waitingCount.toLocaleString("tr-TR"),
      note: data.waitingCount ? "Kontrol etmeniz gerekiyor" : "Bekleyen işlem yok",
      href: "/dashboard/randevular",
      icon: Clock3,
      tone: "is-deep",
    },
    {
      label: "Bugünkü tahsilat",
      value: `${data.todayRevenue.toLocaleString("tr-TR")} ₺`,
      note: "Tamamlanan işlemler",
      href: "/dashboard/operasyon",
      icon: CircleDollarSign,
      tone: "is-bright",
    },
    {
      label: "Kayıtlı müşteri",
      value: data.customerCount.toLocaleString("tr-TR"),
      note: "Müşteri kayıtları",
      href: "/dashboard/musteriler",
      icon: UsersRound,
      tone: "is-blend",
    },
  ];

  const quickActions = [
    {
      label: "Yeni randevu",
      text: "Takvime yeni kayıt ekle",
      href: bookingHref,
      icon: CalendarCheck2,
      tone: "is-core",
    },
    {
      label: "Müşteriler",
      text: "Kayıtları ve geçmişi gör",
      href: "/dashboard/musteriler",
      icon: UsersRound,
      tone: "is-blend",
    },
    {
      label: "Kasa & işlemler",
      text: "Tahsilat ve paketleri yönet",
      href: "/dashboard/operasyon",
      icon: WalletCards,
      tone: "is-bright",
    },
    {
      label: "Çalışma ayarları",
      text: "Hizmet, ekip ve saatler",
      href: "/dashboard/ayarlar",
      icon: Settings2,
      tone: "is-deep",
    },
  ];

  return (
    <main className="space-y-5 pb-10">
      {access?.role !== "staff" && (
        <SetupAssistant
          businessId={businessId ?? ""}
          ready={ready}
          steps={assistantSteps}
        />
      )}

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      )}

      <section className="dashboard-today-hero dashboard-theme-hero relative overflow-hidden rounded-[28px] p-5 text-white sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <span className="dashboard-theme-hero__kicker inline-flex items-center gap-2 text-[11px] font-black tracking-[.16em]">
              <Sparkles size={14} /> BUGÜN
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">
              {business?.name ?? "İşletmeniz"} için günün özeti
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/75 sm:text-base">
              {!isPublished
                ? "Kurulumunuzu tamamlayın; mağazanız onaylandığında randevu almaya hazır olacak."
                : data.todayCount
                  ? `Bugün ${data.todayCount} randevunuz var. ${data.waitingCount ? `${data.waitingCount} randevu onayınızı bekliyor.` : "Bekleyen onay bulunmuyor."}`
                  : "Bugün için kayıtlı randevu yok. Takviminizi buradan yönetebilirsiniz."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href={bookingHref}
                className="dashboard-theme-hero__primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition"
              >
                <CalendarCheck2 size={17} /> Yeni randevu
              </Link>
              <Link
                href="/dashboard/takvim"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Takvimi aç <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black tracking-[.14em] text-emerald-100">
                SIRADAKİ RANDEVU
              </span>
              <span className="text-xs font-semibold text-white/65">
                {new Date().toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            {data.upcoming[0] ? (
              <Link
                href="/dashboard/randevular"
                className="mt-4 flex items-center gap-4 rounded-xl bg-white p-4 text-[#10291d]"
              >
                <time className="text-2xl font-black">
                  {new Date(data.upcoming[0].startAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-base">{data.upcoming[0].customerName}</b>
                  <small className="block truncate text-xs font-semibold text-slate-500">
                    {data.upcoming[0].serviceName ?? "Hizmet"}
                    {data.upcoming[0].staffName ? ` · ${data.upcoming[0].staffName}` : ""}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/20 p-4">
                <CalendarDays size={23} />
                <span>
                  <b className="block text-sm">Yaklaşan randevu yok</b>
                  <small className="text-xs text-white/65">Yeni kayıtlar burada görünecek.</small>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summary.map(({ icon: Icon, ...item }) => (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-[var(--text-3)] sm:text-sm">{item.label}</span>
              <i className={`dashboard-kpi-tone ${item.tone} grid h-9 w-9 shrink-0 place-items-center rounded-xl`}>
                <Icon size={18} />
              </i>
            </div>
            <strong className="mt-3 block text-2xl font-black tracking-tight text-[var(--text-1)] sm:text-3xl">
              {item.value}
            </strong>
            <small className="mt-1 block text-[11px] font-semibold text-[var(--text-3)] sm:text-xs">
              {item.note}
            </small>
          </Link>
        ))}
      </section>

      {nextSetupItem && (
        <section className="dashboard-setup-nudge rounded-2xl p-4 sm:flex sm:items-center sm:gap-4 sm:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="dashboard-setup-nudge__icon grid h-11 w-11 shrink-0 place-items-center rounded-xl">
              <nextSetupItem.icon size={21} />
            </span>
            <div className="min-w-0">
              <span className="dashboard-setup-nudge__label text-[10px] font-black tracking-[.12em]">
                KURULUM · {completedSteps}/{setupItems.length}
              </span>
              <h2 className="truncate text-base font-black text-[var(--text-1)]">
                Sıradaki adım: {nextSetupItem.label}
              </h2>
            </div>
          </div>
          <Link
            href={nextSetupItem.href}
            className="dashboard-setup-nudge__action mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold sm:mt-0 sm:w-auto"
          >
            Adımı tamamla <ArrowRight size={15} />
          </Link>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm sm:p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-[var(--text-1)]">
                <CalendarCheck2 size={20} /> Yaklaşan randevular
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[var(--text-3)]">Sıradaki dört kayıt</p>
            </div>
            <Link href="/dashboard/randevular" className="text-xs font-bold text-[var(--accent)]">
              Tümünü gör
            </Link>
          </header>

          {data.upcoming.length ? (
            <div className="space-y-2">
              {data.upcoming.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/dashboard/randevular?appointment=${encodeURIComponent(appointment.id)}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 transition hover:border-[var(--accent)]/30"
                >
                  <time className="w-12 shrink-0 text-base font-black text-[var(--accent)]">
                    {new Date(appointment.startAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-[var(--text-1)]">{appointment.customerName}</b>
                    <small className="block truncate text-xs font-medium text-[var(--text-3)]">
                      {appointment.serviceName ?? "Hizmet"}
                      {appointment.staffName ? ` · ${appointment.staffName}` : ""}
                    </small>
                  </span>
                  <span className="hidden rounded-full bg-[var(--surface-1)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-2)] sm:inline-flex">
                    {appointment.status === "confirmed" ? "Onaylı" : "Bekliyor"}
                  </span>
                  <ArrowRight size={15} className="text-[var(--text-3)]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-5 py-9 text-center">
              <CalendarDays className="mx-auto text-[var(--text-3)]" size={30} />
              <b className="mt-2 block text-sm text-[var(--text-1)]">Yaklaşan randevu yok</b>
              <p className="mt-1 text-xs font-medium text-[var(--text-3)]">
                Yeni randevu eklediğinizde burada görünecek.
              </p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm sm:p-5">
          <header className="mb-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-[var(--text-1)]">
              <Zap size={20} /> Sık kullanılanlar
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--text-3)]">
              En çok ihtiyaç duyacağınız işlemler
            </p>
          </header>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map(({ icon: Icon, ...action }) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 transition hover:border-[var(--accent)]/35"
              >
                <span className={`dashboard-action-icon ${action.tone} grid h-9 w-9 shrink-0 place-items-center rounded-xl`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-[var(--text-1)]">{action.label}</b>
                  <small className="block truncate text-[11px] font-medium text-[var(--text-3)]">
                    {action.text}
                  </small>
                </span>
                <ArrowRight size={15} className="text-[var(--text-3)]" />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-rovi-prompt flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
        <span className="dashboard-rovi-prompt__icon grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white">
          <MessageCircleMore size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="dashboard-rovi-prompt__label text-[10px] font-black tracking-[.12em]">
            ROVİ YARDIMCINIZ
          </span>
          <h2 className="text-base font-black text-[var(--text-1)]">Bir işlemi bulamadınız mı?</h2>
          <p className="text-xs font-medium text-[var(--text-3)]">
            Rovi&apos;ye sorun; sizi doğru ekrana yönlendirsin ve işletme verilerinizi açıklasın.
          </p>
        </div>
        <Link
          href="/dashboard/asistan"
          className="dashboard-rovi-prompt__action inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white"
        >
          Rovi&apos;ye sor <Sparkles size={15} />
        </Link>
      </section>
    </main>
  );
}
