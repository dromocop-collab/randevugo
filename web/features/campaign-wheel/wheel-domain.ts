// Kampanya çarkı — istemci tipleri ve saf yardımcılar (sunucu kopyası: functions/src/campaign-wheel-domain.ts).
// Kazanan dilime her zaman sunucu karar verir; buradaki seçim yalnız paneldeki "deneme çevirmesi" içindir.

export type WheelPrizeType = "percent" | "amount" | "free_service" | "points" | "none";

export type PublicWheelSlice = { id: string; label: string; type: WheelPrizeType; color: string | null };

export type PublicWheel = {
  campaignId: string;
  title: string;
  subtitle: string;
  startsAt: number | null;
  endsAt: number | null;
  prizeValidDays: number;
  slices: PublicWheelSlice[];
};

export type WheelSliceSettings = PublicWheelSlice & {
  value: number;
  serviceId: string | null;
  serviceName: string | null;
  weight: number;
  stock: number | null;
};

export type WheelSettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  campaignId: string;
  startsAt: number | null;
  endsAt: number | null;
  prizeValidDays: number;
  slices: WheelSliceSettings[];
  awarded: Record<string, number>;
  spins: number;
  wins: number;
};

export type WheelPrize = { type: WheelPrizeType; value: number; label: string; serviceId: string | null; serviceName: string | null };

export type SpinResult = {
  alreadySpun: boolean;
  sliceIndex: number;
  sliceId: string;
  prize: WheelPrize | null;
  prizeText: string;
  code: string | null;
  status: string;
  expiresAt: number | null;
};

export const WHEEL_MIN_SLICES = 2;
export const WHEEL_MAX_SLICES = 12;

/** Dilim renkleri: koyu yeşil, limon, krem, mürekkep… sırayla; komşular birbirine benzemez. */
export const WHEEL_PALETTE = ["#0f5132", "#d7ff70", "#f4efe2", "#14281f", "#1f8a5b", "#ffd166", "#e9f5e1", "#2a3d33", "#9be564", "#ff8a65", "#cfe8d6", "#3b5b4a"];

export function sliceColor(slice: Pick<PublicWheelSlice, "color">, index: number): string {
  return slice.color ?? WHEEL_PALETTE[index % WHEEL_PALETTE.length];
}

/** Arka plan rengine göre okunur yazı rengi. */
export function readableInk(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16), g = parseInt(value.slice(2, 4), 16), b = parseInt(value.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#10281d" : "#ffffff";
}

export function wheelIsLive(wheel: Pick<PublicWheel, "startsAt" | "endsAt"> | null | undefined, now: number): boolean {
  if (!wheel) return false;
  if (wheel.startsAt && now < wheel.startsAt) return false;
  if (wheel.endsAt && now >= wheel.endsAt) return false;
  return true;
}

/** Paneldeki olasılık yüzdeleri (stoğu bitmiş dilimler hariç). */
export function sliceOdds(slices: Array<Pick<WheelSliceSettings, "id" | "weight" | "stock">>, awarded: Record<string, number>): number[] {
  const eligible = slices.map((slice) => slice.weight > 0 && (slice.stock === null || (awarded[slice.id] ?? 0) < slice.stock) ? slice.weight : 0);
  const total = eligible.reduce((sum, weight) => sum + weight, 0);
  return eligible.map((weight) => (total > 0 ? (weight / total) * 100 : 0));
}

/** Yalnız panel önizlemesi için yerel seçim. */
export function previewPick(slices: Array<Pick<WheelSliceSettings, "weight">>, random: number): number {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.weight), 0);
  if (total <= 0) return 0;
  let cursor = random * total;
  for (let index = 0; index < slices.length; index++) {
    cursor -= Math.max(0, slices[index].weight);
    if (cursor < 0) return index;
  }
  return slices.length - 1;
}

/** Adisyondaki indirim önizlemesi (sunucu aynısını uygular). */
export function prizeDiscount(prize: Pick<WheelPrize, "type" | "value" | "serviceId">, lines: Array<{ serviceId: string | null; price: number }>, total: number): number {
  const base = Math.max(0, Number.isFinite(total) ? total : 0);
  let discount = 0;
  if (prize.type === "percent") discount = (base * prize.value) / 100;
  else if (prize.type === "amount") discount = prize.value;
  else if (prize.type === "free_service") {
    const line = lines.find((item) => item.serviceId && item.serviceId === prize.serviceId);
    discount = line ? Math.max(0, line.price) : 0;
  }
  return Math.round(Math.min(discount, base) * 100) / 100;
}

/**
 * Dönüş planı: şu anki açıdan (derece), şu anki hızla (derece/sn) başlayıp hedef dilimin içinde duran
 * yavaşlama eğrisi. Konum p(u) = start + distance · ease(u), ease = 1-(1-u)^3 → başlangıç hızı 3·distance/T.
 * Hız kesintisiz devralınır; mesafe en az minTurns tur olur, süre [minMs, maxMs] aralığına sığdırılır.
 */
export function planLanding(input: {
  angle: number;
  velocity: number;
  targetIndex: number;
  sliceCount: number;
  /** Dilim içindeki duruş noktası, -0.5..0.5 (0 = tam orta). */
  jitter: number;
  minTurns?: number;
  idealMs?: number;
}): { distance: number; durationMs: number } {
  const slice = 360 / input.sliceCount;
  const minTurns = input.minTurns ?? 4;
  const idealMs = input.idealMs ?? 5600;
  // İşaretçi tepede (0°). Çark +açı yönünde döner; dilim i'nin merkezi i·slice + slice/2 konumunda.
  // Dilim i işaretçinin altına gelince: (angle + i·slice + slice/2) ≡ 0 (mod 360).
  const stopAt = -(input.targetIndex * slice + slice / 2 + input.jitter * slice * 0.7);
  const current = ((input.angle % 360) + 360) % 360;
  const base = ((stopAt - current) % 360 + 360) % 360;
  const velocity = Math.max(120, input.velocity);
  const wanted = Math.max(minTurns * 360, (velocity * idealMs) / 3000);
  const turns = Math.max(0, Math.round((wanted - base) / 360));
  const distance = base + turns * 360;
  const durationMs = Math.min(9000, Math.max(3800, (3 * distance * 1000) / velocity));
  return { distance, durationMs };
}

export function easeOutCubic(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return 1 - (1 - x) ** 3;
}
