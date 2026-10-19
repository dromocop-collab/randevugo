"use client";

import { useId, useSyncExternalStore } from "react";
import { Check, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import {
  getSoundPreference,
  previewNotificationSound,
  setSoundPreference,
  subscribeSoundPreference,
} from "@/features/push/notification-sound";
import { DEFAULT_SOUND_PREFERENCE, SOUND_PRESETS, getSoundPreset, type SoundPreference } from "@/features/push/notification-sound-presets";
import { useT } from "@/i18n/client";
import styles from "./notification-sound-picker.module.css";

/** Seçili randevu sesi tercihi (cihazda anında; hesapla eşitleme useNotificationSoundSync ile). */
export function useSoundPreference(): SoundPreference {
  return useSyncExternalStore(subscribeSoundPreference, getSoundPreference, () => DEFAULT_SOUND_PREFERENCE);
}

/** Ses seviyesi kaydırıcısı (0–100). Bırakınca seçili sesi o seviyede çalar. */
export function SoundVolumeSlider({ preference, compact = false }: { preference: SoundPreference; compact?: boolean }) {
  const t = useT();
  const id = useId();
  const percent = Math.round(preference.volume * 100);
  const Icon = preference.volume === 0 ? VolumeX : preference.volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className={compact ? `${styles.volume} ${styles.volumeCompact}` : styles.volume}>
      <label htmlFor={id}><Icon size={16} aria-hidden="true" /> <span>{t("Ses seviyesi")}</span></label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={preference.muted}
        aria-valuetext={`%${percent}`}
        onChange={(event) => setSoundPreference({ volume: Number(event.target.value) / 100 })}
        onPointerUp={(event) => previewNotificationSound(preference.soundId, Number((event.target as HTMLInputElement).value) / 100)}
        onKeyUp={(event) => {
          if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") previewNotificationSound(preference.soundId, Number((event.target as HTMLInputElement).value) / 100);
        }}
        style={{ "--fill": `${percent}%` } as React.CSSProperties}
      />
      <output htmlFor={id}>%{percent}</output>
    </div>
  );
}

/**
 * 20+1 randevu sesi ızgarası: her kartta ▶ önizleme, seçili durum. Seçmek sesi de çalar.
 * Ayarlar sayfasında (tam) kullanılır; site yardımcısında CompactSoundPicker.
 */
export function NotificationSoundGrid({ preference }: { preference: SoundPreference }) {
  const t = useT();
  const labelId = useId();
  return (
    <div className={styles.grid} role="radiogroup" aria-labelledby={labelId} data-muted={preference.muted ? "true" : undefined}>
      <span id={labelId} className={styles.srOnly}>{t("Randevu bildirim sesi")}</span>
      {SOUND_PRESETS.map((preset, index) => {
        const selected = preset.id === preference.soundId;
        return (
          <div key={preset.id} className={styles.tile} data-selected={selected ? "true" : undefined}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              className={styles.tileSelect}
              onClick={() => {
                setSoundPreference({ soundId: preset.id });
                previewNotificationSound(preset.id);
              }}
            >
              <span className={styles.tileIndex} aria-hidden="true">{selected ? <Check size={14} /> : index + 1}</span>
              <span className={styles.tileText}><b>{t(preset.name)}</b><small>{t(preset.description)}</small></span>
            </button>
            <button type="button" className={styles.play} onClick={() => previewNotificationSound(preset.id)} aria-label={t("{name} sesini dinle", { name: t(preset.name) })} title={t("Dinle")}>
              <Play size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Sitedeki işletme yardımcısı için küçük seçici: açılır liste + ▶ + seviye. */
export function CompactSoundPicker() {
  const t = useT();
  const preference = useSoundPreference();
  const id = useId();
  const preset = getSoundPreset(preference.soundId);
  return (
    <div className={styles.compact}>
      <div className={styles.compactRow}>
        <label htmlFor={id} className={styles.compactLabel}>{t("Randevu sesi")}</label>
        <select
          id={id}
          value={preset.id}
          disabled={preference.muted}
          onChange={(event) => {
            setSoundPreference({ soundId: event.target.value });
            previewNotificationSound(event.target.value);
          }}
        >
          {SOUND_PRESETS.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}
        </select>
        <button type="button" className={styles.play} onClick={() => previewNotificationSound(preset.id)} aria-label={t("{name} sesini dinle", { name: t(preset.name) })} disabled={preference.muted}>
          <Play size={14} aria-hidden="true" />
        </button>
      </div>
      <SoundVolumeSlider preference={preference} compact />
    </div>
  );
}
