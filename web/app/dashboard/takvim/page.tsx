"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { addDays, addMonths, addWeeks, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { listAppointmentsByDateRange, updateAppointmentStatus } from "@/features/appointments/appointment-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { QuickAppointmentModal } from "@/components/dashboard/quick-appointment-modal";
import { APPOINTMENTS_CHANGED_EVENT } from "@/components/dashboard/dashboard-events";
import { Badge, Button, Callout, DashPage, NativeSelect, SegmentedControl, Skeleton, appointmentStatusMeta } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import type { Staff } from "@/types/staff";
import { AppointmentDrawer, MonthView, TimeGrid, UNASSIGNED, WeekAgenda, eachDay, getRange, rangeTitle, withHour, type ViewMode } from "./calendar-views";
import styles from "./calendar.module.css";

const VIEW_OPTIONS = [{ value: "gun", label: "Gün" }, { value: "hafta", label: "Hafta" }, { value: "ay", label: "Ay" }] as const;

export default function CalendarPage() {
  const { businessId, access } = useBusiness();
  const canManageStatus = access?.role !== "staff" || Boolean(access?.permissions.manageAppointments);
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
  const [now, setNow] = useState(() => Date.now());
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
    catch (reason) { setError(reason instanceof Error ? reason.message : "Takvim yüklenemedi."); }
  }, [loadAppointments]);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(""); } });
    loadAppointments()
      .then((items) => { if (active) setAppointments(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Takvim yüklenemedi."); })
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
    appointments.forEach((item) => { if (item.staffId && !map.has(item.staffId)) map.set(item.staffId, item.staffName || "Çalışan"); });
    const list = [...map.entries()].map(([id, name]) => ({ id, name }));
    if (appointments.some((item) => !item.staffId)) list.push({ id: UNASSIGNED, name: "Atanmamış" });
    return list;
  }, [appointments, staff]);

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

  async function changeStatus(item: Appointment, status: AppointmentStatus) {
    if (!businessId) return;
    setUpdating(true);
    try {
      await updateAppointmentStatus(businessId, item.id, status);
      toast.success(`Randevu: ${appointmentStatusMeta[status].label.toLocaleLowerCase("tr-TR")}`);
      setSelected({ ...item, status });
      await refreshAppointments();
    } catch {
      toast.error("Güncelleme başarısız oldu");
    } finally {
      setUpdating(false);
    }
  }

  // Mobilde gün görünümünde sağa/sola kaydırarak gün değiştirme.
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(event: ReactTouchEvent) { const t = event.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; }
  function onTouchEnd(event: ReactTouchEvent) {
    const start = touchRef.current; touchRef.current = null;
    if (!start || view !== "gun") return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) move(dx < 0 ? 1 : -1);
  }

  const showStaffColumns = view === "gun" && staffFilter === "all" && columns.length > 1;

  return (
    <DashPage className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headTitle}>
          <span className={styles.eyebrow}><CalendarDays size={13} aria-hidden /> Takvim</span>
          <h1>{rangeTitle(cursor, view)}</h1>
          <div className={styles.metaRow}>
            <Badge tone="accent">{activeScope.length} randevu</Badge>
            {pendingCount > 0 && <Badge tone="amber" pulse>{pendingCount} onay bekliyor</Badge>}
            {view === "gun" && isSameDay(cursor, new Date()) && <Badge tone="green" dot>Bugün</Badge>}
          </div>
        </div>
        <div className={styles.headActions}>
          <Button variant="secondary" size="sm" icon={RefreshCw} iconOnly aria-label="Yenile" onClick={() => void refreshAppointments()} />
          <Button variant="primary" icon={Plus} onClick={() => openCreate(view === "gun" ? withHour(cursor, 9) : undefined)} className={styles.newBtn}>Yeni randevu</Button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <Button variant="secondary" size="sm" icon={ChevronLeft} iconOnly aria-label="Önceki" onClick={() => move(-1)} />
          <Button variant="secondary" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Bugün</Button>
          <Button variant="secondary" size="sm" icon={ChevronRight} iconOnly aria-label="Sonraki" onClick={() => move(1)} />
        </div>
        <SegmentedControl ariaLabel="Takvim görünümü" value={view} onChange={setView} options={VIEW_OPTIONS} />
        {columns.length > 1 && (
          <NativeSelect className={styles.staffSelect} value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} aria-label="Çalışan filtresi">
            <option value="all">Tüm ekip</option>
            {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
          </NativeSelect>
        )}
      </div>

      {view !== "ay" && (
        <div className={styles.strip} role="tablist" aria-label="Haftanın günleri">
          {weekDays.map((day) => {
            const count = visible.filter((item) => item.status !== "cancelled" && isSameDay(new Date(item.startAt), day)).length;
            const active = view === "gun" && isSameDay(day, cursor);
            return (
              <button key={day.toISOString()} type="button" role="tab" aria-selected={active} onClick={() => openDay(day)}
                className={cn(styles.stripDay, active && styles.stripDayActive, isSameDay(day, new Date()) && styles.stripToday)}>
                <small>{format(day, "EEE", { locale: tr })}</small>
                <b>{format(day, "d")}</b>
                <i aria-label={`${count} randevu`}>{count > 0 ? Array.from({ length: Math.min(count, 3) }).map((_, index) => <span key={index} />) : null}</i>
              </button>
            );
          })}
        </div>
      )}

      {error && <Callout tone="red" title="Takvim yüklenemedi" action={<Button size="sm" variant="secondary" onClick={() => void refreshAppointments()}>Tekrar dene</Button>}>{error}</Callout>}

      <section className={styles.board} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {loading ? (
          <div className={styles.loading}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={56} radius={14} />)}</div>
        ) : view === "ay" ? (
          <MonthView days={days} cursor={cursor} appointments={visible} onSelect={setSelected} onOpenDay={openDay} />
        ) : view === "hafta" ? (
          <>
            <div className={styles.desktopOnly}>
              <TimeGrid
                columns={days.map((day) => ({ key: day.toISOString(), label: format(day, "EEE d", { locale: tr }), day, today: isSameDay(day, new Date()), items: visible.filter((item) => isSameDay(new Date(item.startAt), day)) }))}
                hours={hoursRange} now={now} onSelect={setSelected} onCreate={openCreate} showStaff
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
              : [{ key: "day", label: format(cursor, "EEEE", { locale: tr }), day: cursor, today: isSameDay(cursor, new Date()), items: dayItems }]}
            hours={hoursRange} now={now} onSelect={setSelected} onCreate={openCreate} showStaff={!showStaffColumns} staffColumns={showStaffColumns}
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
