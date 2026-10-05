"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing, LoaderCircle, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushRegistration, type PushStatus } from "@/features/push/use-push-registration";
import styles from "./push-toggle-card.module.css";
import {
  isChimeEnabled,
  playNotificationChime,
  setChimeEnabled,
  subscribeChimeSetting,
  unlockNotificationAudio,
} from "@/features/push/notification-sound";

function useChimeEnabled() {
  return useSyncExternalStore(subscribeChimeSetting, isChimeEnabled, () => true);
}

export type PushAudience = "customer" | "business";

const COPY: Record<PushAudience, { title: string; description: string; onNote: string }> = {
  customer: {
    title: "Tarayıcı bildirimleri",
    description: "Randevu onayı, iptal, saat değişikliği ve 1 saat önce hatırlatmaları bu tarayıcıda anında alın.",
    onNote: "Randevu güncellemeleri bu tarayıcıya bildirim olarak gelecek.",
  },
  business: {
    title: "Panel bildirimleri",
    description: "Yeni randevu, müşteri iptali, saat değişikliği ve yaklaşan randevu hatırlatmalarını bu tarayıcıda anında görün.",
    onNote: "Yeni randevu ve değişiklikler bu tarayıcıya bildirim olarak gelecek.",
  },
};

const STATUS_LABEL: Record<PushStatus, string> = {
  loading: "Kontrol ediliyor",
  unsupported: "Desteklenmiyor",
  blocked: "Engellendi",
  off: "Kapalı",
  on: "Açık",
};

function StatusIcon({ status }: { status: PushStatus }) {
  if (status === "loading") return <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />;
  if (status === "on") return <BellRing size={18} aria-hidden="true" />;
  if (status === "blocked") return <ShieldAlert size={18} aria-hidden="true" />;
  if (status === "unsupported") return <BellOff size={18} aria-hidden="true" />;
  return <Bell size={18} aria-hidden="true" />;
}

function statusNote(status: PushStatus, audience: PushAudience, signedIn: boolean) {
  if (status === "unsupported") {
    return "Bu tarayıcı web bildirimlerini desteklemiyor. iPhone'da bildirimler için Senin Randevun uygulamasını kullanabilir veya siteyi Ana Ekran'a ekleyebilirsiniz.";
  }
  if (status === "blocked") {
    return "Bildirim izni tarayıcıda engellenmiş. Adres çubuğundaki site ayarlarından bildirimlere izin verip sayfayı yenileyin.";
  }
  if (status === "on") return COPY[audience].onNote;
  if (!signedIn) return "Bildirimleri açmak için giriş yapmalısınız.";
  if (status === "loading") return "Bildirim durumu kontrol ediliyor…";
  return "Bildirimler bu tarayıcıda kapalı. Açtığınızda tarayıcı izin isteyecek.";
}

/**
 * Web push aç/kapat kartı. Müşteri hesabında audience="customer", işletme panelinde audience="business".
 * appearance="account": müşteri hesabındaki iOS tarzı gruplu ayar listesi görünümü (yalnız görsel).
 */
export function PushToggleCard({ audience, className, appearance = "card" }: { audience: PushAudience; className?: string; appearance?: "card" | "account" }) {
  const { status, busy, signedIn, enable, disable } = usePushRegistration();
  const copy = COPY[audience];
  const soundOn = useChimeEnabled();
  const showSound = status === "on" || status === "off";

  if (appearance === "account") {
    const toggleable = status === "on" || status === "off";
    const checked = status === "on";
    return (
      <div className={`${styles.list} ${className ?? ""}`}>
        <div className={styles.row}>
          <span className={`${styles.icon} ${checked ? styles.iconOn : status === "blocked" ? styles.iconWarn : ""}`}>
            <StatusIcon status={status} />
          </span>
          <span className={styles.text} aria-live="polite">
            <b>{copy.title}</b>
            <small>{status === "off" ? copy.description : statusNote(status, audience, signedIn)}</small>
          </span>
          {toggleable ? (
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              aria-label={checked ? "Bildirimleri kapat" : "Bildirimleri aç"}
              className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
              disabled={busy || (!checked && !signedIn)}
              onClick={() => void (checked ? disable() : enable())}
            >
              {busy && <LoaderCircle className={`animate-spin ${styles.switchSpin}`} size={13} aria-hidden="true" />}
            </button>
          ) : (
            <span className={styles.badge}>{STATUS_LABEL[status]}</span>
          )}
        </div>
        {showSound && (
          <div className={styles.row}>
            <span className={`${styles.icon} ${soundOn ? styles.iconSound : ""}`}>
              {soundOn ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            </span>
            <span className={styles.text}>
              <b>Bildirim sesi</b>
              <small>Sayfa açıkken gelen bildirimlerde kısa bir zil çalar (bu cihaz için).</small>
              <button type="button" className={styles.try} onClick={() => {
                unlockNotificationAudio();
                playNotificationChime({ force: true });
              }}>Sesi dene</button>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              aria-label="Bildirim sesi"
              className={`${styles.switch} ${soundOn ? styles.switchOn : ""}`}
              onClick={() => {
                unlockNotificationAudio();
                setChimeEnabled(!soundOn);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card title={copy.title} description={copy.description} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] ${
              status === "on" ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--text-3)]"
            }`}
          >
            <StatusIcon status={status} />
          </span>
          <div className="min-w-0" aria-live="polite">
            <strong className="text-sm text-[var(--text-1)]">{STATUS_LABEL[status]}</strong>
            <p className="mt-1 text-xs text-[var(--text-3)]">{statusNote(status, audience, signedIn)}</p>
          </div>
        </div>
        {status === "on" ? (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void disable()}>
            {busy ? <LoaderCircle className="animate-spin" size={14} aria-hidden="true" /> : <BellOff size={14} aria-hidden="true" />}
            Kapat
          </Button>
        ) : status === "off" ? (
          <Button type="button" size="sm" disabled={busy || !signedIn} onClick={() => void enable()}>
            {busy ? <LoaderCircle className="animate-spin" size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
            Bildirimleri aç
          </Button>
        ) : null}
      </div>
      {showSound && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <label className="settings-switch-row">
            <input type="checkbox" checked={soundOn} onChange={(event) => {
              unlockNotificationAudio();
              setChimeEnabled(event.target.checked);
            }} />
            <i /><span><b>Bildirim sesi</b><small>Sayfa açıkken gelen bildirimlerde kısa bir zil çalar (bu cihaz için).</small></span>
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => {
            unlockNotificationAudio();
            playNotificationChime({ force: true });
          }}>
            {soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
            Sesi dene
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Görünmez yardımcı: izin zaten verilmişse jetonu sessizce yeniler ve sayfa açıkken gelen
 * bildirimleri toast olarak gösterir. Asla izin istemez.
 */
export function PushAutoRefresh() {
  usePushRegistration();
  return null;
}
