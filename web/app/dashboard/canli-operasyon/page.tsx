"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Activity, ArrowRight, CalendarClock, Pause, Play, RefreshCw, UsersRound } from "lucide-react";
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

  return <div className="space-y-5 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
      <div><span className="flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--accent)]"><Activity size={16}/> CANLI OPERASYON</span>
        <h1 className="mt-2 text-2xl font-extrabold text-[var(--text-1)]">Canlı Sıra</h1>
        <p className="mt-1 text-sm text-[var(--text-3)]">{business.name} için güncel sıra ve randevu görünümü.</p></div>
      <div className="flex flex-wrap gap-2">
        {!businessEnabled ? <Link className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-1)]" href="/dashboard/ayarlar">Canlı Sırayı aç →</Link> :
          <Button variant="secondary" disabled={!!busy} onClick={() => void togglePause()}
            iconLeft={business.liveQueueIntakePaused ? <Play size={16}/> : <Pause size={16}/> }>
            {business.liveQueueIntakePaused ? "Alımı Devam Ettir" : "Yeni Alımı Duraklat"}</Button>}
        <Button variant="ghost" onClick={() => setRevision((value) => value + 1)} iconLeft={<RefreshCw size={16}/>}>Yenile</Button>
      </div>
    </header>

    {(!businessEnabled || business.liveQueueIntakePaused) && <div role="status" className="rounded-xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900">
      {businessEnabled ? "Yeni müşteri alımı durduruldu. Mevcut müşterileri işlemeye devam edebilirsiniz." :
        "Canlı Sıra işletmeniz için kapalı. Yeni katılım alınmıyor; mevcut kayıtlar korunur ve tamamlanabilir."}
    </div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operasyon özeti">
      {[
        { label: "Sırada", value: entries.filter((item) => ["waiting", "on_the_way"].includes(item.status)).length, icon: UsersRound },
        { label: "Çağrılan", value: entries.filter((item) => item.status === "called").length, icon: ArrowRight },
        { label: "İşlemde", value: entries.filter((item) => item.status === "in_service").length, icon: Activity },
        { label: "Yaklaşan Randevu", value: upcoming[0] ? timeLabel(upcoming[0].startAt) : "—", icon: CalendarClock },
      ].map((metric) => <Card key={metric.label}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[var(--text-3)]">{metric.label}</span><metric.icon size={18} className="text-[var(--accent)]"/></div>
        <strong className="mt-2 block text-2xl text-[var(--text-1)]">{metric.value}</strong></Card>)}
    </section>

    <Card title="Sıradaki Müşteriler" description="Sıralama sunucunun katılım zamanına göre belirlenir.">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-[var(--text-2)]" htmlFor="queue-staff">Personel</label>
        <select id="queue-staff" className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-1)]"
          value={effectiveSelectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}>
          {staff.filter((item) => item.isActive && !item.archivedAt).map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
        </select>
        <Button size="sm" disabled={!eligible || !effectiveSelectedStaffId || !!busy || entries.every((item) => !["waiting", "on_the_way"].includes(item.status))}
          loading={busy === "next"} onClick={() => void callNext()}>Sonraki Müşteriyi Çağır</Button>
      </div>
      {entries.length === 0 ? <EmptyState title="Şu anda sırada bekleyen müşteri yok" description="Yeni katılımlar olduğunda burada görünür."/> :
        <ol className="space-y-3">{entries.map((entry) => {
          const requested = entry.requestedStaffId ? staffById.get(entry.requestedStaffId)?.fullName ?? "Seçili personel" : "İlk müsait personel";
          const assigned = entry.assignedStaffId ? staffById.get(entry.assignedStaffId)?.fullName : null;
          const actions = (capabilities?.transitions[entry.status] ?? []).filter((status) => ACTION_LABELS[status]);
          const calledOverdue = entry.status === "called" && !!entry.calledAt && !!capabilities?.calledGraceMinutes &&
            Date.parse(entry.calledAt) + capabilities.calledGraceMinutes * 60_000 <= clock;
          return <li key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm text-[var(--text-1)]">Müşteri · {entry.id.slice(0, 6)}</strong>
              <p className="mt-1 text-xs text-[var(--text-3)]">{serviceById.get(entry.serviceId)?.name ?? "Hizmet"} · {requested}{assigned && assigned !== requested ? ` · Atanan: ${assigned}` : ""}</p>
              <p className="mt-1 text-xs text-[var(--text-3)]">Katılım: {timeLabel(entry.joinedAt)}</p>
              {entry.status === "on_the_way" && <p className="mt-1 text-xs font-semibold text-[var(--accent)]">🚶 Yola çıktı{entry.declaredEtaMinutes ? ` · Yaklaşık geliş: ${entry.declaredEtaMinutes}${entry.declaredEtaMinutes === 20 ? "+" : ""} dk` : ""}</p>}
              {entry.presenceConfirmedAt && ["waiting", "on_the_way"].includes(entry.status) && <p className="mt-1 text-xs text-[var(--accent)]">✅ Geliyorum onayı verildi</p>}
              {entry.status === "called" && <p className="mt-1 text-xs text-[var(--text-3)]">{calledOverdue ? "Çağrıldı — bekleme süresi aşıldı. Gelmedi kararı operatöre ait." : `Çağrıldı · ${capabilities?.calledGraceMinutes ?? 10} dk bekleme süresi`}</p>}
              {["waiting", "on_the_way"].includes(entry.status) && waitEstimates[entry.id] && <p className="mt-1 text-xs text-[var(--text-3)]">{waitEstimateLabel(waitEstimates[entry.id])}</p>}</div>
              <span className="rounded-full bg-[var(--surface-3)] px-3 py-1 text-xs font-semibold text-[var(--text-1)]">{STATUS_LABELS[entry.status] ?? entry.status}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">{actions.map((status) =>
              <Button key={status} size="sm" variant={status === "cancelled" || status === "no_show" ? "secondary" : "primary"}
                disabled={!!busy || (status === "no_show" && !calledOverdue) || (!eligible && ["called", "in_service"].includes(status))}
                loading={busy === entry.id} onClick={() => void perform(entry, status)}
                aria-label={`${ACTION_LABELS[status]}: ${entry.id.slice(0, 6)}`}>{ACTION_LABELS[status]}</Button>)}</div>
          </li>;
        })}</ol>}
    </Card>

    <Card title="Personel ve Randevu Bağlamı" description="Durumlar canlı sıra ve mevcut randevu kayıtlarından türetilir.">
      {staff.length === 0 ? <p className="text-sm text-[var(--text-3)]">Aktif personel bulunamadı.</p> :
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{staff.map((person) => {
          const activeQueue = entries.find((entry) => entry.assignedStaffId === person.id && ["called", "in_service"].includes(entry.status));
          const currentAppointment = activeAppointments.find((item) => item.staffId === person.id && Date.parse(item.startAt) <= now && Date.parse(item.endAt) > now);
          const next = upcoming.find((item) => item.staffId === person.id);
          const status = !person.isActive || person.archivedAt ? "Çalışmıyor" : activeQueue?.status === "in_service" ? "Canlı işlemde" : activeQueue ? "Müşteri çağrıldı" : currentAppointment ? "Randevuda" : next && Date.parse(next.startAt) - now <= 60 * 60_000 ? "Yaklaşan randevu" : "Takvimi kontrol edin";
          return <div key={person.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <strong className="text-sm text-[var(--text-1)]">{person.fullName}</strong><p className="mt-1 text-xs font-semibold text-[var(--accent)]">{status}</p>
            {activeQueue && <p className="mt-2 text-xs text-[var(--text-3)]">{serviceById.get(activeQueue.serviceId)?.name ?? "Canlı hizmet"}</p>}
            {next && <p className="mt-2 text-xs text-[var(--text-3)]">Sonraki randevu: {timeLabel(next.startAt)} · {next.serviceName ?? serviceById.get(next.serviceId)?.name ?? "Hizmet"}</p>}
          </div>;
        })}</div>}
    </Card>
  </div>;
}
