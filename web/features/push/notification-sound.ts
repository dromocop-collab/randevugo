"use client";

// Ön plandaki bildirimler için Web Audio ile sentezlenen kısa, yumuşak bir zil (dosya gerekmez).
// Tarayıcı otomatik oynatma kuralları nedeniyle AudioContext ilk kullanıcı etkileşiminde açılır.

const SOUND_KEY = "sr.push.sound";
const listeners = new Set<() => void>();

type AudioContextCtor = typeof AudioContext;
let context: AudioContext | null = null;
let unlockInstalled = false;

function audioCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/** "Bildirim sesi" ayarı (cihaz başına, varsayılan açık). */
export function isChimeEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setChimeEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.removeItem(SOUND_KEY);
    else window.localStorage.setItem(SOUND_KEY, "off");
  } catch {
    // Depolama kapalıysa ayar yalnızca bu sayfa için geçerli olur.
  }
  listeners.forEach((listener) => listener());
}

/** useSyncExternalStore için abonelik. */
export function subscribeChimeSetting(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Kullanıcı hareketi içinde çağrılmalı: AudioContext'i oluşturur/devam ettirir. */
export function unlockNotificationAudio() {
  const Ctor = audioCtor();
  if (!Ctor) return;
  try {
    if (!context) context = new Ctor();
    if (context.state === "suspended") void context.resume().catch(() => undefined);
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

// E6 → G#6 → B6: yumuşak, yükselen üç nota.
const NOTES = [1318.51, 1661.22, 1975.53];
const NOTE_GAP = 0.085;
const DECAY = 0.6;
const VOLUME = 0.18;

/**
 * Kısa bildirim zili çalar. force=false iken "Bildirim sesi" kapalıysa sessiz kalır.
 * AudioContext henüz açılmadıysa (kullanıcı etkileşimi yok) sessizce hiçbir şey yapmaz.
 */
export function playNotificationChime({ force = false }: { force?: boolean } = {}) {
  if (!force && !isChimeEnabled()) return;
  if (!context) unlockNotificationAudio();
  const ctx = context;
  if (!ctx) return;
  const play = () => {
    try {
      const start = ctx.currentTime + 0.02;
      const master = ctx.createGain();
      master.gain.value = VOLUME;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 5200;
      master.connect(filter);
      filter.connect(ctx.destination);

      NOTES.forEach((frequency, index) => {
        const at = start + index * NOTE_GAP;
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, at);
        noteGain.gain.exponentialRampToValueAtTime(index === NOTES.length - 1 ? 0.9 : 0.7, at + 0.008);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, at + DECAY);
        noteGain.connect(master);

        // Sinüs gövde + hafif üçgen parlaklık.
        for (const [type, level] of [["sine", 1], ["triangle", 0.18]] as const) {
          const osc = ctx.createOscillator();
          const blend = ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(frequency, at);
          blend.gain.value = level;
          osc.connect(blend);
          blend.connect(noteGain);
          osc.start(at);
          osc.stop(at + DECAY + 0.05);
        }
      });
      window.setTimeout(() => {
        master.disconnect();
        filter.disconnect();
      }, (NOTE_GAP * NOTES.length + DECAY + 0.3) * 1000);
    } catch {
      // Ses çalınamazsa bildirim yine toast olarak görünür.
    }
  };
  if (ctx.state === "suspended") ctx.resume().then(play).catch(() => undefined);
  else play();
}
