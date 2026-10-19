"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "@/i18n/link";
import { toast } from "sonner";
import {
  Activity, ArrowRight, Bot, Building2, CalendarCheck2, CalendarDays, CalendarPlus, CircleDollarSign, Clock3, FileText,
  FolderOpen, Gauge, ImageIcon, PartyPopper, ReceiptText, Rocket, Scissors, Sparkles, UserPlus, UserRound, UsersRound, Zap,
  type LucideIcon,
} from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { getBusinessById, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { useSubscriptionPlan } from "@/features/subscriptions/subscription-plan-context";
import { useLiveOperationsAvailable } from "@/features/live-queue/use-live-operations-available";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { SetupAssistant, type SetupAssistantStep } from "@/components/dashboard/setup-assistant";
import { APPOINTMENTS_CHANGED_EVENT, openQuickAppointment } from "@/components/dashboard/dashboard-events";
import { dashboardModuleSize, normalizeDashboardModules, type DashboardModuleId, type DashboardModulePreference } from "@/components/dashboard/appearance-studio";
import { buildDashboardRows } from "@/features/dashboard-layout/layout-domain";
import { captureRects, playFlip, type RectMap } from "@/features/dashboard-layout/flip";
import {
  Badge, Button, Callout, DashPage, EmptyState, PageHeader, Panel, Skeleton, StatCard, StatGrid, StatusPill, percentChange,
} from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import type { Appointment } from "@/types/appointments";
import type { Business } from "@/types/business";
import { TodayTimeline as Timeline } from "./today-timeline";
import styles from "./home.module.css";

type WorkingHour = Awaited<ReturnType<typeof listBusinessWorkingHours>>[number];

interface SetupItem {
  id: "business" | "category" | "hours" | "services" | "staff" | "logo" | "description";
  label: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
}

interface HomeData {
  appointments: Appointment[];
  customerCreatedAt: string[];
  customerCount: number;
  staffCount: number;
  workingHours: WorkingHour[];
}

const DAY_MS = 86_400_000;
const ACTIVE = new Set(["pending", "confirmed", "completed"]);

function startOfDayMs(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy.getTime(); }
function inDay(value: string, dayStart: number) { const time = new Date(value).getTime(); return time >= dayStart && time < dayStart + DAY_MS; }
function minutesOf(value: string) { const [h, m] = value.split(":").map(Number); return (h || 0) * 60 + (m || 0); }
function money(value: number, locale: string) { return `${Math.round(value).toLocaleString(locale)} ₺`; }
function timeOf(value: string, locale: string) { return new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }); }
function revenueOf(item: Appointment) { return Number(item.paidAmount ?? item.servicePrice ?? 0) || 0; }

function readModules(): DashboardModulePreference[] {
  try { return normalizeDashboardModules(JSON.parse(window.localStorage.getItem("sr-dashboard-modules") ?? "[]")); }
  catch { return normalizeDashboardModules(null); }
}

export default function DashboardHomePage() {
  const t = useT();
  const locale = useIntlLocale();
  const { businessId, access } = useBusiness();
  const { can } = useSubscriptionPlan();
  const showLiveOperations = useLiveOperationsAvailable();
  const [data, setData] = useState<HomeData | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [modules, setModules] = useState<DashboardModulePreference[]>(() => normalizeDashboardModules(null));
  const [now, setNow] = useState(() => Date.now());
  const gridRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<RectMap | null>(null);

  useLayoutEffect(() => {
    if (!flipRef.current) return;
    playFlip(gridRef.current, flipRef.current);
    flipRef.current = null;
  }, [modules]);

  // Ana panel düzeni (Görünüm stüdyosu → Ana panel düzeni).
  useEffect(() => {
    queueMicrotask(() => setModules(readModules()));
    const onChange = (event: Event) => {
      // Yer değiştiren kartlar eski konumlarından kayarak gelsin (FLIP).
      flipRef.current = captureRects(gridRef.current);
      setModules(normalizeDashboardModules((event as CustomEvent).detail));
    };
    window.addEventListener("sr-dashboard-layout-change", onChange);
    return () => window.removeEventListener("sr-dashboard-layout-change", onChange);
  }, []);

  // "Şimdi" çizgisi ve sıradaki randevu dakikada bir güncellenir.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async (id: string) => {
    const [appointments, customers, services, staff, currentBusiness, workingHours] = await Promise.all([
      listAppointments(id),
      listCustomers(id),
      listServices(id),
      listStaff(id),
      getBusinessById(id),
      listBusinessWorkingHours(id),
    ]);
    return { appointments, customers, services, staff, currentBusiness, workingHours };
  }, []);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    const run = () => load(businessId)
      .then(({ appointments, customers, services, staff, currentBusiness, workingHours }) => {
        if (!active) return;
        setBusiness(currentBusiness);
        setData({
          appointments,
          customerCreatedAt: customers.map((item) => item.createdAt).filter(Boolean),
          customerCount: customers.length,
          staffCount: staff.filter((item) => (item as { isActive?: boolean }).isActive !== false).length,
          workingHours,
        });
        setSetupItems([
          { id: "business", label: tk("İşletme bilgilerini tamamla"), done: Boolean(currentBusiness?.name && currentBusiness.phone && currentBusiness.email && currentBusiness.address && currentBusiness.city && currentBusiness.district), href: "/dashboard/ayarlar", icon: Building2 },
          { id: "category", label: tk("İşletme kategorisini seç"), done: Boolean(currentBusiness?.category && currentBusiness.category !== "diger"), href: "/dashboard/ayarlar", icon: FolderOpen },
          { id: "hours", label: tk("Çalışma saatlerini ayarla"), done: workingHours.length > 0, href: "/dashboard/calisma-saatleri", icon: Clock3 },
          { id: "services", label: tk("İlk hizmetini ekle"), done: services.length > 0, href: "/dashboard/hizmetler", icon: Scissors },
          { id: "staff", label: tk("Ekibini tanımla"), done: staff.length > 0, href: "/dashboard/calisanlar", icon: UserRound },
          { id: "logo", label: tk("Logo ekle"), done: Boolean(currentBusiness?.logoUrl), href: "/dashboard/ayarlar", icon: ImageIcon },
          { id: "description", label: tk("İşletme açıklamasını ekle"), done: Boolean(currentBusiness?.description && currentBusiness.description.length > 10), href: "/dashboard/ayarlar", icon: FileText },
        ]);
        setLoadError(null);
        setReady(true);
      })
      .catch((error) => {
        if (!active) return;
        const message = userFacingError(error, tk("İşletme verileri şu anda alınamadı. Lütfen yeniden deneyin."));
        setLoadError(message);
        setReady(true);
        toast.error(t(message));
      });
    void run();
    const onChanged = () => { void run(); };
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
    return () => { active = false; window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged); };
  }, [businessId, load, t]);

  const stats = useMemo(() => {
    if (!data) return null;
    const todayStart = startOfDayMs(new Date(now));
    const yesterdayStart = todayStart - DAY_MS;
    const today = data.appointments.filter((item) => inDay(item.startAt, todayStart)).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const yesterday = data.appointments.filter((item) => inDay(item.startAt, yesterdayStart));
    const todayActive = today.filter((item) => ACTIVE.has(item.status));
    const yesterdayActive = yesterday.filter((item) => ACTIVE.has(item.status));
    const revenueToday = today.filter((item) => item.status === "completed").reduce((sum, item) => sum + revenueOf(item), 0);
    const revenueYesterday = yesterday.filter((item) => item.status === "completed").reduce((sum, item) => sum + revenueOf(item), 0);
    const expectedToday = todayActive.filter((item) => item.status !== "completed").reduce((sum, item) => sum + (Number(item.servicePrice) || 0), 0);

    // Doluluk: bugünkü dolu dakika / (açık dakika − mola) × aktif çalışan.
    const weekday = new Date(now).getDay();
    const hours = data.workingHours.find((item) => item.day === weekday);
    const openMinutes = hours?.isOpen ? Math.max(0, minutesOf(hours.end) - minutesOf(hours.start) - (hours.breakStart && hours.breakEnd ? Math.max(0, minutesOf(hours.breakEnd) - minutesOf(hours.breakStart)) : 0)) : 0;
    const capacity = openMinutes * Math.max(1, data.staffCount);
    const bookedMinutes = todayActive.reduce((sum, item) => sum + Math.max(0, (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 60_000), 0);
    const occupancy = capacity > 0 ? Math.min(100, Math.round((bookedMinutes / capacity) * 100)) : null;

    const newCustomersToday = data.customerCreatedAt.filter((value) => inDay(value, todayStart)).length;
    const newCustomersYesterday = data.customerCreatedAt.filter((value) => inDay(value, yesterdayStart)).length;
    const upcoming = data.appointments
      .filter((item) => ["pending", "confirmed"].includes(item.status) && new Date(item.startAt).getTime() > now)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const pendingAll = data.appointments.filter((item) => item.status === "pending" && new Date(item.endAt || item.startAt).getTime() > now - DAY_MS).length;

    return {
      today, todayActive, revenueToday, revenueYesterday, expectedToday, occupancy, bookedMinutes, capacity, isOpenToday: Boolean(hours?.isOpen),
      newCustomersToday, newCustomersYesterday, upcoming, next: upcoming[0], pendingAll,
      completedToday: today.filter((item) => item.status === "completed").length,
      pendingToday: today.filter((item) => item.status === "pending").length,
      countTrend: percentChange(todayActive.length, yesterdayActive.length),
      revenueTrend: percentChange(revenueToday, revenueYesterday),
      customerTrend: percentChange(newCustomersToday, newCustomersYesterday),
    };
  }, [data, now]);

  const completedSteps = setupItems.filter((item) => item.done).length;
  const isPublished = business?.status === "active" && business.isPublished === true;
  const setupDone = (id: SetupItem["id"]) => setupItems.find((item) => item.id === id)?.done === true;
  const assistantSteps: SetupAssistantStep[] = [
    { title: t("Mağaza profilini tamamla"), description: t("İşletme bilgilerini, kategoriyi, açıklamayı ve logonu tamamla."), href: "/dashboard/ayarlar", action: t("Profil ayarlarını aç"), done: ["business", "category", "logo", "description"].every((id) => setupDone(id as SetupItem["id"])) },
    { title: t("Çalışma saatlerini kontrol et"), description: t("Açık günleri, molaları ve kapanış saatini düzenle."), href: "/dashboard/calisma-saatleri", action: t("Saatleri kontrol et"), done: setupDone("hours") },
    { title: t("Hizmetlerini ekle"), description: t("Randevu alınacak hizmetleri, sürelerini ve fiyatlarını ekle."), href: "/dashboard/hizmetler", action: t("Hizmet ekle"), done: setupDone("services") },
    { title: t("Ekibini tanımla"), description: t("Hizmet verecek kişileri ve uzmanlıklarını seç."), href: "/dashboard/calisanlar", action: t("Çalışan ekle"), done: setupDone("staff") },
  ];

  const nowDate = new Date(now);
  const hour = nowDate.getHours();
  const greeting = hour < 5 ? t("İyi geceler") : hour < 12 ? t("Günaydın") : hour < 18 ? t("İyi günler") : t("İyi akşamlar");
  const dateLabel = nowDate.toLocaleDateString(locale, { day: "numeric", month: "long", weekday: "long" });
  const minutesToNext = stats?.next ? Math.round((new Date(stats.next.startAt).getTime() - now) / 60_000) : null;

  const quickActions = [
    { key: "new", label: t("Yeni randevu"), text: t("Takvime hızlı kayıt"), icon: CalendarPlus, onClick: () => openQuickAppointment(), primary: true },
    can("customers") && { key: "customer", label: t("Müşteri ekle"), text: t("Yeni müşteri kaydı"), icon: UserPlus, href: "/dashboard/musteriler?new=1" },
    showLiveOperations && { key: "queue", label: t("Sıra çağır"), text: t("Canlı sırayı yönet"), icon: Activity, href: "/dashboard/canli-operasyon" },
    can("checkout") && { key: "checkout", label: t("Kasa"), text: t("Adisyon ve tahsilat"), icon: ReceiptText, href: "/dashboard/operasyon" },
    { key: "calendar", label: t("Takvim"), text: t("Gün ve hafta görünümü"), icon: CalendarDays, href: "/dashboard/takvim" },
    can("assistant") && { key: "rovi", label: t("Rovi'ye sor"), text: t("Verilerinle analiz"), icon: Bot, href: "/dashboard/asistan" },
  ].filter(Boolean).slice(0, 6) as Array<{ key: string; label: string; text: string; icon: LucideIcon; href?: string; onClick?: () => void; primary?: boolean }>;

  const alerts: Array<{ key: string; tone: "amber" | "red" | "accent" | "blue" | "green"; icon: LucideIcon; title: string; text: string; href?: string; cta?: string }> = [];
  if (business?.status === "pending_review") alerts.push({ key: "review", tone: "amber", icon: Clock3, title: t("Mağazanız onay bekliyor"), text: t("Süper admin incelemesi tamamlanınca müşteriler randevu alabilecek.") });
  else if (business && !isPublished) alerts.push({ key: "publish", tone: "amber", icon: Rocket, title: t("Mağazanız henüz yayında değil"), text: t("Kurulumu tamamlayın; onaylandığında randevu almaya hazır olacak."), href: "/dashboard/ayarlar", cta: t("Ayarlar") });
  if (stats?.pendingAll) alerts.push({ key: "pending", tone: "amber", icon: CalendarCheck2, title: t("{count} randevu onayınızı bekliyor", { count: stats.pendingAll }), text: t("Hızlı onay müşterinin randevuya gelme olasılığını artırır."), href: "/dashboard/randevular?status=pending", cta: t("İncele") });
  if (stats?.next && minutesToNext !== null && minutesToNext <= 45) alerts.push({ key: "soon", tone: "accent", icon: Zap, title: minutesToNext <= 1 ? t("Şimdi: {name}", { name: stats.next.customerName }) : t("{count} dk sonra: {name}", { count: minutesToNext, name: stats.next.customerName }), text: [stats.next.serviceName, stats.next.staffName].filter(Boolean).join(" · ") || t("Randevu"), href: `/dashboard/randevular?appointment=${encodeURIComponent(stats.next.id)}`, cta: t("Aç") });
  if (stats && !stats.isOpenToday && setupDone("hours")) alerts.push({ key: "closed", tone: "blue", icon: CalendarDays, title: t("Bugün kapalı görünüyorsunuz"), text: t("Çalışma saatlerinize göre bugün online randevu alınmıyor."), href: "/dashboard/calisma-saatleri", cta: t("Saatler") });

  const loading = !ready;
  const blocks: Partial<Record<DashboardModuleId, ReactNode>> = {
    kpis: (
      <StatGrid columns={4}>
        <StatCard accent label={t("Bugünkü randevu")} icon={CalendarDays} href="/dashboard/randevular" loading={loading}
          value={(stats?.todayActive.length ?? 0).toLocaleString(locale)}
          trend={stats?.countTrend != null ? { value: stats.countTrend, label: t("düne göre") } : null}
          hint={stats ? t("{count} tamamlandı", { count: stats.completedToday }) : undefined} />
        <StatCard label={t("Bugünkü gelir")} icon={CircleDollarSign} tone="green" href={can("checkout") ? "/dashboard/operasyon" : undefined} loading={loading}
          value={money(stats?.revenueToday ?? 0, locale)}
          trend={stats?.revenueTrend != null ? { value: stats.revenueTrend, label: t("düne göre") } : null}
          hint={stats?.expectedToday ? t("+{amount} beklenen", { amount: money(stats.expectedToday, locale) }) : t("Tamamlanan işlemler")} />
        <StatCard label={t("Doluluk")} icon={Gauge} tone="blue" href="/dashboard/takvim" loading={loading}
          value={stats?.occupancy == null ? "—" : `%${stats.occupancy}`}
          progress={stats?.occupancy ?? null}
          hint={stats ? (stats.capacity > 0 ? t("{booked} / {total} saat dolu", { booked: (Math.round(stats.bookedMinutes / 60 * 10) / 10).toLocaleString(locale), total: Math.round(stats.capacity / 60) }) : stats.isOpenToday ? t("Kapasite hesaplanamadı") : t("Bugün kapalı")) : undefined} />
        <StatCard label={t("Yeni müşteri")} icon={UsersRound} tone="violet" href={can("customers") ? "/dashboard/musteriler" : undefined} loading={loading}
          value={(stats?.newCustomersToday ?? 0).toLocaleString(locale)}
          trend={stats?.customerTrend != null ? { value: stats.customerTrend, label: t("düne göre") } : null}
          hint={data ? t("Toplam {count}", { count: data.customerCount.toLocaleString(locale) }) : undefined} />
      </StatGrid>
    ),
    operations: (
      <Panel
        className={styles.fill}
        title={t("Bugünün akışı")}
        description={stats ? t("{records} kayıt · {pending} bekleyen", { records: stats.today.length, pending: stats.pendingToday }) : t("Yükleniyor")}
        icon={CalendarCheck2}
        actions={<Button size="sm" variant="ghost" href="/dashboard/randevular" trailingIcon={ArrowRight}>{t("Tümü")}</Button>}
        flush
      >
        {loading ? (
          <div className={styles.timelineLoading}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={62} radius={16} />)}</div>
        ) : stats && stats.today.length > 0 ? (
          <Timeline items={stats.today} now={now} />
        ) : (
          <>
            <EmptyState mascot="happy" compact title={t("Bugün randevu yok")} description={t("Boş bir gün! Hızlı randevu ekleyebilir ya da mağaza linkini paylaşabilirsiniz.")} action={<Button variant="primary" size="sm" icon={CalendarPlus} onClick={() => openQuickAppointment()}>{t("Randevu ekle")}</Button>} />
            {stats && stats.upcoming.length > 0 && (
              <div className={styles.upcoming}>
                <p className={styles.upcomingLabel}>{t("Yaklaşan")}</p>
                {stats.upcoming.slice(0, 3).map((item) => (
                  <Link key={item.id} href={`/dashboard/randevular?appointment=${encodeURIComponent(item.id)}`} className={styles.upcomingRow}>
                    <time>{new Date(item.startAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}<b>{timeOf(item.startAt, locale)}</b></time>
                    <span><b>{item.customerName}</b><small>{item.serviceName ?? t("Hizmet")}{item.staffName ? ` · ${item.staffName}` : ""}</small></span>
                    <StatusPill status={item.status} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>
    ),
    command: (
      <Panel className={styles.fill} title={t("Hızlı işlemler")} icon={Zap}>
        <div className={styles.actions}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            const body = <><span className={styles.actionIcon}><Icon size={19} aria-hidden /></span><span className={styles.actionText}><b>{action.label}</b><small>{action.text}</small></span></>;
            return action.href
              ? <Link key={action.key} href={action.href} className={styles.action}>{body}</Link>
              : <button key={action.key} type="button" onClick={action.onClick} className={cn(styles.action, action.primary && styles.actionPrimary)}>{body}</button>;
          })}
        </div>
      </Panel>
    ),
    insights: (
      <Panel className={styles.fill} title={t("Uyarılar")} icon={Sparkles} description={alerts.length ? t("{count} konu dikkatinizi bekliyor", { count: alerts.length }) : t("Her şey yolunda görünüyor")}>
        {loading ? <Skeleton height={64} radius={16} /> : alerts.length ? (
          <div className={styles.alerts}>
            {alerts.map((alert) => (
              <Callout key={alert.key} tone={alert.tone} icon={alert.icon} title={alert.title}
                action={alert.href ? <Button size="sm" variant="secondary" href={alert.href}>{alert.cta ?? t("Aç")}</Button> : undefined}>
                <span className={styles.alertText}>{alert.text}</span>
              </Callout>
            ))}
          </div>
        ) : (
          <Callout tone="green" icon={PartyPopper} title={t("Bekleyen iş yok")}>
            <span className={styles.alertText}>{t("Onay bekleyen randevu veya eksik ayar bulunmuyor.")}</span>
          </Callout>
        )}
      </Panel>
    ),
  };
  if (access?.role !== "staff" && completedSteps < setupItems.length) blocks.profile = <SetupAssistant businessId={businessId ?? ""} ready={ready} steps={assistantSteps} />;
  const visibleIds = modules.filter((item) => item.enabled && blocks[item.id]).map((item) => item.id);
  const rows = buildDashboardRows(visibleIds, dashboardModuleSize);
  const cell = (id: DashboardModuleId) => <div key={id} className={styles.cell} data-flip-id={id} style={{ order: visibleIds.indexOf(id) }}>{blocks[id]}</div>;

  return (
    <DashPage>
      <PageHeader
        eyebrow={<><Sparkles size={13} aria-hidden /> {dateLabel}</>}
        title={`${greeting}${business?.name ? `, ${business.name}` : ""}`}
        description={loading ? t("Günün özeti hazırlanıyor…") : !isPublished
          ? t("Kurulumunuzu tamamlayın; mağazanız onaylandığında randevu almaya hazır olacak.")
          : stats?.todayActive.length
            ? `${t("Bugün {count} randevunuz var.", { count: stats.todayActive.length })} ${stats.pendingToday ? t("{count} tanesi onay bekliyor.", { count: stats.pendingToday }) : t("Bekleyen onay yok.")}`
            : t("Bugün için kayıtlı randevu yok. Boş saatleriniz yeni müşteriler için hazır.")}
        actions={<>
          <Button variant="bright" icon={CalendarPlus} onClick={() => openQuickAppointment()}>{t("Yeni randevu")}</Button>
          <Button variant="glass" href="/dashboard/takvim" trailingIcon={ArrowRight}>{t("Takvim")}</Button>
        </>}
        meta={stats?.next ? <Badge icon={Clock3}>{t("Sıradaki: {time} · {name}", { time: timeOf(stats.next.startAt, locale), name: stats.next.customerName })}</Badge> : undefined}
      />

      {loadError && <Callout tone="red" title={t("Veriler yüklenemedi")}>{t(loadError)}</Callout>}

      <div ref={gridRef} className={styles.grid}>
        {rows.map((row) => row.kind === "full"
          ? cell(row.id as DashboardModuleId)
          : (
            <div key={`split-${row.index}`} className={styles.split} style={{ order: row.index }}>
              <div className={styles.column}>{row.left.map((id) => cell(id as DashboardModuleId))}</div>
              <div className={styles.column}>{row.right.map((id) => cell(id as DashboardModuleId))}</div>
            </div>
          ))}
      </div>
    </DashPage>
  );
}
