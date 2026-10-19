"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity, ArrowRight, CalendarClock, CheckCircle2, Clock3, LoaderCircle, Megaphone, Pause, Play, RefreshCw,
  Settings2, Ticket, Timer, UserRound, UsersRound, type LucideIcon,
} from "lucide-react";
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
import {
  ConfirmSheet, EmptyState, HeroChip, Notice, Panel, Pill, StatTile, StudioHero, StudioPage, StudioSkeleton, cx, studio,
  type PillTone,
} from "../_studio";
import l from "./live.module.css";

const ACTION_LABELS: Record<string, string> = {
  called: "Müşteriyi Çağır", in_service: "İşleme Başla", completed: "İşlemi Tamamla",
  no_show: "Gelmedi", cancelled: "İptal Et",
};
const ACTION_ICONS: Record<string, LucideIcon> = {
  called: Megaphone, in_service: Play, completed: CheckCircle2,
};
const STATUS_LABELS: Record<string, string> = {
  waiting: "Sırada", on_the_way: "Yola Çıktı", called: "Çağrıldı", in_service: "İşlemde",
};
const STATUS_TONES: Record<string, PillTone> = {
  waiting: "neutral", on_the_way: "info", called: "warn", in_service: "ok",
};
const DESTRUCTIVE = ["cancelled", "no_show"];
const WAITING = ["waiting", "on_the_way"];
const SERVING = ["called", "in_service"];

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

function minutesSince(value: string | undefined, now: number): number | null {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 60_000)) : null;
}

function durationLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk`;
  return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
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
  const [pending, setPending] = useState<{ entry: QueueEntry; status: string } | null>(null);

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

  /** Gelmedi / İptal gibi geri alınamaz geçişler önce onay ister. */
  function requestAction(entry: QueueEntry, status: string) {
    if (busy) return;
    if (DESTRUCTIVE.includes(status)) { setPending({ entry, status }); return; }
    void perform(entry, status);
  }

  async function confirmPending() {
    if (!pending) return;
    await perform(pending.entry, pending.status);
    setPending(null);
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

  if (access?.role === "staff") return <StudioPage label="Canlı operasyon"><EmptyState mood="idle" title="Bu alan yöneticilere özel" description="Canlı sıra operasyonları işletme yöneticileri tarafından yürütülür." /></StudioPage>;
  if (global === null) return <StudioPage label="Canlı operasyon"><StudioSkeleton stats={4} rows={4} label="Canlı operasyon yükleniyor" /></StudioPage>;
  if (!globalEnabled) return <StudioPage label="Canlı operasyon"><EmptyState mood="idle" title="Canlı operasyon özelliği şu anda kullanılamıyor" description="Normal randevu yönetiminiz kesintisiz devam eder." /></StudioPage>;
  if (error) return <StudioPage label="Canlı operasyon"><EmptyState mood="thinking" title="Canlı sıra yüklenemedi" description="Veriler güvenle alınamadı. Yeniden deneyin."
    action={<button type="button" className={cx(studio.btn, studio.btnPrimary)} onClick={() => { setError(false); setRevision((value) => value + 1); }}><RefreshCw size={16} aria-hidden /> Yeniden dene</button>} /></StudioPage>;
  if (!business || loading) return <StudioPage label="Canlı operasyon"><StudioSkeleton stats={4} rows={4} label="Canlı operasyon yükleniyor" /></StudioPage>;

  const waitingEntries = entries.filter((item) => !SERVING.includes(item.status));
  const servingEntries = entries.filter((item) => SERVING.includes(item.status));
  const waitingCount = entries.filter((item) => WAITING.includes(item.status)).length;
  const activeStaff = staff.filter((item) => item.isActive && !item.archivedAt);
  const callDisabled = !eligible || !effectiveSelectedStaffId || !!busy || entries.every((item) => !WAITING.includes(item.status));
  const nextUp = entries.find((item) => WAITING.includes(item.status));
  const liveState = !businessEnabled ? "Canlı sıra kapalı" : business.liveQueueIntakePaused ? "Yeni müşteri alımı duraklatıldı" : "Yeni müşteri kabul ediliyor";
  const liveTone = !businessEnabled ? l.stateOff : business.liveQueueIntakePaused ? l.statePaused : l.stateOn;

  function entryInfo(entry: QueueEntry) {
    const requested = entry.requestedStaffId ? staffById.get(entry.requestedStaffId)?.fullName ?? "Seçili personel" : "İlk müsait personel";
    const assigned = entry.assignedStaffId ? staffById.get(entry.assignedStaffId)?.fullName : null;
    const actions = (capabilities?.transitions[entry.status] ?? []).filter((status) => ACTION_LABELS[status]);
    const calledOverdue = entry.status === "called" && !!entry.calledAt && !!capabilities?.calledGraceMinutes &&
      Date.parse(entry.calledAt) + capabilities.calledGraceMinutes * 60_000 <= clock;
    return { requested, assigned, actions, calledOverdue, service: serviceById.get(entry.serviceId)?.name ?? "Hizmet" };
  }

  function renderActions(entry: QueueEntry, actions: string[], calledOverdue: boolean, large?: boolean) {
    if (!actions.length) return null;
    const ordered = [...actions.filter((status) => !DESTRUCTIVE.includes(status)), ...actions.filter((status) => DESTRUCTIVE.includes(status))];
    return <div className={cx(l.actions, large && l.actionsLarge)}>
      {ordered.map((status, index) => {
        const destructive = DESTRUCTIVE.includes(status);
        const Icon = ACTION_ICONS[status];
        const disabled = !!busy || (status === "no_show" && !calledOverdue) || (!eligible && ["called", "in_service"].includes(status));
        const loadingThis = busy === entry.id && !pending;
        return <button key={status} type="button" disabled={disabled}
          className={cx(studio.btn,
            large ? (destructive ? cx(studio.btnGlass, l.dangerGlass) : index === 0 ? studio.btnBright : studio.btnGlass)
              : (destructive ? studio.btnDangerSoft : index === 0 ? studio.btnPrimary : studio.btnSoft),
            large && !destructive && index === 0 && studio.btnLg, !destructive && l.actionMain)}
          onClick={() => requestAction(entry, status)}
          aria-label={`${ACTION_LABELS[status]}: ${entry.id.slice(0, 6)}`}>
          {loadingThis && index === 0 ? <LoaderCircle size={17} className={studio.spin} aria-hidden /> : Icon ? <Icon size={17} aria-hidden /> : null}
          {ACTION_LABELS[status]}
        </button>;
      })}
    </div>;
  }

  return <StudioPage label="Canlı operasyon" className={l.page}>
    <StudioHero eyebrow="Canlı operasyon merkezi" icon={Activity} title="Canlı Sıra"
      description={`${business.name} için müşterileri, personeli ve yaklaşan randevuları tek ekrandan yönet.`}
      actions={<>
        {!businessEnabled ? <a className={cx(studio.btn, studio.btnBright)} href="#canli-sira-ayari"><Settings2 size={16} aria-hidden /> Canlı Sırayı aç</a> :
          <button type="button" className={cx(studio.btn, business.liveQueueIntakePaused ? studio.btnBright : studio.btnGlass)} disabled={!!busy} onClick={() => void togglePause()}>
            {busy === "pause" ? <LoaderCircle size={16} className={studio.spin} aria-hidden /> : business.liveQueueIntakePaused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
            {business.liveQueueIntakePaused ? "Alımı Devam Ettir" : "Yeni Alımı Duraklat"}</button>}
        <button type="button" className={cx(studio.btn, studio.btnGlass, studio.iconBtn)} onClick={() => setRevision((value) => value + 1)} aria-label="Canlı sıra verilerini yenile"><RefreshCw size={17} aria-hidden /></button>
      </>}>
      <span className={cx(l.liveState, liveTone)}><i aria-hidden />{liveState}</span>
      <HeroChip icon={UsersRound} value={waitingCount} label="sırada" />
    </StudioHero>

    {(!businessEnabled || business.liveQueueIntakePaused) && <Notice tone="warn" icon={Pause}>
      {businessEnabled ? "Yeni müşteri alımı durduruldu. Mevcut müşterileri işlemeye devam edebilirsiniz." :
        "Canlı Sıra işletmeniz için kapalı. Yeni katılım alınmıyor; mevcut kayıtlar korunur ve tamamlanabilir."}
    </Notice>}

    <section className={l.callCard} aria-label="Sıradakini çağır">
      <div className={l.callCopy}>
        <span className={l.callKicker}>Sıradaki</span>
        <strong className={l.callNext}>{nextUp ? `${serviceById.get(nextUp.serviceId)?.name ?? "Hizmet"} · ${nextUp.id.slice(0, 6)}` : "Bekleyen müşteri yok"}</strong>
        <span className={l.callNote}>{waitingCount ? `${waitingCount} kişi sırada · katılım sırası sunucu zamanına göre belirlenir` : "Yeni katılımlar olduğunda burada görünür."}</span>
      </div>
      <div className={l.callControls}>
        <label className={studio.field} htmlFor="queue-staff">
          <span className={l.callLabel}>Çağıracak personel</span>
          <select id="queue-staff" className={cx(studio.select, l.callSelect)} value={effectiveSelectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} disabled={!activeStaff.length}>
            {activeStaff.length ? activeStaff.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>) : <option value="">Aktif personel yok</option>}
          </select>
        </label>
        <button type="button" className={cx(studio.btn, studio.btnPrimary, studio.btnLg, studio.btnBlock, l.callBtn)} disabled={callDisabled} onClick={() => void callNext()}>
          {busy === "next" ? <LoaderCircle size={22} className={studio.spin} aria-hidden /> : <Megaphone size={22} aria-hidden />}
          Sıradakini çağır <ArrowRight size={20} aria-hidden />
        </button>
      </div>
    </section>

    <div className={studio.stats} aria-label="Operasyon özeti">
      <StatTile label="Sırada" value={waitingCount} hint="Yeni hizmet bekliyor" icon={UsersRound} accent />
      <StatTile label="Çağrılan" value={entries.filter((item) => item.status === "called").length} hint="Müşteri çağrıldı" icon={Ticket} />
      <StatTile label="İşlemde" value={entries.filter((item) => item.status === "in_service").length} hint="Hizmet sürüyor" icon={Activity} />
      <StatTile label="Yaklaşan Randevu" value={upcoming[0] ? timeLabel(upcoming[0].startAt) : "—"} hint="Planlı randevu" icon={CalendarClock} />
    </div>

    <section className={l.section} aria-labelledby="now-serving-title">
      <div className={l.sectionHead}>
        <h2 id="now-serving-title" className={studio.sectionLabel}>Şu an hizmette</h2>
        <Pill tone={servingEntries.length ? "ok" : "neutral"} dot>{servingEntries.length} aktif</Pill>
      </div>
      {servingEntries.length === 0 ? <div className={l.servingEmpty}><span className={l.servingEmptyIcon}><Ticket size={22} aria-hidden /></span><div><b>Şu anda hizmet verilen müşteri yok</b><small>“Sıradakini çağır” ile sıradaki müşteriyi çağırın.</small></div></div> :
        <div className={l.servingGrid}>{servingEntries.map((entry) => {
          const info = entryInfo(entry);
          const staffName = info.assigned ?? info.requested;
          const since = entry.status === "called" ? minutesSince(entry.calledAt, clock) : null;
          return <article key={entry.id} className={cx(l.serving, entry.status === "called" && l.servingCalled, info.calledOverdue && l.servingOverdue)}>
            <div className={l.servingTop}>
              <span className={l.servingBadge}><i aria-hidden />{STATUS_LABELS[entry.status] ?? entry.status}</span>
              <span className={l.servingTime}>{entry.status === "called" ? <><Timer size={14} aria-hidden /> {since === null ? "Çağrıldı" : since < 1 ? "Az önce çağrıldı" : `${durationLabel(since)} önce çağrıldı`}</> : <><Clock3 size={14} aria-hidden /> Katılım {timeLabel(entry.joinedAt)}</>}</span>
            </div>
            <strong className={l.servingName}>Müşteri · {entry.id.slice(0, 6)}</strong>
            <p className={l.servingService}>{info.service}</p>
            <p className={l.servingStaff}><UserRound size={14} aria-hidden /> {staffName}{info.assigned && info.assigned !== info.requested ? ` · İstenen: ${info.requested}` : ""}</p>
            {entry.status === "called" && <p className={l.servingNote}>{info.calledOverdue ? "Çağrıldı — bekleme süresi aşıldı. Gelmedi kararı operatöre ait." : `Çağrıldı · ${capabilities?.calledGraceMinutes ?? 10} dk bekleme süresi`}</p>}
            {renderActions(entry, info.actions, info.calledOverdue, true)}
          </article>;
        })}</div>}
    </section>

    <section className={l.section} aria-labelledby="queue-title">
      <div className={l.sectionHead}>
        <h2 id="queue-title" className={studio.sectionLabel}>Sıradaki müşteriler</h2>
        <Pill tone="accent">{entries.length} aktif kayıt</Pill>
      </div>
      {waitingEntries.length === 0 ? <EmptyState mood="happy" title="Şu anda sırada bekleyen müşteri yok" description="Yeni katılımlar olduğunda burada görünür." /> :
        <ol className={l.queue}>{waitingEntries.map((entry, index) => {
          const info = entryInfo(entry);
          const waited = minutesSince(entry.joinedAt, clock);
          const estimate = WAITING.includes(entry.status) ? waitEstimates[entry.id] : undefined;
          return <li key={entry.id} className={cx(l.entry, index === 0 && l.entryFirst)}>
            <div className={l.entryMain}>
              <span className={l.pos} aria-label={`Sıra ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
              <div className={l.entryBody}>
                <div className={l.entryTitleRow}>
                  <strong className={l.entryName}>Müşteri · {entry.id.slice(0, 6)}</strong>
                  <Pill tone={STATUS_TONES[entry.status] ?? "neutral"} dot>{STATUS_LABELS[entry.status] ?? entry.status}</Pill>
                </div>
                <p className={l.entryService}>{info.service}</p>
                <p className={l.entryStaff}><UserRound size={14} aria-hidden /> {info.requested}{info.assigned && info.assigned !== info.requested ? ` · Atanan: ${info.assigned}` : ""}</p>
                <div className={l.meta}>
                  <span><Clock3 size={13} aria-hidden /> Katılım {timeLabel(entry.joinedAt)}</span>
                  <span><Timer size={13} aria-hidden /> {durationLabel(waited)} bekliyor</span>
                  {estimate && <span className={l.metaAccent}>{waitEstimateLabel(estimate)}</span>}
                </div>
                {entry.status === "on_the_way" && <span className={cx(l.flag, l.flagInfo)}><ArrowRight size={14} aria-hidden /> Yola çıktı{entry.declaredEtaMinutes ? ` · Yaklaşık geliş: ${entry.declaredEtaMinutes}${entry.declaredEtaMinutes === 20 ? "+" : ""} dk` : ""}</span>}
                {entry.presenceConfirmedAt && WAITING.includes(entry.status) && <span className={cx(l.flag, l.flagOk)}><CheckCircle2 size={14} aria-hidden /> Geliyorum onayı verildi</span>}
              </div>
            </div>
            {renderActions(entry, info.actions, info.calledOverdue)}
          </li>;
        })}</ol>}
    </section>

    <Panel title="Personel ve Randevular" description="Durumlar canlı sıra ve mevcut randevu kayıtlarından türetilir." icon={UsersRound}>
      {staff.length === 0 ? <EmptyState mood="idle" size={72} title="Aktif personel bulunamadı" /> :
        <div className={l.team}>{staff.map((person) => {
          const activeQueue = entries.find((entry) => entry.assignedStaffId === person.id && ["called", "in_service"].includes(entry.status));
          const currentAppointment = activeAppointments.find((item) => item.staffId === person.id && Date.parse(item.startAt) <= now && Date.parse(item.endAt) > now);
          const next = upcoming.find((item) => item.staffId === person.id);
          const status = !person.isActive || person.archivedAt ? "Çalışmıyor" : activeQueue?.status === "in_service" ? "Canlı işlemde" : activeQueue ? "Müşteri çağrıldı" : currentAppointment ? "Randevuda" : next && Date.parse(next.startAt) - now <= 60 * 60_000 ? "Yaklaşan randevu" : "Takvimi kontrol edin";
          const tone: PillTone = status === "Çalışmıyor" ? "neutral" : status === "Canlı işlemde" || status === "Randevuda" ? "ok" : status === "Müşteri çağrıldı" || status === "Yaklaşan randevu" ? "warn" : "info";
          return <div key={person.id} className={l.member}>
            <div className={l.memberHead}>
              <span className={l.memberAvatar}><UserRound size={19} aria-hidden /></span>
              <div className={l.memberText}><strong>{person.fullName}</strong><Pill tone={tone} dot>{status}</Pill></div>
            </div>
            {activeQueue && <p className={l.memberNote}><Activity size={13} aria-hidden /> {serviceById.get(activeQueue.serviceId)?.name ?? "Canlı hizmet"}</p>}
            {next && <p className={l.memberNote}><CalendarClock size={13} aria-hidden /> Sonraki randevu: {timeLabel(next.startAt)} · {next.serviceName ?? serviceById.get(next.serviceId)?.name ?? "Hizmet"}</p>}
          </div>;
        })}</div>}
    </Panel>

    <div id="canli-sira-ayari" className={l.settings}><LiveQueueSettings business={business} onChanged={(liveQueueEnabled) =>
      setBusiness((current) => current ? { ...current, liveQueueEnabled } : current)} /></div>

    <ConfirmSheet open={!!pending} busy={!!pending && busy === pending.entry.id}
      title={pending?.status === "no_show" ? "Müşteri ‘Gelmedi’ olarak işaretlensin mi?" : "Sıra kaydı iptal edilsin mi?"}
      description={pending?.status === "no_show"
        ? "Bu müşteriyi ‘Gelmedi’ olarak işaretlemek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        : "Bu sıra kaydını iptal etmek istediğinizden emin misiniz? Müşteri sıradan çıkarılır."}
      confirmLabel={pending?.status === "no_show" ? "Gelmedi olarak işaretle" : "İptal et"} cancelLabel="Vazgeç"
      onConfirm={() => void confirmPending()} onClose={() => setPending(null)}>
      {pending ? <div className={l.confirmEntry}><b>Müşteri · {pending.entry.id.slice(0, 6)}</b><small>{serviceById.get(pending.entry.serviceId)?.name ?? "Hizmet"}</small></div> : null}
    </ConfirmSheet>
  </StudioPage>;
}
