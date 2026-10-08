/**
 * Randevu bildirim sesleri — Web Audio ile sentezlenen hazır ayarlar (dosya yok, çevrimdışı çalışır).
 * Saf modül: React/Firebase/DOM bağımlılığı yok; birim testi notification-sound-presets.test.mjs.
 *
 * Her ses kısa notalardan oluşur. Her nota, `partials` (kısmi ton) listesindeki osilatörlerle çalınır;
 * zarf: `attack` sürede tepeye çıkış, `decay` sürede üstel sönüm. `glide` verilirse frekans o değere kayar.
 * `gain` sesler arası algılanan yüksekliği eşitler (tepe kırpılmasına karşı zincirde ayrıca kompresör var).
 */

export type Wave = "sine" | "triangle" | "square" | "sawtooth";

export interface ToneNote {
  /** Hz */
  freq: number;
  /** Sesin başlangıcına göre saniye. */
  start: number;
  /** Tepe noktasından sessizliğe kadar saniye. */
  decay: number;
  /** 0–1 göreli tepe. */
  peak: number;
  /** Saniye (varsayılan 0.008). */
  attack?: number;
  /** Nota boyunca kayılacak hedef frekans (Hz). */
  glide?: number;
}

export interface ToneLayer {
  wave: Wave;
  /** Temel frekansın katı (1 = temel). */
  ratio: number;
  level: number;
}

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  notes: ToneNote[];
  partials: ToneLayer[];
  /** Alçak geçiren süzgeç kesimi (Hz). */
  lowpass: number;
  /** Yükseklik eşitleme çarpanı (0–2). */
  gain: number;
}

export const DEFAULT_SOUND_ID = "varsayilan";
export const MAX_SOUND_SECONDS = 1.5;

const SOFT: ToneLayer[] = [{ wave: "sine", ratio: 1, level: 1 }, { wave: "triangle", ratio: 1, level: 0.18 }];
const PURE: ToneLayer[] = [{ wave: "sine", ratio: 1, level: 1 }];
const BELL: ToneLayer[] = [{ wave: "sine", ratio: 1, level: 1 }, { wave: "sine", ratio: 2.76, level: 0.32 }, { wave: "sine", ratio: 5.4, level: 0.12 }];

// Nota frekansları
const N = {
  G3: 196, A3: 220, C4: 261.63, G4: 392, A4: 440, B4: 493.88, C5: 523.25, Cs5: 554.37, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, Gs6: 1661.22, G6: 1567.98,
  A6: 1760, B6: 1975.53, C7: 2093, E7: 2637.02, G7: 3135.96, B7: 3951.07, C8: 4186.01,
};

/** Sıralı notalar: aynı süre/tepe ile `gap` aralıkla. */
function seq(freqs: number[], gap: number, decay: number, peak = 0.75, extra: { attack?: number } = {}): ToneNote[] {
  return freqs.map((freq, index) => ({ freq, start: Number((index * gap).toFixed(3)), decay, peak, ...extra }));
}

export const SOUND_PRESETS: readonly SoundPreset[] = [
  {
    // Mevcut panel zili (E6 → G#6 → B6) — birebir aynı.
    id: DEFAULT_SOUND_ID, name: "Varsayılan", description: "Yumuşak, yükselen üç nota",
    notes: [
      { freq: N.E6, start: 0, decay: 0.6, peak: 0.7 },
      { freq: N.Gs6, start: 0.085, decay: 0.6, peak: 0.7 },
      { freq: N.B6, start: 0.17, decay: 0.6, peak: 0.9 },
    ],
    partials: SOFT, lowpass: 5200, gain: 1,
  },
  {
    id: "klasik-zil", name: "Klasik Zil", description: "İki vuruşlu masa zili",
    notes: [{ freq: N.A5, start: 0, decay: 0.55, peak: 0.85, attack: 0.003 }, { freq: N.A5, start: 0.24, decay: 0.7, peak: 0.85, attack: 0.003 }],
    partials: BELL, lowpass: 7000, gain: 0.85,
  },
  {
    id: "kristal", name: "Kristal", description: "Parlak, hızlı kristal tını",
    notes: seq([N.C7, N.E7, N.G7, N.C8], 0.06, 0.45, 0.6),
    partials: PURE, lowpass: 9000, gain: 0.8,
  },
  {
    id: "marimba", name: "Marimba", description: "Sıcak ahşap tonlar",
    notes: seq([N.C5, N.E5, N.G5], 0.11, 0.32, 0.9, { attack: 0.003 }),
    partials: [{ wave: "sine", ratio: 1, level: 1 }, { wave: "sine", ratio: 4, level: 0.22 }], lowpass: 4500, gain: 1.25,
  },
  {
    id: "can", name: "Çan", description: "Uzun yankılı tek çan",
    notes: [{ freq: N.D5, start: 0, decay: 1.3, peak: 0.9, attack: 0.004 }],
    partials: [{ wave: "sine", ratio: 1, level: 1 }, { wave: "sine", ratio: 2, level: 0.45 }, { wave: "sine", ratio: 3, level: 0.25 }, { wave: "sine", ratio: 4.2, level: 0.15 }],
    lowpass: 6000, gain: 0.9,
  },
  {
    id: "damla", name: "Damla", description: "İki yumuşak damla",
    notes: [{ freq: 1200, glide: 1800, start: 0, decay: 0.16, peak: 0.85, attack: 0.004 }, { freq: 1500, glide: 2300, start: 0.18, decay: 0.18, peak: 0.85, attack: 0.004 }],
    partials: PURE, lowpass: 6000, gain: 1.15,
  },
  {
    id: "tik-tik", name: "Tık Tık", description: "Kısa ve net iki tık",
    notes: [{ freq: 1900, start: 0, decay: 0.05, peak: 0.8, attack: 0.001 }, { freq: 2300, start: 0.12, decay: 0.06, peak: 0.8, attack: 0.001 }],
    partials: [{ wave: "triangle", ratio: 1, level: 1 }, { wave: "sine", ratio: 0.5, level: 0.4 }], lowpass: 4000, gain: 1.3,
  },
  {
    id: "kus-civiltisi", name: "Kuş Cıvıltısı", description: "Üç neşeli cıvıltı",
    notes: [
      { freq: 2500, glide: 3700, start: 0, decay: 0.09, peak: 0.6, attack: 0.005 },
      { freq: 2700, glide: 3900, start: 0.12, decay: 0.09, peak: 0.6, attack: 0.005 },
      { freq: 2400, glide: 3400, start: 0.27, decay: 0.12, peak: 0.6, attack: 0.005 },
    ],
    partials: PURE, lowpass: 8000, gain: 0.9,
  },
  {
    id: "yumusak-gong", name: "Yumuşak Gong", description: "Derin ve sakin gong",
    notes: [{ freq: N.A3, start: 0, decay: 1.4, peak: 0.95, attack: 0.02 }],
    partials: [{ wave: "sine", ratio: 1, level: 1 }, { wave: "sine", ratio: 2, level: 0.3 }, { wave: "sine", ratio: 2.98, level: 0.2 }],
    lowpass: 3000, gain: 1.5,
  },
  {
    id: "arp", name: "Arp", description: "Yükselen arp akoru",
    notes: seq([N.C5, N.E5, N.G5, N.C6, N.E6], 0.07, 0.5, 0.65, { attack: 0.004 }),
    partials: [{ wave: "triangle", ratio: 1, level: 1 }, { wave: "sine", ratio: 2, level: 0.15 }], lowpass: 5000, gain: 1,
  },
  {
    id: "piyano-akoru", name: "Piyano Akoru", description: "Dolgun majör akor",
    notes: seq([N.C5, N.E5, N.G5], 0.015, 1.0, 0.6, { attack: 0.004 }),
    partials: [{ wave: "sine", ratio: 1, level: 1 }, { wave: "triangle", ratio: 2, level: 0.2 }, { wave: "sine", ratio: 3, level: 0.08 }],
    lowpass: 4200, gain: 1.05,
  },
  {
    id: "ksilofon", name: "Ksilofon", description: "Tıkırtılı üç nota",
    notes: seq([N.G5, N.C6, N.E6], 0.1, 0.25, 0.85, { attack: 0.002 }),
    partials: [{ wave: "sine", ratio: 1, level: 1 }, { wave: "sine", ratio: 3, level: 0.3 }], lowpass: 7000, gain: 1.1,
  },
  {
    id: "retro-bip", name: "Retro Bip", description: "8-bit oyun bipleri",
    notes: [{ freq: N.A5, start: 0, decay: 0.1, peak: 0.55, attack: 0.002 }, { freq: N.E6, start: 0.12, decay: 0.14, peak: 0.55, attack: 0.002 }],
    partials: [{ wave: "square", ratio: 1, level: 1 }], lowpass: 3500, gain: 0.7,
  },
  {
    id: "kapi-zili", name: "Kapı Zili", description: "Klasik iki tonlu kapı zili",
    notes: [{ freq: N.E5, start: 0, decay: 0.7, peak: 0.85, attack: 0.004 }, { freq: N.C5, start: 0.42, decay: 0.95, peak: 0.85, attack: 0.004 }],
    partials: BELL, lowpass: 5000, gain: 1,
  },
  {
    id: "neseli", name: "Neşeli", description: "Hızlı ve enerjik melodi",
    notes: seq([N.C6, N.E6, N.G6, N.E6, N.C7], 0.065, 0.3, 0.6, { attack: 0.003 }),
    partials: [{ wave: "triangle", ratio: 1, level: 1 }], lowpass: 6000, gain: 0.95,
  },
  {
    id: "sakin", name: "Sakin", description: "Yavaş ve yumuşak geçiş",
    notes: seq([N.A4, N.Cs5, N.E5], 0.18, 0.9, 0.7, { attack: 0.04 }),
    partials: SOFT, lowpass: 2500, gain: 1.3,
  },
  {
    id: "parilti", name: "Parıltı", description: "Işıltılı yüksek tınılar",
    notes: seq([N.C7, N.E7, N.G7, N.B7, N.C8], 0.05, 0.4, 0.45),
    partials: PURE, lowpass: 10000, gain: 0.75,
  },
  {
    id: "su-damlasi", name: "Su Damlası", description: "Berrak su damlaları",
    notes: [{ freq: 900, glide: 1600, start: 0, decay: 0.2, peak: 0.85, attack: 0.003 }, { freq: 1100, glide: 2000, start: 0.25, decay: 0.22, peak: 0.85, attack: 0.003 }],
    partials: PURE, lowpass: 5000, gain: 1.2,
  },
  {
    id: "ding-dong", name: "Ding Dong", description: "Parlak iki nota",
    notes: [{ freq: N.C6, start: 0, decay: 0.6, peak: 0.8 }, { freq: N.A5, start: 0.32, decay: 0.85, peak: 0.8 }],
    partials: SOFT, lowpass: 6000, gain: 0.95,
  },
  {
    id: "zen-kase", name: "Zen Kase", description: "Tınlayan Tibet kasesi",
    notes: [{ freq: 528, start: 0, decay: 1.45, peak: 0.9, attack: 0.03 }],
    partials: [{ wave: "sine", ratio: 1, level: 1 }, { wave: "sine", ratio: 2.71, level: 0.35 }, { wave: "sine", ratio: 5.1, level: 0.12 }],
    lowpass: 5000, gain: 1.2,
  },
  {
    id: "fanfar", name: "Fanfar", description: "Kısa kutlama fanfarı",
    notes: [
      { freq: N.G4, start: 0, decay: 0.16, peak: 0.6, attack: 0.006 },
      { freq: N.C5, start: 0.1, decay: 0.16, peak: 0.6, attack: 0.006 },
      { freq: N.E5, start: 0.2, decay: 0.16, peak: 0.6, attack: 0.006 },
      { freq: N.G5, start: 0.3, decay: 0.75, peak: 0.75, attack: 0.008 },
    ],
    partials: [{ wave: "triangle", ratio: 1, level: 1 }, { wave: "sawtooth", ratio: 1, level: 0.12 }], lowpass: 4000, gain: 0.9,
  },
];

const BY_ID = new Map(SOUND_PRESETS.map((preset) => [preset.id, preset]));

export function getSoundPreset(id: string | null | undefined): SoundPreset {
  return (id && BY_ID.get(id)) || SOUND_PRESETS[0];
}

/** Sesin toplam süresi (saniye). */
export function presetDuration(preset: SoundPreset): number {
  return Math.max(...preset.notes.map((note) => note.start + (note.attack ?? 0.008) + note.decay));
}

/** Hazır ayar doğrulaması (testlerde ve geliştirmede kullanılır). Boş dizi = geçerli. */
export function validatePreset(preset: SoundPreset): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9-]+$/.test(preset.id)) errors.push("id");
  if (!preset.name.trim()) errors.push("name");
  if (!preset.notes.length) errors.push("notes");
  if (!preset.partials.length) errors.push("partials");
  if (!(preset.gain > 0 && preset.gain <= 2)) errors.push("gain");
  if (!(preset.lowpass >= 500 && preset.lowpass <= 16000)) errors.push("lowpass");
  for (const note of preset.notes) {
    if (!(note.freq >= 40 && note.freq <= 12000)) errors.push("freq");
    if (note.glide !== undefined && !(note.glide >= 40 && note.glide <= 12000)) errors.push("glide");
    if (!(note.peak > 0 && note.peak <= 1)) errors.push("peak");
    if (!(note.start >= 0) || !(note.decay > 0)) errors.push("timing");
    if (note.attack !== undefined && !(note.attack > 0 && note.attack <= 0.1)) errors.push("attack");
  }
  for (const partial of preset.partials) {
    if (!(partial.ratio > 0 && partial.ratio <= 8) || !(partial.level > 0 && partial.level <= 1)) errors.push("partial");
  }
  if (presetDuration(preset) > MAX_SOUND_SECONDS) errors.push("duration");
  return errors;
}

/* ───────────── Tercih ───────────── */

export interface SoundPreference {
  soundId: string;
  /** 0–1 */
  volume: number;
  muted: boolean;
}

export const DEFAULT_SOUND_PREFERENCE: SoundPreference = { soundId: DEFAULT_SOUND_ID, volume: 1, muted: false };

/** Firestore/localStorage'dan gelen her şeyi güvenli tercihe çevirir; bilinmeyen ses → Varsayılan. */
export function parseSoundPreference(raw: unknown): SoundPreference {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOUND_PREFERENCE };
  const value = raw as Record<string, unknown>;
  const soundId = typeof value.soundId === "string" && BY_ID.has(value.soundId) ? value.soundId : DEFAULT_SOUND_ID;
  const volumeNumber = typeof value.volume === "number" ? value.volume : typeof value.volume === "string" ? Number(value.volume) : NaN;
  const volume = Number.isFinite(volumeNumber) ? Math.min(1, Math.max(0, volumeNumber)) : DEFAULT_SOUND_PREFERENCE.volume;
  return { soundId, volume, muted: value.muted === true };
}

/** Kaydedilmiş zaman (ms): Firestore Timestamp, sayı veya ISO. */
export function preferenceTimestamp(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const value = (raw as Record<string, unknown>).updatedAt ?? (raw as Record<string, unknown>).updatedAtMs;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  if (value && typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}
