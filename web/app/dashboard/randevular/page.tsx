"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { BadgeCheck, Banknote, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown, CircleX, Clock3, Download, Mail, MapPin, PackagePlus, Phone, Plus, ReceiptText, Search, Sparkles, Timer, UserRound, UserX, X } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import {
  listAppointments,
  updateAppointmentAdditionalServices,
  updateAppointmentStatus,
} from "@/features/appointments/appointment-repository";
import { listServices } from "@/features/services/service-repository";
import type { Appointment, AppointmentServiceLine, AppointmentStatus } from "@/types/appointments";
import type { Service } from "@/types/service";

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; icon: ComponentType<{size?:number}> }
> = {
  pending: {
    label: "Beklemede",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock3,
  },
  confirmed: {
    label: "Onaylandı",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: BadgeCheck,
  },
  completed: {
    label: "Tamamlandı",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "İptal Edildi",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: CircleX,
  },
  no_show: {
    label: "Gelmedi",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
    icon: UserX,
  },
};

type FilterTab = "all" | AppointmentStatus;
type DateScope = "all" | "today" | "upcoming" | "past";

const FILTER_TABS: { key: FilterTab; label: string; icon: ComponentType<{size?:number}> }[] = [
  { key: "all", label: "Tümü", icon: CalendarDays },
  { key: "pending", label: "Bekleyen", icon: Clock3 },
  { key: "confirmed", label: "Onaylı", icon: BadgeCheck },
  { key: "completed", label: "Tamamlanan", icon: CheckCircle2 },
  { key: "cancelled", label: "İptal", icon: CircleX },
  { key: "no_show", label: "Gelmedi", icon: UserX },
];

export default function AppointmentsPage() {
  const { businessId, access } = useBusiness();
  const canManageStatus = access?.role !== "staff" || access.permissions.manageAppointments;
  const canViewCustomerContact = access?.role !== "staff" || access.permissions.viewCustomers;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateScope, setDateScope] = useState<DateScope>("all");
  const [serviceEditor, setServiceEditor] = useState<Appointment | null>(null);
  const [selectedExtraServiceIds, setSelectedExtraServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [savingServices, setSavingServices] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;

    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    Promise.all([listAppointments(businessId), listServices(businessId, true)])
      .then(([rows, serviceRows]) => {
        if (cancelled) return;
        setAppointments(rows);
        setServices(serviceRows);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAppointments([]);
        toast.error(error instanceof Error ? error.message : "Randevular yüklenemedi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    if (!serviceEditor) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingServices) setServiceEditor(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [serviceEditor, savingServices]);

  useEffect(() => {
    if (appointments.length === 0) return;
    const requestedId = new URLSearchParams(window.location.search).get("appointment");
    if (requestedId && appointments.some((item) => item.id === requestedId)) {
      queueMicrotask(() => setExpandedId(requestedId));
    }
  }, [appointments]);

  const filtered = useMemo(
    () =>
      appointments.filter((a) => {
        if (activeTab !== "all" && a.status !== activeTab) return false;
        const appointmentDate = new Date(a.startAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        if (dateScope === "today" && !(appointmentDate >= startOfToday && appointmentDate < startOfTomorrow)) return false;
        if (dateScope === "upcoming" && appointmentDate < now) return false;
        if (dateScope === "past" && appointmentDate >= now) return false;
        const needle=search.trim().toLocaleLowerCase("tr-TR");
        return !needle||`${a.customerName} ${a.customerPhone??""} ${a.serviceName??""} ${a.staffName??""}`.toLocaleLowerCase("tr-TR").includes(needle);
      }),
    [appointments, activeTab, dateScope, search]
  );

  const extraServiceOptions = useMemo(() => {
    if (!serviceEditor) return [];
    const options = new Map<string, AppointmentServiceLine>();
    services
      .filter((service) => service.id !== serviceEditor.serviceId && service.price > 0)
      .forEach((service) => options.set(service.id, {
        serviceId: service.id,
        name: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
      }));
    (serviceEditor.additionalServices ?? []).forEach((service) => {
      if (!options.has(service.serviceId)) options.set(service.serviceId, service);
    });
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [serviceEditor, services]);

  const visibleExtraServiceOptions = useMemo(() => {
    const needle = serviceSearch.trim().toLocaleLowerCase("tr-TR");
    return needle
      ? extraServiceOptions.filter((service) => service.name.toLocaleLowerCase("tr-TR").includes(needle))
      : extraServiceOptions;
  }, [extraServiceOptions, serviceSearch]);

  const selectedExtraServices = extraServiceOptions.filter((service) =>
    selectedExtraServiceIds.includes(service.serviceId)
  );
  const editorPreviousExtraPrice = (serviceEditor?.additionalServices ?? []).reduce((sum, item) => sum + item.price, 0);
  const editorPreviousExtraDuration = (serviceEditor?.additionalServices ?? []).reduce((sum, item) => sum + item.durationMinutes, 0);
  const editorBasePrice = serviceEditor
    ? serviceEditor.primaryServicePrice ?? Math.max(0, Number(serviceEditor.servicePrice ?? 0) - editorPreviousExtraPrice)
    : 0;
  const editorBaseDuration = serviceEditor
    ? serviceEditor.primaryServiceDurationMinutes ?? Math.max(0, Number(serviceEditor.serviceDurationMinutes ?? 0) - editorPreviousExtraDuration)
    : 0;
  const editorTotalPrice = editorBasePrice + selectedExtraServices.reduce((sum, item) => sum + item.price, 0);
  const editorTotalDuration = editorBaseDuration + selectedExtraServices.reduce((sum, item) => sum + item.durationMinutes, 0);
  const editorScheduleConflict = serviceEditor
    ? appointments.find((appointment) => {
        if (appointment.id === serviceEditor.id || appointment.staffId !== serviceEditor.staffId) return false;
        if (!["pending", "confirmed"].includes(appointment.status)) return false;
        const editedStart = new Date(serviceEditor.startAt).getTime();
        const editedEnd = editedStart + editorTotalDuration * 60_000;
        const otherStart = new Date(appointment.startAt).getTime();
        const otherEnd = new Date(appointment.endAt).getTime();
        return editedStart < otherEnd && editedEnd > otherStart;
      })
    : undefined;

  function openServiceEditor(appointment: Appointment) {
    setServiceEditor(appointment);
    setSelectedExtraServiceIds((appointment.additionalServices ?? []).map((item) => item.serviceId));
    setServiceSearch("");
  }

  function toggleExtraService(serviceId: string) {
    setSelectedExtraServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId]
    );
  }

  async function handleSaveAdditionalServices() {
    if (!businessId || !serviceEditor) return;
    setSavingServices(true);
    try {
      await updateAppointmentAdditionalServices(businessId, serviceEditor, selectedExtraServices);
      const refreshed = await listAppointments(businessId);
      setAppointments(refreshed);
      setServiceEditor(null);
      if (editorScheduleConflict) {
        toast.warning(`Hizmetler kaydedildi; yeni bitiş saati ${editorScheduleConflict.customerName} randevusuyla çakışıyor.`);
      } else {
        toast.success(selectedExtraServices.length > 0
          ? `${selectedExtraServices.length} ek hizmet randevuya işlendi.`
          : "Ek hizmetler randevudan kaldırıldı.");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Ek hizmetler güncellenemedi.");
    } finally {
      setSavingServices(false);
    }
  }

  function exportAppointments() {
    const rows = [
      ["Tarih", "Saat", "Müşteri", "Telefon", "E-posta", "Hizmet", "Çalışan", "Durum", "Ödeme", "Tutar"],
        ...filtered.map((item) => [formatDate(item.startAt), formatTime(item.startAt), item.customerName, item.customerPhone ?? "", item.customerEmail ?? "", [item.serviceName, ...(item.additionalServices ?? []).map((service) => service.name)].filter(Boolean).join(" + "), item.staffName ?? "", STATUS_CONFIG[item.status].label, item.paymentStatus, String(item.servicePrice ?? 0)]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `randevular-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = appointments.filter((a) => {
      const d = new Date(a.startAt);
      return d >= today && d <= todayEnd;
    }).length;

    const pendingCount = appointments.filter((a) => a.status === "pending").length;
    const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
    const completedCount = appointments.filter((a) => a.status === "completed").length;
    const totalRevenue = appointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + (a.servicePrice ?? 0), 0);

    return { todayCount, pendingCount, confirmedCount, completedCount, totalRevenue };
  }, [appointments]);

  async function handleStatusChange(id: string, nextStatus: AppointmentStatus) {
    if (!businessId) return;
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(businessId, id, nextStatus);
      const statusLabel = STATUS_CONFIG[nextStatus].label;
      toast.success(`Randevu ${statusLabel.toLowerCase()} olarak güncellendi`);
      setAppointments(await listAppointments(businessId));
    } catch {
      toast.error("Güncelleme başarısız oldu");
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return format(new Date(dateStr), "dd MMM yyyy", { locale: tr });
    } catch {
      return dateStr;
    }
  }

  function formatTime(dateStr: string): string {
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "";
    }
  }

  function isToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  return (
    <div className="space-y-6 dashboard-appointments-premium">
      <section className="appointments-command-hero relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8">
        <div className="appointments-command-orb absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10"/>
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><span className="appointments-command-kicker flex items-center gap-2 text-[10px] font-black tracking-[.18em]"><Sparkles size={14}/> OPERASYON MERKEZİ</span><h1 className="mt-3 font-[var(--font-space-grotesk)] text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Randevu akışınız,<br/>kontrolünüz altında.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-white/60">Günün programını izleyin, müşteriye ulaşın ve durumları tek dokunuşla güncelleyin.</p></div><label className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-xl lg:w-[390px]"><Search size={18} className="appointments-command-kicker"/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Müşteri, hizmet veya telefon ara…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"/></label></div>
      </section>
      {/* ━━━ Stats Header ━━━ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[
          { label: "Bugün", value: stats.todayCount, icon: CalendarDays, tone: "#1597d4" },
          { label: "Bekleyen", value: stats.pendingCount, icon: Clock3, tone: "#d88916" },
          { label: "Onaylı", value: stats.confirmedCount, icon: BadgeCheck, tone: "#0b9e6f" },
          { label: "Tamamlanan", value: stats.completedCount, icon: CheckCircle2, tone: "#7255dc" },
          { label: "Toplam Gelir", value: `${stats.totalRevenue.toLocaleString("tr-TR")} ₺`, icon: Banknote, tone: "#c05272" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[.08]" style={{background:stat.tone}} />
            <div className="relative"><span className="mb-4 grid h-10 w-10 place-items-center rounded-[13px]" style={{background:`color-mix(in srgb, ${stat.tone} 12%, transparent)`,color:stat.tone}}><stat.icon size={19}/></span>
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text-3)]">{stat.label}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text-1)]">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ Filter Tabs ━━━ */}
      <div className="flex gap-1 overflow-x-auto rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-sm">
        {FILTER_TABS.map((tab) => { const TabIcon=tab.icon;
          const count =
            tab.key === "all"
              ? appointments.length
              : appointments.filter((a) => a.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "appointment-filter-active text-white shadow-md"
                  : "text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
              }`}
            >
              <TabIcon size={15}/>
              {tab.label}
              <span
                className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-3)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="appointment-date-toolbar">
        <div className="appointment-date-scope"><span><CalendarDays size={17}/> Tarih</span>{([{key:"all",label:"Tümü"},{key:"today",label:"Bugün"},{key:"upcoming",label:"Yaklaşan"},{key:"past",label:"Geçmiş"}] as const).map((scope) => <button type="button" key={scope.key} className={dateScope === scope.key ? "active" : ""} onClick={() => setDateScope(scope.key)}>{scope.label}</button>)}<small>{filtered.length} sonuç</small></div>
        <button type="button" onClick={exportAppointments} disabled={filtered.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"><Download size={15}/> CSV dışa aktar</button>
      </div>

      {/* ━━━ Appointment Cards ━━━ */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-48 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-2)]">
            <CalendarDays size={28} className="text-[var(--accent)]"/>
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-1)]">
            Randevu Bulunamadı
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[var(--text-3)]">
            {activeTab === "all"
              ? "Henüz randevu oluşturulmamış."
              : `"${FILTER_TABS.find((t) => t.key === activeTab)?.label}" durumunda randevu yok.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appointment, idx) => {
            const statusCfg = STATUS_CONFIG[appointment.status];
            const StatusIcon = statusCfg.icon;
            const expanded = expandedId === appointment.id;
            const isUpdating = updatingId === appointment.id;
            const todayBadge = isToday(appointment.startAt);
            const past = isPast(appointment.startAt);

            return (
              <div
                key={appointment.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className={`appointment-admin-card status-${appointment.status} animate-[fadeInUp_0.4s_ease_forwards] opacity-0 ${expanded ? "is-expanded" : ""}`}
              >
                {/* Main row */}
                <div
                  className="appointment-admin-summary"
                  onClick={() => setExpandedId(expanded ? null : appointment.id)}
                >
                  {/* Avatar */}
                  <div className="appointment-customer-avatar appointment-admin-avatar">
                    {appointment.customerName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="appointment-admin-person">
                    <div className="flex items-center gap-2">
                      <h3>
                        {appointment.customerName}
                      </h3>
                      {todayBadge && (
                        <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                          BUGÜN
                        </span>
                      )}
                    </div>
                    <div className="appointment-admin-meta">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13}/> {formatDate(appointment.startAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 size={13}/> {formatTime(appointment.startAt)}
                        {appointment.endAt && ` - ${formatTime(appointment.endAt)}`}
                      </span>
                        {appointment.serviceName && (
                          <span className="flex items-center gap-1">
                            <BriefcaseBusiness size={13}/> {appointment.serviceName}
                            {(appointment.additionalServices?.length ?? 0) > 0 && (
                              <b className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-700">
                                +{appointment.additionalServices?.length} ek
                              </b>
                            )}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="appointment-admin-status hidden sm:block">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}
                    >
                      <StatusIcon size={14}/> {statusCfg.label}
                    </span>
                  </div>

                  {/* Price */}
                  {appointment.servicePrice != null && appointment.servicePrice > 0 && (
                    <p className="appointment-admin-price hidden sm:block">
                      {appointment.servicePrice.toLocaleString("tr-TR")} ₺
                    </p>
                  )}

                  {/* Expand arrow */}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[var(--text-3)] transition-transform duration-300 ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Mobile Status Badge */}
                <div className="appointment-admin-mobile-status sm:hidden">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}
                  >
                    <StatusIcon size={13}/> {statusCfg.label}
                  </span>
                  {appointment.servicePrice != null && appointment.servicePrice > 0 && (
                    <span className="text-xs font-bold text-[var(--text-1)]">
                      {appointment.servicePrice.toLocaleString("tr-TR")} ₺
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="appointment-admin-details">
                    {/* Detail Grid */}
                    <div className="appointment-admin-facts">
                      {appointment.staffName && (
                        <DetailItem icon={<UserRound size={16}/>} label="Çalışan" value={appointment.staffName} />
                      )}
                      {appointment.serviceName && (
                        <DetailItem icon={<BriefcaseBusiness size={16}/>} label="Hizmet" value={appointment.serviceName} />
                      )}
                      {appointment.serviceDurationMinutes && (
                        <DetailItem icon={<Timer size={16}/>} label="Süre" value={`${appointment.serviceDurationMinutes} dk`} />
                      )}
                      {canViewCustomerContact && appointment.customerPhone && (
                        <DetailItem icon={<Phone size={16}/>} label="Telefon" value={appointment.customerPhone} />
                      )}
                      {canViewCustomerContact && appointment.customerEmail && (
                        <DetailItem icon={<Mail size={16}/>} label="E-posta" value={appointment.customerEmail} />
                      )}
                      {appointment.source && (
                        <DetailItem
                          icon={<MapPin size={16}/>}
                          label="Kaynak"
                          value={
                            appointment.source === "online"
                              ? "Online"
                              : appointment.source === "dashboard"
                              ? "Panel"
                              : appointment.source === "phone"
                              ? "Telefon"
                              : "Yürüyerek"
                          }
                        />
                      )}
                    </div>

                    {(appointment.additionalServices?.length ?? 0) > 0 && (
                      <div className="mt-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[.055] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-emerald-700">
                            <PackagePlus size={14}/> Eklenen hizmetler
                          </p>
                          <span className="text-[10px] font-bold text-[var(--text-3)]">
                            {appointment.additionalServices?.length} hizmet
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {appointment.additionalServices?.map((service) => (
                            <span key={service.serviceId} className="rounded-xl border border-emerald-500/15 bg-[var(--surface-1)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-2)]">
                              {service.name} · {service.durationMinutes} dk · {service.price.toLocaleString("tr-TR")} ₺
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3">
                        <p className="text-xs font-bold tracking-wide text-[var(--text-3)]">RANDEVU NOTU</p>
                        <p className="mt-0.5 text-sm text-[var(--text-1)]">{appointment.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="appointment-admin-actions"><div><small>HIZLI İŞLEMLER</small><b>Randevuyu buradan yönetin</b></div><nav>
                      {canManageStatus && !["cancelled", "no_show"].includes(appointment.status) && appointment.paymentStatus !== "paid" && (
                        <Link
                          href={`/dashboard/operasyon?appointment=${encodeURIComponent(appointment.id)}`}
                          className="appointment-action appointment-action--checkout"
                        >
                          <ReceiptText size={15}/> Adisyon aç
                        </Link>
                      )}
                      {canManageStatus && !["cancelled", "no_show"].includes(appointment.status) && (
                        <button
                          type="button"
                          onClick={() => openServiceEditor(appointment)}
                          disabled={isUpdating}
                          className="appointment-action appointment-action--service"
                        >
                          <Plus size={15}/> Hizmet Ekle / Düzenle
                        </button>
                      )}
                      {canManageStatus && appointment.status === "pending" && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "confirmed")}
                          disabled={isUpdating}
                          variant="confirm"
                        >
                          <BadgeCheck size={15}/> Onayla
                        </ActionButton>
                      )}
                      {canManageStatus && ["pending", "confirmed"].includes(appointment.status) && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "completed")}
                          disabled={isUpdating}
                          variant="complete"
                        >
                          <Check size={15}/> Tamamla
                        </ActionButton>
                      )}
                      {canManageStatus && ["pending", "confirmed"].includes(appointment.status) && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "cancelled")}
                          disabled={isUpdating}
                          variant="cancel"
                        >
                          <CircleX size={15}/> İptal Et
                        </ActionButton>
                      )}
                      {canManageStatus && appointment.status !== "no_show" && past && (
                        <ActionButton
                          onClick={() => handleStatusChange(appointment.id, "no_show")}
                          disabled={isUpdating}
                          variant="noshow"
                        >
                          <UserX size={15}/> Gelmedi
                        </ActionButton>
                      )}
                      {canViewCustomerContact && appointment.customerPhone && (
                        <a
                          href={`tel:${appointment.customerPhone}`}
                          className="appointment-action appointment-action--contact"
                        >
                          <Phone size={15}/> Ara
                        </a>
                      )}
                    </nav></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {serviceEditor && typeof document !== "undefined" && createPortal((
        <div
          className="appointment-services-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingServices) setServiceEditor(null);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="extra-services-title" className="appointment-services-modal">
            <header className="appointment-services-head">
              <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-cyan-300/15 blur-2xl"/>
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-cyan-200"><PackagePlus size={22}/></span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">RANDEVU HİZMETLERİ</p>
                    <h2 id="extra-services-title" className="mt-1 text-xl font-extrabold sm:text-2xl">Ek hizmet ekle</h2>
                    <p className="mt-1 text-xs leading-5 text-white/65">
                      {serviceEditor.customerName} · Ana hizmet: <b className="text-white/90">{serviceEditor.serviceName ?? "Hizmet"}</b>
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setServiceEditor(null)} disabled={savingServices} aria-label="Ek hizmet penceresini kapat" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white hover:text-[#102c27] disabled:opacity-50"><X size={18}/></button>
              </div>
              <label className="relative mt-5 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                <Search size={15} className="text-cyan-200"/>
                <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Ek hizmet ara…" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/45"/>
                <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold">{selectedExtraServices.length} seçili</span>
              </label>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-6">
              {visibleExtraServiceOptions.length === 0 ? (
                <div className="grid min-h-48 place-items-center text-center">
                  <div><PackagePlus className="mx-auto text-[var(--text-3)]" size={30}/><h3 className="mt-3 text-sm font-bold text-[var(--text-1)]">Uygun ek hizmet bulunamadı</h3><p className="mt-1 text-xs text-[var(--text-3)]">Aktif ve fiyatı tanımlanmış hizmetler burada görünür.</p></div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleExtraServiceOptions.map((service) => {
                    const selected = selectedExtraServiceIds.includes(service.serviceId);
                    return (
                      <button key={service.serviceId} type="button" aria-pressed={selected} onClick={() => toggleExtraService(service.serviceId)} className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${selected ? "border-emerald-500 bg-emerald-500/[.07] shadow-md shadow-emerald-900/5" : "border-[var(--border)] bg-[var(--surface-1)] hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${selected ? "bg-emerald-600 text-white" : "bg-[var(--surface-2)] text-[var(--text-3)]"}`}>{selected ? <Check size={16} strokeWidth={3}/> : <Plus size={16}/>}</span>
                        <span className="min-w-0 flex-1"><b className="block truncate text-xs text-[var(--text-1)]">{service.name}</b><small className="mt-0.5 block text-[10px] text-[var(--text-3)]">{service.durationMinutes} dk · {service.price.toLocaleString("tr-TR")} ₺</small></span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 sm:px-7">
              {editorScheduleConflict && (
                <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-4 text-amber-800">
                  Yeni bitiş saati {editorScheduleConflict.customerName} müşterisinin {formatTime(editorScheduleConflict.startAt)} randevusuyla çakışıyor. Hizmeti yine de kaydedebilirsiniz; programı kontrol edin.
                </div>
              )}
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[var(--surface-1)] p-2.5"><small className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-3)]">Ek hizmet</small><b className="mt-0.5 block text-sm text-[var(--text-1)]">{selectedExtraServices.length}</b></div>
                <div className="rounded-xl bg-[var(--surface-1)] p-2.5"><small className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-3)]">Toplam süre</small><b className="mt-0.5 block text-sm text-[var(--text-1)]">{editorTotalDuration} dk</b></div>
                <div className="rounded-xl bg-[var(--surface-1)] p-2.5"><small className="block text-[9px] font-bold uppercase tracking-wider text-[var(--text-3)]">Toplam tutar</small><b className="mt-0.5 block text-sm text-emerald-700">{editorTotalPrice.toLocaleString("tr-TR")} ₺</b></div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setServiceEditor(null)} disabled={savingServices} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-xs font-bold text-[var(--text-2)] disabled:opacity-50">Vazgeç</button>
                <button type="button" onClick={handleSaveAdditionalServices} disabled={savingServices} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-600 disabled:opacity-50">{savingServices ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"/> : <Check size={15}/>} {savingServices ? "Kaydediliyor…" : "Hizmetleri Kaydet"}</button>
              </div>
            </footer>
          </section>
        </div>
      ), document.body)}

      {/* Inline keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="appointment-admin-fact">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">
        <span className="inline-flex items-center gap-1.5">{icon} {label}</span>
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text-1)]">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "confirm" | "complete" | "cancel" | "noshow";
  children: ReactNode;
}) {
  const styles = {
    confirm: "appointment-action--confirm",
    complete: "appointment-action--complete",
    cancel: "appointment-action--cancel",
    noshow: "appointment-action--noshow",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`appointment-action ${styles[variant]}`}
    >
      {disabled ? (
        <svg className="appointment-action-spinner animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
