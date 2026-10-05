"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import {
  BadgeCheck, Banknote, CalendarClock, CalendarDays, Check, CheckCircle2, CircleX, Clock3, Download, ListChecks, PackagePlus,
  Phone, Plus, ReceiptText, Search, UserX,
} from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import {
  listAppointments,
  rescheduleAppointment,
  updateAppointmentAdditionalServices,
  updateAppointmentStatus,
} from "@/features/appointments/appointment-repository";
import { listServices } from "@/features/services/service-repository";
import { AppointmentCustomFields } from "@/features/booking-fields/appointment-custom-fields";
import { millisToZonedDateTime, zonedDateTimeToMillis } from "@/lib/time/zoned";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { APPOINTMENTS_CHANGED_EVENT, openQuickAppointment } from "@/components/dashboard/dashboard-events";
import {
  Badge, Button, Callout, ConfirmSheet, DashPage, DataTable, EmptyState, Field, FormGrid, Input, KeyValueList, PageHeader, Panel,
  SearchField, SegmentedControl, Sheet, StatCard, StatGrid, StatusPill, Toolbar, appointmentStatusMeta, type DataColumn,
} from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import type { Appointment, AppointmentServiceLine, AppointmentStatus } from "@/types/appointments";
import type { Service } from "@/types/service";
import styles from "./appointments.module.css";

type FilterTab = "all" | AppointmentStatus;
type DateScope = "all" | "today" | "upcoming" | "past" | "custom";
const PAGE = 40;

const SOURCE_LABEL: Record<string, string> = { online: "Online", dashboard: "Panel", phone: "Telefon", walk_in: "Yürüyerek" };
const PAYMENT_LABEL: Record<string, string> = { paid: "Ödendi", deposit_paid: "Kapora ödendi", refunded: "İade edildi", unpaid: "Ödeme bekliyor" };

function formatDate(value: string) { try { return format(new Date(value), "d MMM yyyy", { locale: tr }); } catch { return value; } }
function formatTime(value: string) { try { return format(new Date(value), "HH:mm"); } catch { return ""; } }
function servicesOf(item: Appointment) { return [item.serviceName, ...(item.additionalServices ?? []).map((service) => service.name)].filter(Boolean).join(" + "); }
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(date).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  return format(date, "d MMM, EEE", { locale: tr });
}

export default function AppointmentsPage() {
  const { businessId, access } = useBusiness();
  const canManageStatus = access?.role !== "staff" || Boolean(access?.permissions.manageAppointments);
  const canViewCustomerContact = access?.role !== "staff" || Boolean(access?.permissions.viewCustomers);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [dateScope, setDateScope] = useState<DateScope>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null);
  // Ek hizmet düzenleyici
  const [serviceEditor, setServiceEditor] = useState<Appointment | null>(null);
  const [selectedExtraServiceIds, setSelectedExtraServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [savingServices, setSavingServices] = useState(false);
  // Saat değiştirme
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const reload = useCallback(async () => {
    if (!businessId) return;
    setAppointments(await listAppointments(businessId));
  }, [businessId]);

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
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    const onChanged = () => { void reload().catch(() => undefined); };
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
  }, [reload]);

  // ?status=pending ve ?appointment=<id> desteği (bildirimler, Bugün ekranı, komut merkezi).
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (status && status in appointmentStatusMeta) queueMicrotask(() => setActiveTab(status as AppointmentStatus));
  }, []);
  useEffect(() => {
    if (appointments.length === 0) return;
    const requestedId = new URLSearchParams(window.location.search).get("appointment");
    if (requestedId && appointments.some((item) => item.id === requestedId)) queueMicrotask(() => setSelectedId(requestedId));
  }, [appointments]);

  const selected = appointments.find((item) => item.id === selectedId) ?? null;

  const scoped = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    return appointments.filter((a) => {
      const date = new Date(a.startAt);
      if (dateScope === "today" && !(date >= startOfToday && date < startOfTomorrow)) return false;
      if (dateScope === "upcoming" && date < now) return false;
      if (dateScope === "past" && date >= now) return false;
      if (dateScope === "custom" && ((from && date < from) || (to && date > to))) return false;
      return !needle || `${a.customerName} ${a.customerPhone ?? ""} ${servicesOf(a)} ${a.staffName ?? ""}`.toLocaleLowerCase("tr-TR").includes(needle);
    });
  }, [appointments, dateScope, fromDate, toDate, search]);

  const counts = useMemo(() => {
    const result: Record<FilterTab, number> = { all: scoped.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    scoped.forEach((item) => { result[item.status] = (result[item.status] ?? 0) + 1; });
    return result;
  }, [scoped]);

  // Yaklaşanlar yakından uzağa, geçmişler yeniden eskiye.
  const filtered = useMemo(() => {
    const rows = activeTab === "all" ? scoped : scoped.filter((item) => item.status === activeTab);
    const upcoming = rows.filter((item) => new Date(item.startAt).getTime() >= now).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const past = rows.filter((item) => new Date(item.startAt).getTime() < now).sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt));
    return dateScope === "past" ? past : [...upcoming, ...past];
  }, [activeTab, dateScope, now, scoped]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = today.getTime() + 86_400_000;
    const todayItems = appointments.filter((a) => { const t = new Date(a.startAt).getTime(); return t >= today.getTime() && t < end; });
    return {
      todayCount: todayItems.filter((a) => a.status !== "cancelled").length,
      pendingCount: appointments.filter((a) => a.status === "pending").length,
      upcomingConfirmed: appointments.filter((a) => a.status === "confirmed" && new Date(a.startAt).getTime() >= now).length,
      totalRevenue: appointments.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.servicePrice ?? 0), 0),
    };
  }, [appointments, now]);

  async function handleStatusChange(item: Appointment, nextStatus: AppointmentStatus) {
    if (!businessId) return;
    setUpdatingId(item.id);
    try {
      await updateAppointmentStatus(businessId, item.id, nextStatus);
      toast.success(`Randevu ${appointmentStatusMeta[nextStatus].label.toLocaleLowerCase("tr-TR")} olarak güncellendi`);
      await reload();
      setConfirmCancel(null);
    } catch {
      toast.error("Güncelleme başarısız oldu");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ── Ek hizmetler ── */
  const extraServiceOptions = useMemo(() => {
    if (!serviceEditor) return [];
    const options = new Map<string, AppointmentServiceLine>();
    services
      .filter((service) => service.id !== serviceEditor.serviceId && service.price > 0)
      .forEach((service) => options.set(service.id, { serviceId: service.id, name: service.name, price: service.price, durationMinutes: service.durationMinutes }));
    (serviceEditor.additionalServices ?? []).forEach((service) => { if (!options.has(service.serviceId)) options.set(service.serviceId, service); });
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [serviceEditor, services]);
  const visibleExtraServiceOptions = useMemo(() => {
    const needle = serviceSearch.trim().toLocaleLowerCase("tr-TR");
    return needle ? extraServiceOptions.filter((service) => service.name.toLocaleLowerCase("tr-TR").includes(needle)) : extraServiceOptions;
  }, [extraServiceOptions, serviceSearch]);
  const selectedExtraServices = extraServiceOptions.filter((service) => selectedExtraServiceIds.includes(service.serviceId));
  const editorPreviousExtraPrice = (serviceEditor?.additionalServices ?? []).reduce((sum, item) => sum + item.price, 0);
  const editorPreviousExtraDuration = (serviceEditor?.additionalServices ?? []).reduce((sum, item) => sum + item.durationMinutes, 0);
  const editorBasePrice = serviceEditor ? serviceEditor.primaryServicePrice ?? Math.max(0, Number(serviceEditor.servicePrice ?? 0) - editorPreviousExtraPrice) : 0;
  const editorBaseDuration = serviceEditor ? serviceEditor.primaryServiceDurationMinutes ?? Math.max(0, Number(serviceEditor.serviceDurationMinutes ?? 0) - editorPreviousExtraDuration) : 0;
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
    setSelectedExtraServiceIds((current) => current.includes(serviceId) ? current.filter((item) => item !== serviceId) : [...current, serviceId]);
  }
  async function handleSaveAdditionalServices() {
    if (!businessId || !serviceEditor) return;
    setSavingServices(true);
    try {
      await updateAppointmentAdditionalServices(businessId, serviceEditor, selectedExtraServices);
      await reload();
      setServiceEditor(null);
      if (editorScheduleConflict) toast.warning(`Hizmetler kaydedildi; yeni bitiş saati ${editorScheduleConflict.customerName} randevusuyla çakışıyor.`);
      else toast.success(selectedExtraServices.length > 0 ? `${selectedExtraServices.length} ek hizmet randevuya işlendi.` : "Ek hizmetler randevudan kaldırıldı.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Ek hizmetler güncellenemedi.");
    } finally {
      setSavingServices(false);
    }
  }

  /* ── Saat değiştirme (rescheduleAppointment callable) ── */
  function openReschedule(appointment: Appointment) {
    const zoned = millisToZonedDateTime(new Date(appointment.startAt).getTime());
    setNewDate(zoned.date);
    setNewTime(zoned.time);
    setRescheduling(appointment);
  }
  async function saveReschedule() {
    if (!businessId || !rescheduling || !newDate || !newTime) return;
    const startAt = new Date(zonedDateTimeToMillis(newDate, newTime));
    if (Number.isNaN(startAt.getTime())) { toast.error("Tarih veya saat geçersiz."); return; }
    if (startAt.getTime() < Date.now()) { toast.error("Geçmiş bir saate taşınamaz."); return; }
    const duration = Math.max(5, (new Date(rescheduling.endAt).getTime() - new Date(rescheduling.startAt).getTime()) / 60_000 || Number(rescheduling.serviceDurationMinutes) || 30);
    setSavingReschedule(true);
    try {
      await rescheduleAppointment(businessId, rescheduling.id, { startAt, endAt: new Date(startAt.getTime() + duration * 60_000), staffId: rescheduling.staffId });
      toast.success("Randevu yeni saate taşındı; müşteriye bildirim gönderilir.");
      setRescheduling(null);
      await reload();
    } catch (error) {
      toast.error(userFacingError(error, "Randevu taşınamadı. Saat dolu veya çalışma saatleri dışında olabilir."));
    } finally {
      setSavingReschedule(false);
    }
  }

  function exportAppointments() {
    const rows = [
      ["Tarih", "Saat", "Müşteri", "Telefon", "E-posta", "Hizmet", "Çalışan", "Durum", "Ödeme", "Tutar"],
      ...filtered.map((item) => [formatDate(item.startAt), formatTime(item.startAt), item.customerName, item.customerPhone ?? "", item.customerEmail ?? "", servicesOf(item), item.staffName ?? "", appointmentStatusMeta[item.status].label, item.paymentStatus, String(item.servicePrice ?? 0)]),
    ];
    const csv = "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `randevular-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataColumn<Appointment>[] = [
    { key: "when", header: "Tarih", width: 150, cell: (item) => <span className={styles.when}><b>{formatTime(item.startAt)}</b><small>{dayLabel(item.startAt)}</small></span> },
    { key: "customer", header: "Müşteri", primary: true, cell: (item) => <span className={styles.customer}><span className={styles.avatar} aria-hidden>{item.customerName.charAt(0).toLocaleUpperCase("tr-TR")}</span><span className="min-w-0"><b>{item.customerName}</b>{canViewCustomerContact && item.customerPhone && <small>{item.customerPhone}</small>}</span></span> },
    { key: "service", header: "Hizmet", cell: (item) => <span className={styles.service}>{item.serviceName ?? "—"}{(item.additionalServices?.length ?? 0) > 0 && <Badge size="sm" tone="green">+{item.additionalServices?.length} ek</Badge>}</span> },
    { key: "staff", header: "Çalışan", cell: (item) => item.staffName || <span className={styles.muted}>Atanmamış</span> },
    { key: "status", header: "Durum", cell: (item) => <StatusPill status={item.status} size="sm" /> },
    { key: "price", header: "Tutar", align: "right", cell: (item) => item.servicePrice ? <b className={styles.price}>{item.servicePrice.toLocaleString("tr-TR")} ₺</b> : <span className={styles.muted}>—</span> },
  ];

  const tabs = (["all", "pending", "confirmed", "completed", "cancelled", "no_show"] as FilterTab[]).map((key) => ({
    value: key,
    label: key === "all" ? "Tümü" : key === "pending" ? "Bekleyen" : key === "confirmed" ? "Onaylı" : key === "completed" ? "Tamamlanan" : key === "cancelled" ? "İptal" : "Gelmedi",
    count: counts[key],
  }));

  const sel = selected;
  const selOpen = sel ? ["pending", "confirmed"].includes(sel.status) : false;
  const selPast = sel ? new Date(sel.startAt) < new Date() : false;
  const selBusy = sel ? updatingId === sel.id : false;

  return (
    <DashPage>
      <PageHeader
        variant="plain"
        icon={ListChecks}
        eyebrow="Operasyon"
        title="Randevular"
        description="Durumları tek dokunuşla güncelleyin, müşteriye ulaşın, saat ve hizmetleri düzenleyin."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={exportAppointments} disabled={filtered.length === 0}>CSV</Button>
          <Button variant="primary" icon={Plus} onClick={() => openQuickAppointment()}>Yeni randevu</Button>
        </>}
      />

      <StatGrid columns={4}>
        <StatCard label="Bugün" value={stats.todayCount} icon={CalendarDays} loading={loading} onClick={() => { setDateScope("today"); setActiveTab("all"); }} />
        <StatCard label="Onay bekleyen" value={stats.pendingCount} icon={Clock3} tone="amber" loading={loading} onClick={() => { setActiveTab("pending"); setDateScope("all"); }} hint={stats.pendingCount ? "Dokun ve onayla" : "Bekleyen yok"} />
        <StatCard label="Yaklaşan onaylı" value={stats.upcomingConfirmed} icon={BadgeCheck} tone="blue" loading={loading} onClick={() => { setActiveTab("confirmed"); setDateScope("upcoming"); }} />
        <StatCard label="Tamamlanan gelir" value={`${stats.totalRevenue.toLocaleString("tr-TR")} ₺`} icon={Banknote} tone="green" loading={loading} />
      </StatGrid>

      <Panel flush>
        <div className={styles.filters}>
          <SegmentedControl ariaLabel="Durum filtresi" value={activeTab} onChange={(value) => { setActiveTab(value); setLimit(PAGE); }} options={tabs} className={styles.tabs} />
          <Toolbar>
            <SearchField value={search} onChange={(value) => { setSearch(value); setLimit(PAGE); }} placeholder="Müşteri, telefon, hizmet veya çalışan ara…" />
            <SegmentedControl ariaLabel="Tarih aralığı" value={dateScope} onChange={(value) => { setDateScope(value); setLimit(PAGE); }}
              options={[{ value: "all", label: "Tümü" }, { value: "today", label: "Bugün" }, { value: "upcoming", label: "Yaklaşan" }, { value: "past", label: "Geçmiş" }, { value: "custom", label: "Tarih seç", icon: CalendarDays }]} />
          </Toolbar>
          {dateScope === "custom" && (
            <FormGrid className={styles.range}>
              <Field label="Başlangıç"><Input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setLimit(PAGE); }} /></Field>
              <Field label="Bitiş"><Input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setLimit(PAGE); }} /></Field>
            </FormGrid>
          )}
          <p className={styles.resultCount} aria-live="polite">{loading ? "Yükleniyor…" : `${filtered.length} randevu`}</p>
        </div>
        <DataTable
          ariaLabel="Randevu listesi"
          rows={filtered.slice(0, limit)}
          columns={columns}
          loading={loading}
          rowKey={(item) => item.id}
          onRowClick={(item) => setSelectedId(item.id)}
          rowLabel={(item) => `${item.customerName}, ${formatDate(item.startAt)} ${formatTime(item.startAt)}, ${appointmentStatusMeta[item.status].label}`}
          renderMobileCard={(item) => (
            <span className={cn(styles.card, styles[`st-${item.status}`])}>
              <span className={styles.cardTime}><b>{formatTime(item.startAt)}</b><small>{dayLabel(item.startAt)}</small></span>
              <span className={styles.cardMain}>
                <b>{item.customerName}</b>
                <small>{servicesOf(item) || "Hizmet"}{item.staffName ? ` · ${item.staffName}` : ""}</small>
                <span className={styles.cardFoot}><StatusPill status={item.status} size="sm" />{item.servicePrice ? <em>{item.servicePrice.toLocaleString("tr-TR")} ₺</em> : null}</span>
              </span>
            </span>
          )}
          empty={<EmptyState mascot compact title="Randevu bulunamadı" description={search || activeTab !== "all" || dateScope !== "all" ? "Filtreleri değiştirerek tekrar deneyin." : "Henüz randevu oluşturulmamış."} action={search || activeTab !== "all" || dateScope !== "all"
            ? <Button size="sm" variant="secondary" icon={Search} onClick={() => { setSearch(""); setActiveTab("all"); setDateScope("all"); }}>Filtreleri temizle</Button>
            : <Button size="sm" variant="primary" icon={Plus} onClick={() => openQuickAppointment()}>Randevu ekle</Button>} />}
        />
        {filtered.length > limit && (
          <div className={styles.more}><Button variant="secondary" onClick={() => setLimit((value) => value + PAGE)}>Daha fazla göster ({filtered.length - limit})</Button></div>
        )}
      </Panel>

      {/* ── Detay ── */}
      <Sheet
        open={Boolean(sel)}
        onClose={() => setSelectedId(null)}
        placement="side"
        title={sel?.customerName ?? ""}
        description={sel ? <span className={styles.sheetMeta}><StatusPill status={sel.status} />{new Date(sel.startAt).toDateString() === new Date().toDateString() && <Badge tone="blue" size="sm">Bugün</Badge>}</span> : undefined}
        footer={sel && canManageStatus && selOpen ? <>
          {sel.status === "pending" && <Button variant="primary" icon={BadgeCheck} loading={selBusy} onClick={() => void handleStatusChange(sel, "confirmed")}>Onayla</Button>}
          <Button variant={sel.status === "pending" ? "secondary" : "primary"} icon={Check} loading={selBusy} onClick={() => void handleStatusChange(sel, "completed")}>Tamamlandı</Button>
        </> : undefined}
      >
        {sel && (
          <div className={styles.detail}>
            <div className={styles.hero}>
              <span><CalendarClock size={18} aria-hidden /></span>
              <div><b>{format(new Date(sel.startAt), "d MMMM yyyy, EEEE", { locale: tr })}</b><small>{formatTime(sel.startAt)}{sel.endAt ? ` – ${formatTime(sel.endAt)}` : ""}{sel.serviceDurationMinutes ? ` · ${sel.serviceDurationMinutes} dk` : ""}</small></div>
            </div>
            <KeyValueList items={[
              { label: "Hizmet", value: servicesOf(sel) || "—", wide: true },
              { label: "Çalışan", value: sel.staffName || "Atanmamış" },
              { label: "Tutar", value: sel.servicePrice ? `${sel.servicePrice.toLocaleString("tr-TR")} ₺` : "—" },
              { label: "Ödeme", value: PAYMENT_LABEL[sel.paymentStatus] ?? sel.paymentStatus },
              ...(sel.source ? [{ label: "Kaynak", value: SOURCE_LABEL[sel.source] ?? sel.source }] : []),
              ...(canViewCustomerContact && sel.customerPhone ? [{ label: "Telefon", value: <a href={`tel:${sel.customerPhone}`} className={styles.link}>{sel.customerPhone}</a> }] : []),
              ...(canViewCustomerContact && sel.customerEmail ? [{ label: "E-posta", value: <a href={`mailto:${sel.customerEmail}`} className={styles.link}>{sel.customerEmail}</a>, wide: true }] : []),
            ]} />

            {(sel.additionalServices?.length ?? 0) > 0 && (
              <div className={styles.extras}>
                <p><PackagePlus size={13} aria-hidden /> Eklenen hizmetler</p>
                <div>{sel.additionalServices?.map((service) => <Badge key={service.serviceId} tone="green">{service.name} · {service.durationMinutes} dk · {service.price.toLocaleString("tr-TR")} ₺</Badge>)}</div>
              </div>
            )}
            {sel.notes && <div className={styles.note}><small>Randevu notu</small><p>{sel.notes}</p></div>}
            <AppointmentCustomFields values={sel.customFields} />

            <div className={styles.actionGrid}>
              {canViewCustomerContact && sel.customerPhone && <Button variant="soft" icon={Phone} href={`tel:${sel.customerPhone}`}>Ara</Button>}
              {canManageStatus && selOpen && <Button variant="soft" icon={CalendarClock} onClick={() => openReschedule(sel)}>Saati değiştir</Button>}
              {canManageStatus && !["cancelled", "no_show"].includes(sel.status) && <Button variant="soft" icon={Plus} onClick={() => openServiceEditor(sel)}>Hizmet ekle / düzenle</Button>}
              {canManageStatus && !["cancelled", "no_show"].includes(sel.status) && sel.paymentStatus !== "paid" && <Button variant="soft" icon={ReceiptText} href={`/dashboard/operasyon?appointment=${encodeURIComponent(sel.id)}`}>Adisyon aç</Button>}
              {canManageStatus && sel.status !== "no_show" && selPast && <Button variant="secondary" icon={UserX} loading={selBusy} onClick={() => void handleStatusChange(sel, "no_show")}>Gelmedi</Button>}
              {canManageStatus && selOpen && <Button variant="dangerSoft" icon={CircleX} disabled={selBusy} onClick={() => setConfirmCancel(sel)}>İptal et</Button>}
            </div>
            {!canManageStatus && <Callout tone="neutral" icon={CheckCircle2} title="Salt okunur">Randevu durumunu değiştirme yetkiniz yok.</Callout>}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(confirmCancel)}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => { if (confirmCancel) void handleStatusChange(confirmCancel, "cancelled"); }}
        busy={Boolean(confirmCancel && updatingId === confirmCancel.id)}
        title="Randevu iptal edilsin mi?"
        description={confirmCancel ? `${confirmCancel.customerName} · ${formatDate(confirmCancel.startAt)} ${formatTime(confirmCancel.startAt)}. Saat yeniden müsait görünür.` : undefined}
        confirmLabel="İptal et"
        cancelLabel="Vazgeç"
        icon={CircleX}
      />

      {/* ── Saat değiştir ── */}
      <Sheet
        open={Boolean(rescheduling)}
        onClose={() => setRescheduling(null)}
        dismissible={!savingReschedule}
        size="sm"
        title="Saati değiştir"
        description={rescheduling ? `${rescheduling.customerName} · şu an ${formatDate(rescheduling.startAt)} ${formatTime(rescheduling.startAt)}` : undefined}
        footer={<>
          <Button variant="secondary" onClick={() => setRescheduling(null)} disabled={savingReschedule}>Vazgeç</Button>
          <Button variant="primary" icon={CalendarClock} loading={savingReschedule} disabled={!newDate || !newTime} onClick={() => void saveReschedule()}>Taşı</Button>
        </>}
      >
        <FormGrid>
          <Field label="Yeni tarih"><Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /></Field>
          <Field label="Yeni saat"><Input type="time" step={900} value={newTime} onChange={(event) => setNewTime(event.target.value)} /></Field>
        </FormGrid>
        <p className={styles.hint}>Çalışan ve süre aynı kalır. Saat doluysa veya çalışma saatleri dışındaysa sistem uyarır.</p>
      </Sheet>

      {/* ── Ek hizmetler ── */}
      <Sheet
        open={Boolean(serviceEditor)}
        onClose={() => setServiceEditor(null)}
        dismissible={!savingServices}
        size="lg"
        title="Ek hizmet ekle"
        description={serviceEditor ? <>{serviceEditor.customerName} · Ana hizmet: <b>{serviceEditor.serviceName ?? "Hizmet"}</b></> : undefined}
        headerExtra={<div className={styles.serviceSearch}><SearchField value={serviceSearch} onChange={setServiceSearch} placeholder="Ek hizmet ara…" /><Badge tone="accent">{selectedExtraServices.length} seçili</Badge></div>}
        footer={<div className={styles.serviceFoot}>
          {editorScheduleConflict && <Callout tone="amber" title="Çakışma uyarısı">Yeni bitiş saati {editorScheduleConflict.customerName} müşterisinin {formatTime(editorScheduleConflict.startAt)} randevusuyla çakışıyor. Yine de kaydedebilirsiniz.</Callout>}
          <div className={styles.totals}>
            <span><small>Ek hizmet</small><b>{selectedExtraServices.length}</b></span>
            <span><small>Toplam süre</small><b>{editorTotalDuration} dk</b></span>
            <span><small>Toplam tutar</small><b>{editorTotalPrice.toLocaleString("tr-TR")} ₺</b></span>
          </div>
          <div className={styles.serviceButtons}>
            <Button variant="secondary" onClick={() => setServiceEditor(null)} disabled={savingServices}>Vazgeç</Button>
            <Button variant="primary" icon={Check} loading={savingServices} onClick={() => void handleSaveAdditionalServices()}>{savingServices ? "Kaydediliyor…" : "Hizmetleri kaydet"}</Button>
          </div>
        </div>}
      >
        {visibleExtraServiceOptions.length === 0 ? (
          <EmptyState icon={PackagePlus} compact title="Uygun ek hizmet bulunamadı" description="Aktif ve fiyatı tanımlanmış hizmetler burada görünür." />
        ) : (
          <div className={styles.serviceGrid}>
            {visibleExtraServiceOptions.map((service) => {
              const on = selectedExtraServiceIds.includes(service.serviceId);
              return (
                <button key={service.serviceId} type="button" aria-pressed={on} onClick={() => toggleExtraService(service.serviceId)} className={cn(styles.serviceOption, on && styles.serviceOn)}>
                  <span className={styles.serviceCheck}>{on ? <Check size={16} strokeWidth={3} aria-hidden /> : <Plus size={16} aria-hidden />}</span>
                  <span className="min-w-0"><b>{service.name}</b><small>{service.durationMinutes} dk · {service.price.toLocaleString("tr-TR")} ₺</small></span>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </DashPage>
  );
}
