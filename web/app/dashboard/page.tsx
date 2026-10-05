"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
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
import { normalizeDashboardModules, type DashboardModuleId, type DashboardModulePreference } from "@/components/dashboard/appearance-studio";
import {
  Badge, Button, Callout, DashPage, EmptyState, PageHeader, Panel, Skeleton, StatCard, StatGrid, StatusPill, percentChange,
} from "@/components/dashboard/ui";
import { cn } from "@/lib/utils/cn";
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
function money(value: number) { return `${Math.round(value).toLocaleString("tr-TR")} ₺`; }
function timeOf(value: string) { return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }
function revenueOf(item: Appointment) { return Number(item.paidAmount ?? item.servicePrice ?? 0) || 0; }

function readModules(): DashboardModulePreference[] {
  try { return normalizeDashboardModules(JSON.parse(window.localStorage.getItem("sr-dashboard-modules") ?? "[]")); }
  catch { return normalizeDashboardModules(null); }
}

export default function DashboardHomePage() {
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

  // Ana panel düzeni (Görünüm stüdyosu → Ana panel düzeni).
  useEffect(() => {
    queueMicrotask(() => setModules(readModules()));
    const onChange = (event: Event) => setModules(normalizeDashboardModules((event as CustomEvent).detail));
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
          { id: "business", label: "İşletme bilgilerini tamamla", done: Boolean(currentBusiness?.name && currentBusiness.phone && currentBusiness.email && currentBusiness.address && currentBusiness.city && currentBusiness.district), href: "/dashboard/ayarlar", icon: Building2 },
          { id: "category", label: "İşletme kategorisini seç", done: Boolean(currentBusiness?.category && currentBusiness.category !== "diger"), href: "/dashboard/ayarlar", icon: FolderOpen },
          { id: "hours", label: "Çalışma saatlerini ayarla", done: workingHours.length > 0, href: "/dashboard/calisma-saatleri", icon: Clock3 },
          { id: "services", label: "İlk hizmetini ekle", done: services.length > 0, href: "/dashboard/hizmetler", icon: Scissors },
          { id: "staff", label: "Ekibini tanımla", done: staff.length > 0, href: "/dashboard/calisanlar", icon: UserRound },
          { id: "logo", label: "Logo ekle", done: Boolean(currentBusiness?.logoUrl), href: "/dashboard/ayarlar", icon: ImageIcon },
          { id: "description", label: "İşletme açıklamasını ekle", done: Boolean(currentBusiness?.description && currentBusiness.description.length > 10), href: "/dashboard/ayarlar", icon: FileText },
        ]);
        setLoadError(null);
        setReady(true);
      })
      .catch((error) => {
        if (!active) return;
        const message = userFacingError(error, "İşletme verileri şu anda alınamadı. Lütfen yeniden deneyin.");
        setLoadError(message);
        setReady(true);
        toast.error(message);
      });
    void run();
    const onChanged = () => { void run(); };
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
    return () => { active = false; window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged); };
  }, [businessId, load]);

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
    { title: "Mağaza profilini tamamla", description: "İşletme bilgilerini, kategoriyi, açıklamayı ve logonu tamamla.", href: "/dashboard/ayarlar", action: "Profil ayarlarını aç", done: ["business", "category", "logo", "description"].every((id) => setupDone(id as SetupItem["id"])) },
    { title: "Çalışma saatlerini kontrol et", description: "Açık günleri, molaları ve kapanış saatini düzenle.", href: "/dashboard/calisma-saatleri", action: "Saatleri kontrol et", done: setupDone("hours") },
    { title: "Hizmetlerini ekle", description: "Randevu alınacak hizmetleri, sürelerini ve fiyatlarını ekle.", href: "/dashboard/hizmetler", action: "Hizmet ekle", done: setupDone("services") },
    { title: "Ekibini tanımla", description: "Hizmet verecek kişileri ve uzmanlıklarını seç.", href: "/dashboard/calisanlar", action: "Çalışan ekle", done: setupDone("staff") },
  ];

  const nowDate = new Date(now);
  const hour = nowDate.getHours();
  const greeting = hour < 5 ? "İyi geceler" : hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const dateLabel = nowDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  const minutesToNext = stats?.next ? Math.round((new Date(stats.next.startAt).getTime() - now) / 60_000) : null;

  const quickActions = [
    { key: "new", label: "Yeni randevu", text: "Takvime hızlı kayıt", icon: CalendarPlus, onClick: () => openQuickAppointment(), primary: true },
    can("customers") && { key: "customer", label: "Müşteri ekle", text: "Yeni müşteri kaydı", icon: UserPlus, href: "/dashboard/musteriler?new=1" },
    showLiveOperations && { key: "queue", label: "Sıra çağır", text: "Canlı sırayı yönet", icon: Activity, href: "/dashboard/canli-operasyon" },
    can("checkout") && { key: "checkout", label: "Kasa", text: "Adisyon ve tahsilat", icon: ReceiptText, href: "/dashboard/operasyon" },
    { key: "calendar", label: "Takvim", text: "Gün ve hafta görünümü", icon: CalendarDays, href: "/dashboard/takvim" },
    can("assistant") && { key: "rovi", label: "Rovi'ye sor", text: "Verilerinle analiz", icon: Bot, href: "/dashboard/asistan" },
  ].filter(Boolean).slice(0, 6) as Array<{ key: string; label: string; text: string; icon: LucideIcon; href?: string; onClick?: () => void; primary?: boolean }>;

  const alerts: Array<{ key: string; tone: "amber" | "red" | "accent" | "blue" | "green"; icon: LucideIcon; title: string; text: string; href?: string; cta?: string }> = [];
  if (business?.status === "pending_review") alerts.push({ key: "review", tone: "amber", icon: Clock3, title: "Mağazanız onay bekliyor", text: "Süper admin incelemesi tamamlanınca müşteriler randevu alabilecek." });
  else if (business && !isPublished) alerts.push({ key: "publish", tone: "amber", icon: Rocket, title: "Mağazanız henüz yayında değil", text: "Kurulumu tamamlayın; onaylandığında randevu almaya hazır olacak.", href: "/dashboard/ayarlar", cta: "Ayarlar" });
  if (stats?.pendingAll) alerts.push({ key: "pending", tone: "amber", icon: CalendarCheck2, title: `${stats.pendingAll} randevu onayınızı bekliyor`, text: "Hızlı onay müşterinin randevuya gelme olasılığını artırır.", href: "/dashboard/randevular?status=pending", cta: "İncele" });
  if (stats?.next && minutesToNext !== null && minutesToNext <= 45) alerts.push({ key: "soon", tone: "accent", icon: Zap, title: `${minutesToNext <= 1 ? "Şimdi" : `${minutesToNext} dk sonra`}: ${stats.next.customerName}`, text: [stats.next.serviceName, stats.next.staffName].filter(Boolean).join(" · ") || "Randevu", href: `/dashboard/randevular?appointment=${encodeURIComponent(stats.next.id)}`, cta: "Aç" });
  if (stats && !stats.isOpenToday && setupDone("hours")) alerts.push({ key: "closed", tone: "blue", icon: CalendarDays, title: "Bugün kapalı görünüyorsunuz", text: "Çalışma saatlerinize göre bugün online randevu alınmıyor.", href: "/dashboard/calisma-saatleri", cta: "Saatler" });

  const loading = !ready;
  const order = (id: DashboardModuleId) => modules.findIndex((item) => item.id === id);
  const enabled = (id: DashboardModuleId) => modules.find((item) => item.id === id)?.enabled !== false;
  const moduleStyle = (id: DashboardModuleId) => ({ order: order(id) } as CSSProperties);

  return (
    <DashPage>
      <PageHeader
        eyebrow={<><Sparkles size={13} aria-hidden /> {dateLabel}</>}
        title={`${greeting}${business?.name ? `, ${business.name}` : ""}`}
        description={loading ? "Günün özeti hazırlanıyor…" : !isPublished
          ? "Kurulumunuzu tamamlayın; mağazanız onaylandığında randevu almaya hazır olacak."
          : stats?.todayActive.length
            ? `Bugün ${stats.todayActive.length} randevunuz var. ${stats.pendingToday ? `${stats.pendingToday} tanesi onay bekliyor.` : "Bekleyen onay yok."}`
            : "Bugün için kayıtlı randevu yok. Boş saatleriniz yeni müşteriler için hazır."}
        actions={<>
          <Button variant="bright" icon={CalendarPlus} onClick={() => openQuickAppointment()}>Yeni randevu</Button>
          <Button variant="glass" href="/dashboard/takvim" trailingIcon={ArrowRight}>Takvim</Button>
        </>}
        meta={stats?.next ? <Badge icon={Clock3}>Sıradaki: {timeOf(stats.next.startAt)} · {stats.next.customerName}</Badge> : undefined}
      />

      {loadError && <Callout tone="red" title="Veriler yüklenemedi">{loadError}</Callout>}

      <div className={styles.grid}>
        {enabled("kpis") && (
          <div className={cn(styles.cell, styles.full)} style={moduleStyle("kpis")}>
            <StatGrid columns={4}>
              <StatCard accent label="Bugünkü randevu" icon={CalendarDays} href="/dashboard/randevular" loading={loading}
                value={(stats?.todayActive.length ?? 0).toLocaleString("tr-TR")}
                trend={stats?.countTrend != null ? { value: stats.countTrend, label: "düne göre" } : null}
                hint={stats ? `${stats.completedToday} tamamlandı` : undefined} />
              <StatCard label="Bugünkü gelir" icon={CircleDollarSign} tone="green" href={can("checkout") ? "/dashboard/operasyon" : undefined} loading={loading}
                value={money(stats?.revenueToday ?? 0)}
                trend={stats?.revenueTrend != null ? { value: stats.revenueTrend, label: "düne göre" } : null}
                hint={stats?.expectedToday ? `+${money(stats.expectedToday)} beklenen` : "Tamamlanan işlemler"} />
              <StatCard label="Doluluk" icon={Gauge} tone="blue" href="/dashboard/takvim" loading={loading}
                value={stats?.occupancy == null ? "—" : `%${stats.occupancy}`}
                progress={stats?.occupancy ?? null}
                hint={stats ? (stats.capacity > 0 ? `${Math.round(stats.bookedMinutes / 60 * 10) / 10} / ${Math.round(stats.capacity / 60)} saat dolu` : stats.isOpenToday ? "Kapasite hesaplanamadı" : "Bugün kapalı") : undefined} />
              <StatCard label="Yeni müşteri" icon={UsersRound} tone="violet" href={can("customers") ? "/dashboard/musteriler" : undefined} loading={loading}
                value={(stats?.newCustomersToday ?? 0).toLocaleString("tr-TR")}
                trend={stats?.customerTrend != null ? { value: stats.customerTrend, label: "düne göre" } : null}
                hint={data ? `Toplam ${data.customerCount.toLocaleString("tr-TR")}` : undefined} />
            </StatGrid>
          </div>
        )}

        {enabled("operations") && (
          <Panel
            className={cn(styles.cell, styles.wide)}
            style={moduleStyle("operations")}
            title="Bugünün akışı"
            description={stats ? `${stats.today.length} kayıt · ${stats.pendingToday} bekleyen` : "Yükleniyor"}
            icon={CalendarCheck2}
            actions={<Button size="sm" variant="ghost" href="/dashboard/randevular" trailingIcon={ArrowRight}>Tümü</Button>}
            flush
          >
            {loading ? (
              <div className={styles.timelineLoading}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={62} radius={16} />)}</div>
            ) : stats && stats.today.length > 0 ? (
              <Timeline items={stats.today} now={now} />
            ) : (
              <>
                <EmptyState mascot="happy" compact title="Bugün randevu yok" description="Boş bir gün! Hızlı randevu ekleyebilir ya da mağaza linkini paylaşabilirsiniz." action={<Button variant="primary" size="sm" icon={CalendarPlus} onClick={() => openQuickAppointment()}>Randevu ekle</Button>} />
                {stats && stats.upcoming.length > 0 && (
                  <div className={styles.upcoming}>
                    <p className={styles.upcomingLabel}>Yaklaşan</p>
                    {stats.upcoming.slice(0, 3).map((item) => (
                      <Link key={item.id} href={`/dashboard/randevular?appointment=${encodeURIComponent(item.id)}`} className={styles.upcomingRow}>
                        <time>{new Date(item.startAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}<b>{timeOf(item.startAt)}</b></time>
                        <span><b>{item.customerName}</b><small>{item.serviceName ?? "Hizmet"}{item.staffName ? ` · ${item.staffName}` : ""}</small></span>
                        <StatusPill status={item.status} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </Panel>
        )}

        {enabled("command") && (
          <Panel className={cn(styles.cell, styles.side)} style={moduleStyle("command")} title="Hızlı işlemler" icon={Zap}>
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
        )}

        {enabled("insights") && (
          <Panel className={cn(styles.cell, styles.side)} style={moduleStyle("insights")} title="Uyarılar" icon={Sparkles} description={alerts.length ? `${alerts.length} konu dikkatinizi bekliyor` : "Her şey yolunda görünüyor"}>
            {loading ? <Skeleton height={64} radius={16} /> : alerts.length ? (
              <div className={styles.alerts}>
                {alerts.map((alert) => (
                  <Callout key={alert.key} tone={alert.tone} icon={alert.icon} title={alert.title}
                    action={alert.href ? <Button size="sm" variant="secondary" href={alert.href}>{alert.cta ?? "Aç"}</Button> : undefined}>
                    <span className={styles.alertText}>{alert.text}</span>
                  </Callout>
                ))}
              </div>
            ) : (
              <Callout tone="green" icon={PartyPopper} title="Bekleyen iş yok">
                <span className={styles.alertText}>Onay bekleyen randevu veya eksik ayar bulunmuyor.</span>
              </Callout>
            )}
          </Panel>
        )}

        {enabled("profile") && access?.role !== "staff" && completedSteps < setupItems.length && (
          <div className={cn(styles.cell, styles.full)} style={moduleStyle("profile")}>
            <SetupAssistant businessId={businessId ?? ""} ready={ready} steps={assistantSteps} />
          </div>
        )}
      </div>
    </DashPage>
  );
}
