"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, ArrowRight, CalendarClock, CheckCircle2, Clock3, Pause, Play, RefreshCw, Settings2, Ticket, UserRound, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useBusinessContext } from "@/features/businesses/business-context";
import { updateBusiness } from "@/features/businesses/business-repository";
import { listAppointmentsByDateRange } from "@/features/appointments/appointment-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import {
  callNextCustomer, getBusinessLiveWaitEstimates, getLiveOperationsCapabilities, listActiveQueueOnce, listQueueServices,
  transitionQueueEntry, watchActiveQueue, watchBusinessLiveSettings, watchNearbyAppointments, watchStaff,
  type LiveOperationsCapabilities, type QueueEntry,
} from "@/features/live-queue/live-operations-repository";
import type { Appointment } from "@/types/appointments";
import type { Business } from "@/types/business";
import type { Service } from "@/types/service";
import type { Staff } from "@/types/staff";
import { waitEstimateLabel, type LiveWaitEstimate } from "@/features/live-queue/wait-estimate";
import { LiveQueueSettings } from "@/features/live-queue/live-queue-settings";

const ACTION_LABELS: Record<string, string> = {
  called: "Müşteriyi Çağır", in_service: "İşleme Başla", completed: "İşlemi Tamamla",
  no_show: "Gelmedi", cancelled: "İptal Et",
};
const STATUS_LABELS: Record<string, string> = {
  waiting: "Sırada", on_the_way: "Yola Çıktı", called: "Çağrıldı", in_service: "İşlemde",
};

function operationError(error: unknown): string {
  const value = error as { code?: string; message?: string };
  if (value.message?.includes("FEATURE_DISABLED")) return "Canlı operasyon şu anda devre dışı.";
  if (value.code?.includes("permission-denied")) return "Bu işlem için yetkiniz bulunmuyor.";
  if (value.code?.includes("already-exists")) return "Personelin devam eden işlemi var. Liste yenileniyor.";
  if (value.code?.includes("failed-precondition")) return "Sıra veya personel durumu değişti. Liste yenileniyor.";
  if (value.code?.includes("not-found")) return "Uygun müşteri bulunamadı.";
  return "İşlem tamamlanamadı. Lütfen yeniden deneyin.";
}

function timeLabel(value?: string): string {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function LiveOperationsPage() {
  const { businessId, access, refreshBusinesses } = useBusinessContext();
  const [global, setGlobal] = useState<{ queue: boolean; operations: boolean } | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [capabilities, setCapabilities] = useState<LiveOperationsCapabilities | null>(null);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [waitEstimates, setWaitEstimates] = useState<Record<string, LiveWaitEstimate>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => subscribeLiveFeatureAvailability((value) => setGlobal({
    queue: value.isLiveQueueEnabled, operations: value.isLiveOperationsEnabled,
  })), []);

  useEffect(() => {
    if (!businessId) return;
    return watchBusinessLiveSettings(businessId, (value) => { setBusiness(value); if (!value) setError(true); }, () => setError(true));
  }, [businessId, revision]);

  const globalEnabled = global?.queue === true && global.operations === true;
  const businessEnabled = business?.liveQueueEnabled === true;
  const businessLoaded = business !== null;
  const eligible = business?.status === "active" && business.isPublished === true && business.isSuspended !== true;

  useEffect(() => {
    if (!businessId || !globalEnabled || !businessLoaded || access?.role === "staff") return;
    let alive = true;
    const listeners: Array<() => void> = [];
    queueMicrotask(() => { if (alive) { setLoading(true); setError(false); } });
    Promise.all([getLiveOperationsCapabilities(businessId), listQueueServices(businessId)])
      .then(async ([accessData, serviceRows]) => {
        if (!alive) return;
        setCapabilities(accessData);
        setServices(serviceRows);
        const failed = () => { if (alive) setError(true); };
        if (businessEnabled) {
          listeners.push(watchActiveQueue(businessId, accessData.activeStatuses, setEntries, failed));
          listeners.push(watchStaff(businessId, setStaff, failed));
          listeners.push(watchNearbyAppointments(businessId, setAppointments, failed));
        } else {
          const [queue, staffRows, appointmentRows] = await Promise.all([
            listActiveQueueOnce(businessId, accessData.activeStatuses), listStaff(businessId),
            listAppointmentsByDateRange(businessId, new Date(Date.now() - 8 * 60 * 60_000), new Date(Date.now() + 24 * 60 * 60_000)),
          ]);
          if (!alive) return;
          setEntries(queue); setStaff(staffRows); setAppointments(appointmentRows);
        }
      })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; listeners.forEach((unsubscribe) => unsubscribe()); };
  }, [businessId, globalEnabled, businessEnabled, businessLoaded, access?.role, revision]);

  const effectiveSelectedStaffId = staff.some((item) => item.id === selectedStaffId && item.isActive && !item.archivedAt)
    ? selectedStaffId : staff.find((item) => item.isActive && !item.archivedAt)?.id ?? "";

  const serviceById = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const staffById = useMemo(() => new Map(staff.map((item) => [item.id, item])), [staff]);
  const now = clock;
  const waitRefreshTick = Math.floor(clock / 120_000);
  const activeAppointments = appointments.filter((item) => ["pending", "confirmed"].includes(item.status));
  useEffect(() => {
    if (!businessId || !globalEnabled || entries.every((item) => !["waiting", "on_the_way"].includes(item.status))) {
      queueMicrotask(() => setWaitEstimates({})); return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      getBusinessLiveWaitEstimates(businessId).then((value) => { if (!cancelled) setWaitEstimates(value); })
        .catch(() => { if (!cancelled) setWaitEstimates({}); });
    }, 600);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [businessId, globalEnabled, entries, appointments, staff, services, waitRefreshTick]);
  const upcoming = activeAppointments.filter((item) => Date.parse(item.startAt) > now)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));

  async function perform(entry: QueueEntry, status: string) {
    if (!businessId || busy) return;
    if (["cancelled", "no_show"].includes(status) && !window.confirm(status === "no_show"
      ? "Bu müşteriyi ‘Gelmedi’ olarak işaretlemek istediğinizden emin misiniz?"
      : "Bu sıra kaydını iptal etmek istediğinizden emin misiniz?")) return;
    setBusy(entry.id);
    try {
      await transitionQueueEntry(businessId, entry.id, status,
        (entry.assignedStaffId ?? entry.requestedStaffId ?? effectiveSelectedStaffId) || undefined);
      toast.success("Sıra durumu güncellendi.");
      if (!businessEnabled) setRevision((value) => value + 1);
    } catch (cause) {
      toast.error(operationError(cause));
      if (!businessEnabled) setRevision((value) => value + 1);
    } finally { setBusy(null); }
  }

  async function callNext() {
    if (!businessId || !effectiveSelectedStaffId || busy) return;
    setBusy("next");
    try {
      await callNextCustomer(businessId, effectiveSelectedStaffId);
      toast.success("Sonraki müşteri çağrıldı.");
      if (!businessEnabled) setRevision((value) => value + 1);
    } catch (cause) { toast.error(operationError(cause)); }
    finally { setBusy(null); }
  }

  async function togglePause() {
    if (!businessId || !business || busy) return;
    setBusy("pause");
    try {
      await updateBusiness(businessId, { liveQueueIntakePaused: business.liveQueueIntakePaused !== true });
      refreshBusinesses();
      toast.success(business.liveQueueIntakePaused ? "Yeni müşteri alımı devam ediyor." : "Yeni müşteri alımı durduruldu; mevcut sıra korunur.");
    } catch { toast.error("Alım durumu kaydedilemedi."); }
    finally { setBusy(null); }
  }

  if (access?.role === "staff") return <EmptyState title="Bu alan yöneticilere özel" description="Canlı sıra operasyonları işletme yöneticileri tarafından yürütülür." />;
  if (global === null) return <LoadingState title="Canlı operasyon yükleniyor" description="Sıra ve takvim durumu hazırlanıyor..." />;
  if (!globalEnabled) return <EmptyState title="Canlı operasyon özelliği şu anda kullanılamıyor" description="Normal randevu yönetiminiz kesintisiz devam eder." />;
  if (error) return <ErrorState title="Canlı sıra yüklenemedi" description="Veriler güvenle alınamadı. Yeniden deneyin." action={<Button onClick={() => { setError(false); setRevision((value) => value + 1); }}>Yeniden dene</Button>} />;
  if (!business) return <LoadingState title="Canlı operasyon yükleniyor" description="İşletme durumu kontrol ediliyor..." />;
  if (loading) return <LoadingState title="Canlı operasyon yükleniyor" description="Sıra ve takvim durumu hazırlanıyor..." />;

  return <div className="business-queue-page space-y-5 pb-12">
    <header className="business-queue-hero">
      <div className="business-queue-hero__copy"><span className="business-queue-eyebrow"><Activity size={16}/> CANLI OPERASYON MERKEZİ</span>
        <h1>Canlı <em>Sıra.</em></h1>
        <p>{business.name} için müşterileri, personeli ve yaklaşan randevuları tek ekrandan yönet.</p>
        <span className="business-queue-live-state"><i />{!businessEnabled ? "Canlı sıra kapalı" : business.liveQueueIntakePaused ? "Yeni müşteri alımı duraklatıldı" : "Yeni müşteri kabul ediliyor"}</span></div>
      <div className="business-queue-hero__actions">
        {!businessEnabled ? <a className="business-queue-hero__button" href="#canli-sira-ayari"><Settings2 size={16}/> Canlı Sırayı aç</a> :
          <button type="button" className="business-queue-hero__button" disabled={!!busy} onClick={() => void togglePause()}>
            {business.liveQueueIntakePaused ? <Play size={16}/> : <Pause size={16}/>}
            {business.liveQueueIntakePaused ? "Alımı Devam Ettir" : "Yeni Alımı Duraklat"}</button>}
        <button type="button" className="business-queue-hero__refresh" onClick={() => setRevision((value) => value + 1)} aria-label="Canlı sıra verilerini yenile"><RefreshCw size={17}/></button>
      </div>
    </header>

    {(!businessEnabled || business.liveQueueIntakePaused) && <div role="status" className="rounded-xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900">
      {businessEnabled ? "Yeni müşteri alımı durduruldu. Mevcut müşterileri işlemeye devam edebilirsiniz." :
        "Canlı Sıra işletmeniz için kapalı. Yeni katılım alınmıyor; mevcut kayıtlar korunur ve tamamlanabilir."}
    </div>}

    <section className="business-queue-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operasyon özeti">
      {[
        { label: "Sırada", value: entries.filter((item) => ["waiting", "on_the_way"].includes(item.status)).length, icon: UsersRound, note: "Yeni hizmet bekliyor" },
        { label: "Çağrılan", value: entries.filter((item) => item.status === "called").length, icon: Ticket, note: "Müşteri çağrıldı" },
        { label: "İşlemde", value: entries.filter((item) => item.status === "in_service").length, icon: Activity, note: "Hizmet sürüyor" },
        { label: "Yaklaşan Randevu", value: upcoming[0] ? timeLabel(upcoming[0].startAt) : "—", icon: CalendarClock, note: "Planlı randevu" },
      ].map((metric) => <Card key={metric.label} className="business-queue-metric"><div className="business-queue-metric__top"><span>{metric.label}</span><span className="business-queue-metric__icon"><metric.icon size={19}/></span></div>
        <strong>{metric.value}</strong><small>{metric.note}</small></Card>)}
    </section>

    <Card className="business-queue-list-card">
      <div className="business-queue-section-head"><div><span className="business-queue-kicker"><i/> ANLIK SIRA</span><h2>Sıradaki Müşteriler</h2><p>Katılım sırası sunucu zamanına göre belirlenir.</p></div><span className="business-queue-count">{entries.length} aktif kayıt</span></div>
      <div className="business-queue-toolbar">
        <label htmlFor="queue-staff">Çağıracak personel</label>
        <select id="queue-staff" value={effectiveSelectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}>
          {staff.filter((item) => item.isActive && !item.archivedAt).map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
        </select>
        <Button size="sm" disabled={!eligible || !effectiveSelectedStaffId || !!busy || entries.every((item) => !["waiting", "on_the_way"].includes(item.status))}
          loading={busy === "next"} onClick={() => void callNext()} iconLeft={<ArrowRight size={16}/>}>Sonraki Müşteriyi Çağır</Button>
      </div>
      {entries.length === 0 ? <EmptyState title="Şu anda sırada bekleyen müşteri yok" description="Yeni katılımlar olduğunda burada görünür."/> :
        <ol className="business-queue-list">{entries.map((entry, index) => {
          const requested = entry.requestedStaffId ? staffById.get(entry.requestedStaffId)?.fullName ?? "Seçili personel" : "İlk müsait personel";
          const assigned = entry.assignedStaffId ? staffById.get(entry.assignedStaffId)?.fullName : null;
          const actions = (capabilities?.transitions[entry.status] ?? []).filter((status) => ACTION_LABELS[status]);
          const calledOverdue = entry.status === "called" && !!entry.calledAt && !!capabilities?.calledGraceMinutes &&
            Date.parse(entry.calledAt) + capabilities.calledGraceMinutes * 60_000 <= clock;
          return <li key={entry.id} className="business-queue-row">
            <div className="business-queue-row__main"><span className="business-queue-row__number">{String(index + 1).padStart(2, "0")}</span><span className="business-queue-row__avatar"><UserRound size={22}/></span><div className="business-queue-row__details"><strong>Müşteri · {entry.id.slice(0, 6)}</strong>
              <p>{serviceById.get(entry.serviceId)?.name ?? "Hizmet"} · {requested}{assigned && assigned !== requested ? ` · Atanan: ${assigned}` : ""}</p>
              <span className="business-queue-row__time"><Clock3 size={13}/> Katılım {timeLabel(entry.joinedAt)}</span>
              {entry.status === "on_the_way" && <span className="business-queue-row__notice"><ArrowRight size={14}/> Yola çıktı{entry.declaredEtaMinutes ? ` · Yaklaşık geliş: ${entry.declaredEtaMinutes}${entry.declaredEtaMinutes === 20 ? "+" : ""} dk` : ""}</span>}
              {entry.presenceConfirmedAt && ["waiting", "on_the_way"].includes(entry.status) && <span className="business-queue-row__notice"><CheckCircle2 size={14}/> Geliyorum onayı verildi</span>}
              {entry.status === "called" && <span className="business-queue-row__time">{calledOverdue ? "Çağrıldı — bekleme süresi aşıldı. Gelmedi kararı operatöre ait." : `Çağrıldı · ${capabilities?.calledGraceMinutes ?? 10} dk bekleme süresi`}</span>}
              {["waiting", "on_the_way"].includes(entry.status) && waitEstimates[entry.id] && <span className="business-queue-row__time">{waitEstimateLabel(waitEstimates[entry.id])}</span>}</div>
              <span className={`business-queue-row__status status-${entry.status}`}>{STATUS_LABELS[entry.status] ?? entry.status}</span></div>
            <div className="business-queue-row__actions">{actions.map((status) =>
              <Button key={status} size="sm" variant={status === "cancelled" || status === "no_show" ? "secondary" : "primary"}
                disabled={!!busy || (status === "no_show" && !calledOverdue) || (!eligible && ["called", "in_service"].includes(status))}
                loading={busy === entry.id} onClick={() => void perform(entry, status)}
                aria-label={`${ACTION_LABELS[status]}: ${entry.id.slice(0, 6)}`}>{ACTION_LABELS[status]}</Button>)}</div>
          </li>;
        })}</ol>}
    </Card>

    <Card className="business-queue-team-card">
      <div className="business-queue-section-head"><div><span className="business-queue-kicker"><i/> EKİP DURUMU</span><h2>Personel ve Randevular</h2><p>Durumlar canlı sıra ve mevcut randevu kayıtlarından türetilir.</p></div></div>
      {staff.length === 0 ? <p className="text-sm text-[var(--text-3)]">Aktif personel bulunamadı.</p> :
        <div className="business-queue-team-grid grid gap-3 md:grid-cols-2 xl:grid-cols-3">{staff.map((person) => {
          const activeQueue = entries.find((entry) => entry.assignedStaffId === person.id && ["called", "in_service"].includes(entry.status));
          const currentAppointment = activeAppointments.find((item) => item.staffId === person.id && Date.parse(item.startAt) <= now && Date.parse(item.endAt) > now);
          const next = upcoming.find((item) => item.staffId === person.id);
          const status = !person.isActive || person.archivedAt ? "Çalışmıyor" : activeQueue?.status === "in_service" ? "Canlı işlemde" : activeQueue ? "Müşteri çağrıldı" : currentAppointment ? "Randevuda" : next && Date.parse(next.startAt) - now <= 60 * 60_000 ? "Yaklaşan randevu" : "Takvimi kontrol edin";
          return <div key={person.id} className="business-queue-team-member">
            <span className="business-queue-team-member__icon"><UserRound size={19}/></span><div><strong>{person.fullName}</strong><p>{status}</p></div>
            {activeQueue && <p className="mt-2 text-xs text-[var(--text-3)]">{serviceById.get(activeQueue.serviceId)?.name ?? "Canlı hizmet"}</p>}
            {next && <p className="mt-2 text-xs text-[var(--text-3)]">Sonraki randevu: {timeLabel(next.startAt)} · {next.serviceName ?? serviceById.get(next.serviceId)?.name ?? "Hizmet"}</p>}
          </div>;
        })}</div>}
    </Card>
    <div id="canli-sira-ayari"><LiveQueueSettings business={business} onChanged={(liveQueueEnabled) =>
      setBusiness((current) => current ? { ...current, liveQueueEnabled } : current)} /></div>
  </div>;
}
