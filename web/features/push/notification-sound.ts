"use client";

// Randevu bildirim sesi merkezi: Web Audio ile sentezlenen hazır sesler (dosya gerekmez).
// Tarayıcı otomatik oynatma kuralları nedeniyle AudioContext ilk kullanıcı etkileşiminde açılır.
// Tercih (ses, seviye, sessiz) cihazda anında okunmak için localStorage'da tutulur;
// hesapla eşitleme notification-sound-sync.ts → users/{uid}/preferences/notificationSound.

import {
  DEFAULT_SOUND_PREFERENCE,
  getSoundPreset,
  parseSoundPreference,
  presetDuration,
  type SoundPreference,
  type SoundPreset,
} from "@/features/push/notification-sound-presets";

/** Eski açık/kapalı anahtarı ("off" = sessiz) — geriye uyumlu olarak "muted" alanının kaynağı. */
const SOUND_KEY = "sr.push.sound";
/** { soundId, volume, updatedAtMs } */
const PREF_KEY = "sr.push.soundPref";

const listeners = new Set<() => void>();
const localChangeListeners = new Set<(preference: SoundPreference) => void>();
const audioStateListeners = new Set<() => void>();

type AudioContextCtor = typeof AudioContext;
let context: AudioContext | null = null;
let unlockInstalled = false;

function audioCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/* ───────────── Tercih deposu ───────────── */

let cachedRaw: string | null | undefined;
let cachedMuted: string | null | undefined;
let cachedPreference: SoundPreference = DEFAULT_SOUND_PREFERENCE;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Geçerli ses tercihi (useSyncExternalStore için kararlı nesne döner). */
export function getSoundPreference(): SoundPreference {
  if (typeof window === "undefined") return DEFAULT_SOUND_PREFERENCE;
  const raw = readStorage(PREF_KEY);
  const muted = readStorage(SOUND_KEY);
  if (raw === cachedRaw && muted === cachedMuted) return cachedPreference;
  cachedRaw = raw;
  cachedMuted = muted;
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  cachedPreference = { ...parseSoundPreference(parsed), muted: muted === "off" };
  return cachedPreference;
}

/** Yerel kaydın zamanı (uzak tercihle hangisinin yeni olduğuna karar vermek için). */
export function getLocalSoundPreferenceUpdatedAt(): number {
  try {
    const raw = readStorage(PREF_KEY);
    const value = raw ? (JSON.parse(raw) as { updatedAtMs?: unknown }).updatedAtMs : 0;
    return typeof value === "number" ? value : 0;
  } catch {
    return 0;
  }
}

function writePreference(preference: SoundPreference, updatedAtMs: number) {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify({ soundId: preference.soundId, volume: preference.volume, updatedAtMs }));
    if (preference.muted) window.localStorage.setItem(SOUND_KEY, "off");
    else window.localStorage.removeItem(SOUND_KEY);
  } catch {
    // Depolama kapalıysa ayar yalnızca bu sayfa için geçerli olur.
    cachedRaw = undefined;
    cachedPreference = preference;
  }
  listeners.forEach((listener) => listener());
}

/**
 * Tercihi günceller. source "local" → kullanıcı değiştirdi (hesaba eşitlenir);
 * "remote" → hesaptan gelen değer uygulanıyor (geri yazılmaz).
 */
export function setSoundPreference(patch: Partial<SoundPreference>, options: { source?: "local" | "remote"; updatedAtMs?: number } = {}) {
  const next = parseSoundPreference({ ...getSoundPreference(), ...patch });
  writePreference(next, options.updatedAtMs ?? Date.now());
  if ((options.source ?? "local") === "local") localChangeListeners.forEach((listener) => listener(next));
}

/** Yalnızca kullanıcı kaynaklı değişiklikler (hesaba eşitleme için). */
export function onLocalSoundPreferenceChange(listener: (preference: SoundPreference) => void) {
  localChangeListeners.add(listener);
  return () => {
    localChangeListeners.delete(listener);
  };
}

/** "Bildirim sesi" açık mı? (cihaz başına, varsayılan açık; eski API.) */
export function isChimeEnabled(): boolean {
  return !getSoundPreference().muted;
}

export function setChimeEnabled(enabled: boolean) {
  setSoundPreference({ muted: !enabled });
}

/** useSyncExternalStore için abonelik (ses tercihi ve açık/kapalı). */
export function subscribeChimeSetting(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_KEY || event.key === PREF_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
export const subscribeSoundPreference = subscribeChimeSetting;

/* ───────────── Ses bağlamı ───────────── */

function notifyAudioState() {
  audioStateListeners.forEach((listener) => listener());
}

/** Ses çalabilir durumda mı? (AudioContext açık ve tarayıcı otomatik oynatmayı engellemiyor.) */
export function isNotificationAudioReady(): boolean {
  return context?.state === "running";
}

/** Ses bağlamı açıldığında/askıya alındığında haber verir (useSyncExternalStore uyumlu). */
export function subscribeNotificationAudioState(listener: () => void) {
  audioStateListeners.add(listener);
  return () => {
    audioStateListeners.delete(listener);
  };
}

/** Kullanıcı hareketi içinde çağrılmalı: AudioContext'i oluşturur/devam ettirir. */
export function unlockNotificationAudio() {
  const Ctor = audioCtor();
  if (!Ctor) return;
  try {
    if (!context) {
      context = new Ctor();
      context.addEventListener("statechange", notifyAudioState);
    }
    if (context.state === "suspended") void context.resume().then(notifyAudioState).catch(() => undefined);
    notifyAudioState();
  } catch {
    context = null;
  }
}

/** İlk pointerdown/keydown'da sesi bir kez açar. Birden çok çağrı güvenlidir. */
export function installNotificationAudioUnlock() {
  if (unlockInstalled || typeof window === "undefined") return;
  unlockInstalled = true;
  const unlock = () => {
    unlockNotificationAudio();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

/* ───────────── Sentez ───────────── */

/** Önceki sürümdeki ana seviye; "Varsayılan" ses %100'de birebir aynı yükseklikte çalar. */
const MASTER_LEVEL = 0.18;

function render(ctx: AudioContext, preset: SoundPreset, volume: number) {
  const start = ctx.currentTime + 0.02;
  const master = ctx.createGain();
  master.gain.value = MASTER_LEVEL * preset.gain * volume;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = preset.lowpass;
  // Üst üste binen notalarda kırpılmayı önler (normal seviyede devreye girmez).
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  master.connect(filter);
  filter.connect(limiter);
  limiter.connect(ctx.destination);

  for (const note of preset.notes) {
    const at = start + note.start;
    const attack = note.attack ?? 0.008;
    const end = at + attack + note.decay;
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, at);
    noteGain.gain.exponentialRampToValueAtTime(note.peak, at + attack);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, end);
    noteGain.connect(master);
    for (const layer of preset.partials) {
      const osc = ctx.createOscillator();
      const blend = ctx.createGain();
      osc.type = layer.wave;
      osc.frequency.setValueAtTime(note.freq * layer.ratio, at);
      if (note.glide) osc.frequency.exponentialRampToValueAtTime(note.glide * layer.ratio, at + attack + note.decay * 0.6);
      blend.gain.value = layer.level;
      osc.connect(blend);
      blend.connect(noteGain);
      osc.start(at);
      osc.stop(end + 0.05);
    }
  }
  window.setTimeout(() => {
    master.disconnect();
    filter.disconnect();
    limiter.disconnect();
  }, (presetDuration(preset) + 0.4) * 1000);
}

function playPreset(preset: SoundPreset, volume: number) {
  if (volume <= 0) return;
  if (!context) unlockNotificationAudio();
  const ctx = context;
  if (!ctx) return;
  const play = () => {
    try {
      render(ctx, preset, volume);
    } catch {
      // Ses çalınamazsa bildirim yine görsel olarak görünür.
    }
  };
  if (ctx.state === "suspended") ctx.resume().then(play).catch(() => undefined);
  else play();
}

let lastChimeAt = 0;

/**
 * Seçili randevu sesini çalar. force=false iken ses kapalıysa sessiz kalır.
 * AudioContext henüz açılmadıysa (kullanıcı etkileşimi yok) sessizce hiçbir şey yapmaz.
 */
export function playNotificationChime({ force = false }: { force?: boolean } = {}) {
  const preference = getSoundPreference();
  if (!force && preference.muted) return;
  // Aynı olay iki kaynaktan (push + canlı dinleyici) gelirse zil üst üste çalmaz.
  const nowMs = Date.now();
  if (!force && nowMs - lastChimeAt < 1500) return;
  lastChimeAt = nowMs;
  playPreset(getSoundPreset(preference.soundId), preference.volume);
}

/** Ayar ekranında önizleme (kullanıcı tıklamasıyla). Sessiz ayarını yok sayar. */
export function previewNotificationSound(soundId: string, volume?: number) {
  unlockNotificationAudio();
  playPreset(getSoundPreset(soundId), volume ?? getSoundPreference().volume);
}
