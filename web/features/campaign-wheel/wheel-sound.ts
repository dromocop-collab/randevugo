// Çark sesleri: dosya yok, Web Audio ile anlık üretilir (tık, kazanma arpeji, "olmadı" iki notası).
// Ses ancak kullanıcı dokunuşuyla başlar (tarayıcı kuralı); çevir düğmesi bu dokunuştur.

type Ctx = AudioContext;
let shared: Ctx | null = null;

function context(): Ctx | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    shared ??= new Ctor();
    if (shared.state === "suspended") void shared.resume();
    return shared;
  } catch {
    return null;
  }
}

/** İlk dokunuşta çağrılır ki sonraki tıklar gecikmesiz çalsın. */
export function primeWheelAudio() {
  context();
}

/** Mandalın çivilere çarpma sesi. speed 0..1 → hızlıyken daha kısa ve tiz. */
export function playTick(speed: number) {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1500 + speed * 900 + Math.random() * 120, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
  filter.type = "highpass";
  filter.frequency.value = 500;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.11 - speed * 0.04, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

function note(ctx: Ctx, frequency: number, start: number, length: number, volume: number, type: OscillatorType = "sine") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export function playWin() {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime + 0.02;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    note(ctx, frequency, now + index * 0.085, 0.42, 0.16, "triangle");
    note(ctx, frequency * 2, now + index * 0.085, 0.25, 0.04, "sine");
  });
  note(ctx, 1318.5, now + 0.4, 0.7, 0.09, "sine");
}

export function playMiss() {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime + 0.02;
  note(ctx, 392, now, 0.22, 0.1, "triangle");
  note(ctx, 311.1, now + 0.18, 0.4, 0.09, "triangle");
}
