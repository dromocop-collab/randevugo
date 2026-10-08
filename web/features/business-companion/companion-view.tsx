"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  Clock3,
  EyeOff,
  LayoutDashboard,
  Link2,
  ListChecks,
  LoaderCircle,
  Plus,
  Store,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  arrivalSentence,
  companionLinks,
  enqueueArrivals,
  formatClock,
  formatCountdown,
  formatWhen,
  launcherBadge,
  pendingUpcoming,
  statusLabel,
  summarizeDay,
  type CompanionAppointment,
  type CompanionRole,
} from "@/features/business-companion/companion-domain";
import { setCompanionHidden } from "@/features/business-companion/companion-settings";
import {
  isChimeEnabled,
  isNotificationAudioReady,
  playNotificationChime,
  setChimeEnabled,
  subscribeChimeSetting,
  subscribeNotificationAudioState,
  unlockNotificationAudio,
  installNotificationAudioUnlock,
} from "@/features/push/notification-sound";
import { CompactSoundPicker } from "@/features/push/notification-sound-picker";
import styles from "./business-companion.module.css";

/* ───────────────────────── saat / ses durumları ───────────────────────── */

let clockNow = Date.now();
const clockListeners = new Set<() => void>();
let clockTimer: number | null = null;

function tickClock() {
  clockNow = Date.now();
  clockListeners.forEach((listener) => listener());
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockTimer === null) {
    clockTimer = window.setInterval(tickClock, 20_000);
    document.addEventListener("visibilitychange", tickClock);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size && clockTimer !== null) {
      window.clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", tickClock);
      clockTimer = null;
    }
  };
}

/** 20 sn'de bir güncellenen "şimdi" (geri sayım ve gün değişimi için). */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, () => clockNow, () => clockNow);
}

function useChimeOn() {
  return useSyncExternalStore(subscribeChimeSetting, isChimeEnabled, () => true);
}

function useAudioReady() {
  return useSyncExternalStore(subscribeNotificationAudioState, isNotificationAudioReady, () => false);
}

/* ───────────────────────── yeni randevu kuyruğu ───────────────────────── */

export interface ArrivalQueue {
  queue: CompanionAppointment[];
  announcement: string;
  push: (items: CompanionAppointment[]) => void;
  dismiss: (id: string) => void;
  patch: (id: string, patch: Partial<CompanionAppointment>) => void;
}

/**
 * Yeni randevu geldiğinde: kuyruğa ekle, mevcut panel zilini çal (ses tercihine uyar),
 * ekran okuyucuya duyur ve sekme gizliyse (izin zaten verilmişse) tarayıcı bildirimi göster.
 */
export function useArrivalQueue(options: { businessName: string; shouldNotifyNatively: () => boolean }): ArrivalQueue {
  const [queue, setQueue] = useState<CompanionAppointment[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    installNotificationAudioUnlock();
  }, []);

  const push = useCallback((items: CompanionAppointment[]) => {
    if (!items.length) return;
    setQueue((current) => enqueueArrivals(current, items));
    playNotificationChime();
    const now = Date.now();
    setAnnouncement(items.map((item) => arrivalSentence(item, now)).join(" "));
    const { businessName, shouldNotifyNatively } = optionsRef.current;
    if (!shouldNotifyNatively()) return;
    for (const item of items.slice(0, 3)) {
      try {
        const notification = new Notification(`Yeni randevu · ${businessName}`, {
          body: [item.customerName, item.serviceName, formatWhen(item.startAtMs, now)].filter(Boolean).join(" · "),
          tag: `sr-appointment-${item.id}`,
          icon: "/logo.png",
        });
        notification.onclick = () => {
          window.focus();
          window.location.assign(companionLinks.appointment(item.id));
          notification.close();
        };
      } catch {
        // Bazı mobil tarayıcılar sayfa içinden Notification oluşturmaya izin vermez; kart yine görünür.
      }
    }
  }, []);

  const dismiss = useCallback((id: string) => setQueue((current) => current.filter((item) => item.id !== id)), []);
  const patch = useCallback((id: string, next: Partial<CompanionAppointment>) => {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }, []);

  return { queue, announcement, push, dismiss, patch };
}

/* ───────────────────────── görünüm ───────────────────────── */

export interface CompanionBusiness {
  id: string;
  name: string;
  slug: string;
}

export interface CompanionViewProps {
  businesses: CompanionBusiness[];
  activeBusiness: CompanionBusiness;
  onSwitchBusiness: (id: string) => void;
  role: CompanionRole;
  canConfirm: boolean;
  feed: { ready: boolean; today: CompanionAppointment[]; pending: CompanionAppointment[]; error: string | null };
  arrivals: ArrivalQueue;
  onConfirm: (appointmentId: string) => Promise<void>;
  /** Önizleme: "Yeni randevu simüle et" gibi geliştirici düğmeleri. */
  devTools?: React.ReactNode;
}

const ROLE_LABEL: Record<CompanionRole, string> = { owner: "Sahip", admin: "Yönetici", manager: "Müdür", staff: "Çalışan" };
const FOCUSABLE = 'a[href],button:not([disabled]),select:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

function initialOf(name: string) {
  return (name.trim().charAt(0) || "İ").toLocaleUpperCase("tr-TR");
}

export function CompanionView(props: CompanionViewProps) {
  const { activeBusiness, feed, arrivals, canConfirm, onConfirm, role } = props;
  const now = useNow();
  const chimeOn = useChimeOn();
  const audioReady = useAudioReady();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const summary = summarizeDay(feed.today, now);
  // Bugünkü listede durumu güncel olan randevular, bekleyen listesine de yansır.
  const pending = pendingUpcoming(feed.pending, now);
  const badge = launcherBadge(pending.length, summary.remaining);

  const confirm = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await onConfirm(id);
      arrivals.patch(id, { status: "confirmed" });
      toast.success("Randevu onaylandı");
    } catch {
      toast.error("Randevu onaylanamadı. Panelden tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }, [arrivals, onConfirm]);

  // Mobilde sayfa alt menüsü/Rovi baloncuğu açık sayfanın üstüne binmesin.
  useEffect(() => {
    if (!open) return;
    document.body.dataset.companionOpen = "true";
    return () => {
      delete document.body.dataset.companionOpen;
    };
  }, [open]);

  const enableSound = () => {
    unlockNotificationAudio();
    if (!chimeOn) setChimeEnabled(true);
    playNotificationChime({ force: true });
  };

  const showSoundChip = chimeOn && !audioReady;

  return (
    <div className={styles.root} data-companion="">
      <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{arrivals.announcement}</p>

      {arrivals.queue.length > 0 && !open && (
        <ArrivalCard
          item={arrivals.queue[0]}
          more={arrivals.queue.length - 1}
          now={now}
          canConfirm={canConfirm}
          busy={busyId === arrivals.queue[0].id}
          onConfirm={() => void confirm(arrivals.queue[0].id)}
          onClose={() => arrivals.dismiss(arrivals.queue[0].id)}
          businessName={activeBusiness.name}
        />
      )}

      <div className={styles.dock}>
        {showSoundChip && !open && (
          <button type="button" className={styles.soundChip} onClick={enableSound} title="Tarayıcı sesi engelledi; yeni randevu zili için dokun">
            <Volume2 size={14} aria-hidden="true" /> Sesi aç
          </button>
        )}
        <button
          ref={launcherRef}
          type="button"
          className={styles.launcher}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="business-companion-sheet"
          aria-label={`İşletme paneli kısayolu: ${activeBusiness.name}${pending.length ? `, ${pending.length} onay bekleyen` : ""}${summary.remaining ? `, bugün ${summary.remaining} randevu kaldı` : ""}`}
          data-open={open ? "true" : "false"}
        >
          <span className={styles.launcherIcon} aria-hidden="true"><CalendarCheck2 size={20} /></span>
          <span className={styles.launcherText} aria-hidden="true">
            <b>Panel</b>
            <small>{summary.next ? `${formatClock(summary.next.startAtMs)} · ${summary.next.customerName}` : feed.ready ? `Bugün ${summary.total} randevu` : "Yükleniyor"}</small>
          </span>
          {badge && <span className={styles.badge} data-tone={badge.tone} aria-hidden="true">{badge.value > 99 ? "99+" : badge.value}</span>}
        </button>
      </div>

      {open && (
        <CompanionSheet
          {...props}
          now={now}
          summary={summary}
          pending={pending}
          busyId={busyId}
          chimeOn={chimeOn}
          audioReady={audioReady}
          onEnableSound={enableSound}
          onConfirmItem={(id) => void confirm(id)}
          onClose={() => setOpen(false)}
          returnFocusTo={launcherRef}
          role={role}
        />
      )}
    </div>
  );
}

/* ───────────────────────── yeni randevu kartı ───────────────────────── */

function ArrivalCard({ item, more, now, canConfirm, busy, onConfirm, onClose, businessName }: {
  item: CompanionAppointment;
  more: number;
  now: number;
  canConfirm: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
  businessName: string;
}) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  // Esc kartı kapatır (odak kartın içindeyse önceki öğeye dönmez; kart DOM'dan kalkar, odak gövdeye düşmesin).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const pending = item.status === "pending";
  return (
    <div ref={cardRef} className={styles.arrival} role="alertdialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={`${titleId}-d`} key={item.id}>
      <div className={styles.arrivalHead}>
        <span className={styles.arrivalPulse} aria-hidden="true"><BellRing size={16} /></span>
        <div className={styles.arrivalTitle}>
          <small>{businessName}</small>
          <b id={titleId}>Yeni randevu</b>
        </div>
        {more > 0 && <span className={styles.arrivalMore}>+{more} daha</span>}
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Bildirimi kapat"><X size={16} /></button>
      </div>
      <div className={styles.arrivalBody} id={`${titleId}-d`}>
        <span className={styles.avatar} aria-hidden="true">{initialOf(item.customerName)}</span>
        <div className={styles.arrivalMeta}>
          <b>{item.customerName}</b>
          <span>{item.serviceName || "Hizmet"}{item.staffName ? ` · ${item.staffName}` : ""}</span>
          <span className={styles.arrivalWhen}><Clock3 size={13} aria-hidden="true" /> {formatWhen(item.startAtMs, now)}</span>
        </div>
        <span className={styles.status} data-status={item.status}>{statusLabel(item.status)}</span>
      </div>
      <div className={styles.arrivalActions}>
        {pending && canConfirm && (
          <button type="button" className={styles.primaryBtn} onClick={onConfirm} disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin} size={15} aria-hidden="true" /> : <BadgeCheck size={15} aria-hidden="true" />} Onayla
          </button>
        )}
        <Link href={companionLinks.appointment(item.id)} className={pending && canConfirm ? styles.secondaryBtn : styles.primaryBtn} onClick={onClose}>
          Detay <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <button type="button" className={styles.ghostBtn} onClick={onClose}>Kapat</button>
      </div>
    </div>
  );
}

/* ───────────────────────── mini panel ───────────────────────── */

type SheetProps = CompanionViewProps & {
  now: number;
  summary: ReturnType<typeof summarizeDay>;
  pending: CompanionAppointment[];
  busyId: string | null;
  chimeOn: boolean;
  audioReady: boolean;
  onEnableSound: () => void;
  onConfirmItem: (id: string) => void;
  onClose: () => void;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
};

function CompanionSheet(props: SheetProps) {
  const { businesses, activeBusiness, onSwitchBusiness, role, canConfirm, feed, now, summary, pending, busyId, chimeOn, audioReady, onEnableSound, onConfirmItem, onClose, returnFocusTo, devTools } = props;
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const switchId = useId();
  const managerView = role !== "staff";

  // Odak yönetimi: açılınca kapat düğmesi, Tab tuzağı, Esc kapatır, kapanınca başlatıcıya döner.
  useEffect(() => {
    const sheet = sheetRef.current;
    const returnTarget = returnFocusTo.current;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const focusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((item) => item.getClientRects().length > 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!sheet?.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sheet?.contains(target) || returnTarget?.contains(target)) return;
      // Masaüstünde dışarı tıklayınca kapanır (mobilde arka plan zaten kapatır).
      if (window.matchMedia("(min-width: 640px)").matches) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      const active = document.activeElement;
      if (returnTarget && (!active || active === document.body || sheet?.contains(active))) returnTarget.focus({ preventScroll: true });
    };
  }, [onClose, returnFocusTo]);

  const copyLink = async () => {
    const url = `${window.location.origin}${companionLinks.storefront(activeBusiness.slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Mağaza linki kopyalandı", { description: url });
    } catch {
      toast.error("Link kopyalanamadı", { description: url });
    }
  };

  const hide = () => {
    setCompanionHidden(true);
    toast("İşletme yardımcısı gizlendi", {
      description: "Panel › Ayarlar › Randevu Motoru › Bildirimler'den yeniden açabilirsin.",
      action: { label: "Geri al", onClick: () => setCompanionHidden(false) },
      duration: 8000,
    });
  };

  const next = summary.next;
  const current = summary.current;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} id="business-companion-sheet" className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.grabber} aria-hidden="true" />
        <header className={styles.sheetHead}>
          <span className={styles.bizMark} aria-hidden="true">{initialOf(activeBusiness.name)}</span>
          <div className={styles.sheetTitle}>
            <small>İşletme yardımcısı · {ROLE_LABEL[role]}</small>
            <h2 id={titleId}>{activeBusiness.name}</h2>
          </div>
          <button ref={closeRef} type="button" className={styles.iconBtn} onClick={onClose} aria-label="Paneli kapat"><X size={18} /></button>
        </header>

        <div className={styles.sheetBody}>
          {businesses.length > 1 && (
            <div className={styles.switcher}>
              <label htmlFor={switchId}>İşletme</label>
              <select id={switchId} value={activeBusiness.id} onChange={(event) => onSwitchBusiness(event.target.value)}>
                {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
              </select>
            </div>
          )}

          {chimeOn && !audioReady && (
            <button type="button" className={styles.soundBanner} onClick={onEnableSound}>
              <Volume2 size={16} aria-hidden="true" />
              <span><b>Sesi aç</b><small>Tarayıcı sesi engelledi. Yeni randevu zili için bir kez dokun.</small></span>
            </button>
          )}

          <section className={styles.today} aria-labelledby={`${titleId}-today`}>
            <div className={styles.sectionHead}>
              <h3 id={`${titleId}-today`}>Bugün{role === "staff" ? " · senin randevuların" : ""}</h3>
              <Link href={companionLinks.calendar} className={styles.sectionLink}>Takvim <ChevronRight size={14} aria-hidden="true" /></Link>
            </div>
            {!feed.ready ? (
              <div className={styles.skeleton} aria-busy="true" aria-label="Yükleniyor"><i /><i /><i /></div>
            ) : feed.error ? (
              <p className={styles.empty}>{feed.error}</p>
            ) : (
              <>
                <dl className={styles.stats}>
                  <div><dt>Toplam</dt><dd>{summary.total}</dd></div>
                  <div><dt>Kalan</dt><dd>{summary.remaining}</dd></div>
                  <div data-alert={pending.length > 0 ? "true" : undefined}><dt>Onay bekleyen</dt><dd>{pending.length}</dd></div>
                </dl>
                {current && (
                  <p className={styles.nowLine}><span className={styles.liveDot} aria-hidden="true" /> Şu an: <b>{current.customerName}</b> · {current.serviceName || "Hizmet"}</p>
                )}
                {next ? (
                  <Link href={companionLinks.appointment(next.id)} className={styles.nextCard}>
                    <span className={styles.nextCountdown}><small>Sıradaki</small><b>{formatCountdown(next.startAtMs - now)}</b><small>sonra</small></span>
                    <span className={styles.nextMeta}>
                      <b>{next.customerName}</b>
                      <span>{formatClock(next.startAtMs)} · {next.serviceName || "Hizmet"}{next.staffName ? ` · ${next.staffName}` : ""}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <p className={styles.empty}>{summary.total ? "Bugün için sıradaki randevu yok." : "Bugün henüz randevu yok."}</p>
                )}
                {summary.upcoming.length > 1 && (
                  <ol className={styles.list} aria-label="Sonraki randevular">
                    {summary.upcoming.slice(1).map((item) => (
                      <li key={item.id}>
                        <Link href={companionLinks.appointment(item.id)} className={styles.row}>
                          <time>{formatClock(item.startAtMs)}</time>
                          <span><b>{item.customerName}</b><small>{item.serviceName || "Hizmet"}{item.staffName ? ` · ${item.staffName}` : ""}</small></span>
                          <span className={styles.status} data-status={item.status}>{statusLabel(item.status)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </section>

          {pending.length > 0 && (
            <section className={styles.pending} aria-labelledby={`${titleId}-pending`}>
              <div className={styles.sectionHead}>
                <h3 id={`${titleId}-pending`}>Onay bekleyenler <span className={styles.count}>{pending.length}</span></h3>
                <Link href={companionLinks.pending} className={styles.sectionLink}>Tümü <ChevronRight size={14} aria-hidden="true" /></Link>
              </div>
              <ul className={styles.list}>
                {pending.slice(0, 5).map((item) => (
                  <li key={item.id} className={styles.pendingRow}>
                    <Link href={companionLinks.appointment(item.id)} className={styles.pendingInfo}>
                      <b>{item.customerName}</b>
                      <small>{formatWhen(item.startAtMs, now)} · {item.serviceName || "Hizmet"}</small>
                    </Link>
                    {canConfirm ? (
                      <button type="button" className={styles.confirmBtn} onClick={() => onConfirmItem(item.id)} disabled={busyId === item.id} aria-label={`${item.customerName} randevusunu onayla`}>
                        {busyId === item.id ? <LoaderCircle className={styles.spin} size={14} aria-hidden="true" /> : <BadgeCheck size={14} aria-hidden="true" />} Onayla
                      </button>
                    ) : (
                      <span className={styles.status} data-status="pending">Bekliyor</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav className={styles.quick} aria-label="Hızlı erişim">
            <Link href={companionLinks.calendar}><CalendarDays size={18} aria-hidden="true" /> Takvim</Link>
            <Link href={companionLinks.appointments}><ListChecks size={18} aria-hidden="true" /> Randevular</Link>
            {managerView && <Link href={companionLinks.newAppointment}><Plus size={18} aria-hidden="true" /> Yeni randevu</Link>}
            <Link href={companionLinks.storefront(activeBusiness.slug)}><Store size={18} aria-hidden="true" /> Mağazamı gör</Link>
            <button type="button" onClick={() => void copyLink()}><Link2 size={18} aria-hidden="true" /> Linki kopyala</button>
            <Link href={companionLinks.dashboard}><LayoutDashboard size={18} aria-hidden="true" /> Panele git</Link>
          </nav>

          <div className={styles.settings}>
            <label className={styles.toggle}>
              <span>{chimeOn ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />} Yeni randevu sesi</span>
              <input
                type="checkbox"
                role="switch"
                checked={chimeOn}
                onChange={(event) => {
                  setChimeEnabled(event.target.checked);
                  if (event.target.checked) {
                    unlockNotificationAudio();
                    playNotificationChime({ force: true });
                  }
                }}
              />
            </label>
            <CompactSoundPicker />
            <button type="button" className={styles.hideBtn} onClick={hide}><EyeOff size={15} aria-hidden="true" /> Bu sayfalarda gösterme</button>
          </div>
          {devTools}
        </div>
      </div>
    </>
  );
}
