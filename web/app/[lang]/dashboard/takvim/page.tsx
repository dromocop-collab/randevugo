"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { addDays, addMonths, addWeeks, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { listAppointmentsByDateRange, rescheduleAppointment, updateAppointmentStatus } from "@/features/appointments/appointment-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { QuickAppointmentModal } from "@/components/dashboard/quick-appointment-modal";
import { FinalPriceDialog } from "@/components/dashboard/final-price-dialog";
import { needsFinalPrice } from "@/features/services/service-pricing";
import { APPOINTMENTS_CHANGED_EVENT } from "@/components/dashboard/dashboard-events";
import { Badge, Button, Callout, ConfirmSheet, DashPage, NativeSelect, SegmentedControl, Skeleton, appointmentStatusMeta } from "@/components/dashboard/ui";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { cn } from "@/lib/utils/cn";
import { tk } from "@/i18n/config";
import { useIntlLocale, useT } from "@/i18n/client";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import type { Staff } from "@/types/staff";
import { AppointmentDrawer, MonthView, TimeGrid, UNASSIGNED, WeekAgenda, eachDay, getRange, rangeTitle, useDateLocale, withHour, type MoveTarget, type ViewMode } from "./calendar-views";
import styles from "./calendar.module.css";

const VIEW_OPTIONS = [{ value: "gun", label: tk("Gün") }, { value: "hafta", label: tk("Hafta") }, { value: "ay", label: tk("Ay") }] as const;

export default function CalendarPage() {
  const { businessId, access, businesses } = useBusiness();
  const t = useT();
  const intlLocale = useIntlLocale();
  const dateLocale = useDateLocale();
  const viewOptions = useMemo(() => VIEW_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) })), [t]);
  const canManageStatus = access?.role !== "staff" || Boolean(access?.permissions.manageAppointments);
  // Taşıma sunucuda rescheduleAppointment (sahip/yönetici) ile yapılır; çalışan sürükleyemez.
  const canMove = Boolean(access && access.role !== "staff");
  const slotInterval = Number(businesses.find((item) => item.id === businessId)?.slotIntervalMinutes) || 15;
  const [view, setView] = useState<ViewMode>("gun");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [hoursRange, setHoursRange] = useState<{ start: number; end: number }>({ start: 8, end: 21 });
  const [staffFilter, setStaffFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);
  const [createAt, setCreateAt] = useState<Date | undefined>();
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [updating, setUpdating] = useState(false);
  // Fiyatı iş bitince kesinleşen randevuyu tamamlarken kesin tutar sorulur.
  const [finalPriceFor, setFinalPriceFor] = useState<Appointment | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Sürükle-bırak sonrası onay bekleyen taşıma.
  const [pendingMove, setPendingMove] = useState<{ item: Appointment; target: MoveTarget } | null>(null);
  const [moving, setMoving] = useState(false);
  // Aynı hafta/ay içinde gün değişince yeniden yükleme yapılmaz.
  const rangeKey = view === "ay" ? startOfMonth(cursor).getTime() : startOfWeek(cursor, { weekStartsOn: 1 }).getTime();
  const range = useMemo(() => getRange(new Date(rangeKey), view), [rangeKey, view]);

  // Masaüstünde varsayılan hafta görünümü; mobilde gün.
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches) queueMicrotask(() => setView("hafta"));
    if (new URLSearchParams(window.location.search).get("new") === "1") queueMicrotask(() => setCreating(true));
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    listStaff(businessId, true).then((rows) => { if (active) setStaff(rows); }).catch(() => { if (active) setStaff([]); });
    listBusinessWorkingHours(businessId).then((rows) => {
      if (!active) return;
      const open = rows.filter((row) => row.isOpen);
      if (!open.length) return;
      const start = Math.max(0, Math.min(...open.map((row) => Number(row.start.split(":")[0]) || 0)));
      const end = Math.min(24, Math.max(...open.map((row) => Math.ceil((Number(row.end.split(":")[0]) || 0) + (Number(row.end.split(":")[1]) || 0) / 60))));
      if (end > start) setHoursRange({ start, end });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [businessId]);

  const loadAppointments = useCallback(async () => {
    if (!businessId) return [];
    const items = await listAppointmentsByDateRange(businessId, range.start, addDays(range.end, 1));
    return items.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  }, [businessId, range.end, range.start]);

  const refreshAppointments = useCallback(async () => {
    try { setAppointments(await loadAppointments()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : tk("Takvim yüklenemedi.")); }
  }, [loadAppointments]);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(""); } });
    loadAppointments()
      .then((items) => { if (active) setAppointments(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : tk("Takvim yüklenemedi.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, loadAppointments]);

  useEffect(() => {
    const onChanged = () => { void refreshAppointments(); };
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
  }, [refreshAppointments]);

  // Ekip sütunları: aktif çalışanlar + randevularda geçen ama listede olmayanlar + atanmamış.
  const columns = useMemo(() => {
    const map = new Map<string, string>();
    staff.forEach((item) => map.set(item.id, item.fullName));
    appointments.forEach((item) => { if (item.staffId && !map.has(item.staffId)) map.set(item.staffId, item.staffName || t("Çalışan")); });
    const list = [...map.entries()].map(([id, name]) => ({ id, name }));
    if (appointments.some((item) => !item.staffId)) list.push({ id: UNASSIGNED, name: t("Atanmamış") });
    return list;
  }, [appointments, staff, t]);

  const visible = useMemo(() => staffFilter === "all" ? appointments : appointments.filter((item) => (item.staffId || UNASSIGNED) === staffFilter), [appointments, staffFilter]);
  const days = useMemo(() => eachDay(range.start, range.end), [range]);
  const weekDays = useMemo(() => eachDay(startOfWeek(cursor, { weekStartsOn: 1 }), endOfWeek(cursor, { weekStartsOn: 1 })), [cursor]);
  const dayItems = visible.filter((item) => isSameDay(new Date(item.startAt), cursor));
  const scope = view === "gun" ? dayItems : view === "hafta" ? visible : visible.filter((item) => isSameMonth(new Date(item.startAt), cursor));
  const activeScope = scope.filter((item) => item.status !== "cancelled");
  const pendingCount = scope.filter((item) => item.status === "pending").length;

  function move(direction: -1 | 1) {
    setCursor((date) => view === "gun" ? (direction > 0 ? addDays(date, 1) : subDays(date, 1)) : view === "hafta" ? (direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1)) : (direction > 0 ? addMonths(date, 1) : subMonths(date, 1)));
  }
  function openCreate(date?: Date) { setCreateAt(date); setCreating(true); }
  function openDay(day: Date) { setCursor(startOfDay(day)); setView("gun"); }

  async function changeStatus(item: Appointment, status: AppointmentStatus, finalPrice?: { total: number; extrasTotal: number }) {
    if (!businessId) return;
    if (status === "completed" && !finalPrice && needsFinalPrice(item)) { setFinalPriceFor(item); return; }
    setUpdating(true);
    try {
      await updateAppointmentStatus(businessId, item.id, status, finalPrice);
      toast.success(t("Randevu: {status}", { status: t(appointmentStatusMeta[status].label).toLocaleLowerCase(intlLocale) }));
      setSelected(finalPrice ? { ...item, status, servicePrice: finalPrice.total, primaryServicePrice: Math.max(0, finalPrice.total - finalPrice.extrasTotal) } : { ...item, status });
      setFinalPriceFor(null);
      await refreshAppointments();
    } catch {
      toast.error(t("Güncelleme başarısız oldu"));
    } finally {
      setUpdating(false);
    }
  }

  async function confirmMove() {
    if (!businessId || !pendingMove) return;
    const { item, target } = pendingMove;
    setMoving(true);
    try {
      await rescheduleAppointment(businessId, item.id, { startAt: target.startAt, endAt: target.endAt, staffId: target.staffId ?? item.staffId ?? "" });
      toast.success(t("Randevu yeni saate taşındı; müşteriye bildirim gönderilir."));
      setPendingMove(null);
      await refreshAppointments();
    } catch (reason) {
      toast.error(t(userFacingError(reason, tk("Randevu taşınamadı. Saat dolu veya çalışma saatleri dışında olabilir."))));
    } finally {
      setMoving(false);
    }
  }

  // Mobilde gün görünümünde sağa/sola kaydırarak gün değiştirme.
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(event: ReactTouchEvent) { const touch = event.touches[0]; touchRef.current = { x: touch.clientX, y: touch.clientY }; }
  function onTouchEnd(event: ReactTouchEvent) {
    const start = touchRef.current; touchRef.current = null;
    if (!start || view !== "gun") return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) move(dx < 0 ? 1 : -1);
  }

  const showStaffColumns = view === "gun" && staffFilter === "all" && columns.length > 1;

  return (
    <DashPage className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headTitle}>
          <span className={styles.eyebrow}><CalendarDays size={13} aria-hidden /> {t("Takvim")}</span>
          <h1>{rangeTitle(cursor, view, dateLocale)}</h1>
          <div className={styles.metaRow}>
            <Badge tone="accent">{t("{count} randevu", { count: activeScope.length })}</Badge>
            {pendingCount > 0 && <Badge tone="amber" pulse>{t("{count} onay bekliyor", { count: pendingCount })}</Badge>}
            {view === "gun" && isSameDay(cursor, new Date()) && <Badge tone="green" dot>{t("Bugün")}</Badge>}
          </div>
        </div>
        <div className={styles.headActions}>
          <Button variant="secondary" size="sm" icon={RefreshCw} iconOnly aria-label={t("Yenile")} onClick={() => void refreshAppointments()} />
          <Button variant="primary" icon={Plus} onClick={() => openCreate(view === "gun" ? withHour(cursor, 9) : undefined)} className={styles.newBtn}>{t("Yeni randevu")}</Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <Button variant="secondary" size="sm" icon={ChevronLeft} iconOnly aria-label={t("Önceki")} onClick={() => move(-1)} />
          <Button variant="secondary" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>{t("Bugün")}</Button>
          <Button variant="secondary" size="sm" icon={ChevronRight} iconOnly aria-label={t("Sonraki")} onClick={() => move(1)} />
        </div>
        <SegmentedControl ariaLabel={t("Takvim görünümü")} value={view} onChange={setView} options={viewOptions} />
        {columns.length > 1 && (
          <NativeSelect className={styles.staffSelect} value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} aria-label={t("Çalışan filtresi")}>
            <option value="all">{t("Tüm ekip")}</option>
            {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
          </NativeSelect>
        )}
      </div>

      {view !== "ay" && (
        <div className={styles.strip} role="tablist" aria-label={t("Haftanın günleri")}>
          {weekDays.map((day) => {
            const count = visible.filter((item) => item.status !== "cancelled" && isSameDay(new Date(item.startAt), day)).length;
            const active = view === "gun" && isSameDay(day, cursor);
            return (
              <button key={day.toISOString()} type="button" role="tab" aria-selected={active} onClick={() => openDay(day)}
                className={cn(styles.stripDay, active && styles.stripDayActive, isSameDay(day, new Date()) && styles.stripToday)}>
                <small>{format(day, "EEE", { locale: dateLocale })}</small>
                <b>{format(day, "d")}</b>
                <i aria-label={t("{count} randevu", { count })}>{count > 0 ? Array.from({ length: Math.min(count, 3) }).map((_, index) => <span key={index} />) : null}</i>
              </button>
            );
          })}
        </div>
      )}

      {error && <Callout tone="red" title={t("Takvim yüklenemedi")} action={<Button size="sm" variant="secondary" onClick={() => void refreshAppointments()}>{t("Tekrar dene")}</Button>}>{t(error)}</Callout>}

      <section className={styles.board} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {loading ? (
          <div className={styles.loading}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={56} radius={14} />)}</div>
        ) : view === "ay" ? (
          <MonthView days={days} cursor={cursor} appointments={visible} onSelect={setSelected} onOpenDay={openDay} />
        ) : view === "hafta" ? (
          <>
            <div className={styles.desktopOnly}>
              <TimeGrid
                columns={days.map((day) => ({ key: day.toISOString(), label: format(day, "EEE d", { locale: dateLocale }), day, today: isSameDay(day, new Date()), items: visible.filter((item) => isSameDay(new Date(item.startAt), day)) }))}
                hours={hoursRange} now={now} onSelect={setSelected} onCreate={openCreate} showStaff
                onMove={canMove ? (item, target) => setPendingMove({ item, target }) : undefined} snapMinutes={slotInterval}
              />
            </div>
            <div className={styles.mobileOnly}>
              <WeekAgenda days={days} appointments={visible} onSelect={setSelected} onCreate={openCreate} />
            </div>
          </>
        ) : (
          <TimeGrid
            columns={showStaffColumns
              ? columns.map((column) => ({ key: column.id, label: column.name, day: cursor, today: isSameDay(cursor, new Date()), staffId: column.id, items: dayItems.filter((item) => (item.staffId || UNASSIGNED) === column.id) }))
              : [{ key: "day", label: format(cursor, "EEEE", { locale: dateLocale }), day: cursor, today: isSameDay(cursor, new Date()), items: dayItems }]}
            hours={hoursRange} now={now} onSelect={setSelected} onCreate={openCreate} showStaff={!showStaffColumns} staffColumns={showStaffColumns}
            onMove={canMove ? (item, target) => setPendingMove({ item, target }) : undefined} snapMinutes={slotInterval}
          />
        )}
      </section>

      <AppointmentDrawer
        appointment={selected}
        canManage={canManageStatus}
        updating={updating}
        onClose={() => setSelected(null)}
        onEdit={() => { setEditing(selected); setSelected(null); }}
        onStatus={(status) => { if (selected) void changeStatus(selected, status); }}
      />
      <ConfirmSheet
        open={Boolean(pendingMove)}
        tone="primary"
        icon={CalendarClock}
        busy={moving}
        title={t("Randevu taşınsın mı?")}
        confirmLabel={t("Taşı")}
        onClose={() => { if (!moving) setPendingMove(null); }}
        onConfirm={() => void confirmMove()}
        description={pendingMove ? t("{customer}: {from} → {to}. Müşteriye bildirim gönderilir.", {
          customer: pendingMove.item.customerName,
          from: format(new Date(pendingMove.item.startAt), "d MMM HH:mm", { locale: dateLocale }),
          to: `${format(pendingMove.target.startAt, "d MMM HH:mm", { locale: dateLocale })}${pendingMove.target.staffLabel && pendingMove.target.staffId !== pendingMove.item.staffId ? ` · ${pendingMove.target.staffLabel}` : ""}`,
        }) : undefined}
      />
      <FinalPriceDialog
        appointment={finalPriceFor}
        busy={updating}
        onClose={() => setFinalPriceFor(null)}
        onConfirm={(finalPrice) => { if (finalPriceFor) void changeStatus(finalPriceFor, "completed", finalPrice); }}
      />
      {businessId && (
        <QuickAppointmentModal
          businessId={businessId}
          open={creating || Boolean(editing)}
          appointment={editing ?? undefined}
          initialStartAt={createAt}
          onClose={() => { setCreating(false); setEditing(null); }}
          onCreated={refreshAppointments}
        />
      )}
    </DashPage>
  );
}
