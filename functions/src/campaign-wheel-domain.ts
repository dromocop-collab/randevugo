// Kampanya çarkı — saf yardımcılar. Test: campaign-wheel-domain.test.mjs
// Ayar: businesses/{id}/campaignWheel/settings (yalnız sunucu yazar, olasılıklar burada).
// Vitrin: businesses/{id}.spinWheelPublic (olasılık/stok içermez). Çevirmeler: businesses/{id}/campaignWheelSpins.
// Kazanan dilime sunucu karar verir; tarayıcı yalnız sonucu canlandırır.

export type WheelPrizeType = "percent" | "amount" | "free_service" | "points" | "none";

export type WheelSlice = {
  id: string;
  label: string;
  type: WheelPrizeType;
  /** percent: 1-100, amount: TL, points: puan, free_service/none: 0. */
  value: number;
  serviceId: string | null;
  serviceName: string | null;
  /** Göreli ağırlık (0 = hiç çıkmaz). Toplam 100 olmak zorunda değil. */
  weight: number;
  /** Bu dilimden en fazla kaç ödül verilir (null = sınırsız). */
  stock: number | null;
  color: string | null;
};

export type WheelSettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  campaignId: string;
  startsAt: number | null;
  endsAt: number | null;
  /** Kazanılan ödül kaç gün içinde kullanılabilir. */
  prizeValidDays: number;
  slices: WheelSlice[];
};

export type WheelPrize = {
  type: WheelPrizeType;
  value: number;
  label: string;
  serviceId: string | null;
  serviceName: string | null;
};

export type PublicWheel = {
  campaignId: string;
  title: string;
  subtitle: string;
  startsAt: number | null;
  endsAt: number | null;
  prizeValidDays: number;
  slices: Array<{ id: string; label: string; type: WheelPrizeType; color: string | null }>;
};

export const WHEEL_MIN_SLICES = 2;
export const WHEEL_MAX_SLICES = 12;
const PRIZE_TYPES: WheelPrizeType[] = ["percent", "amount", "free_service", "points", "none"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class WheelValidationError extends Error {}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function timeOrNull(value: unknown): number | null {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) || n <= 0 ? null : Math.round(n);
}

/** Panelden gelen ayarı doğrular ve normalize eder; hata mesajı doğrudan işletmeye gösterilir. */
export function normalizeWheelSettings(raw: unknown, previous: Pick<WheelSettings, "campaignId"> | null, newCampaignId: () => string): WheelSettings {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = cleanText(data.title, 60) || "Şans çarkı";
  const subtitle = cleanText(data.subtitle, 140);
  const startsAt = timeOrNull(data.startsAt);
  const endsAt = timeOrNull(data.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) throw new WheelValidationError("Bitiş tarihi başlangıçtan sonra olmalı.");
  const validDays = Math.round(Number(data.prizeValidDays ?? 30));
  const prizeValidDays = Number.isFinite(validDays) ? Math.min(365, Math.max(1, validDays)) : 30;

  const rawSlices = Array.isArray(data.slices) ? data.slices : [];
  if (rawSlices.length < WHEEL_MIN_SLICES || rawSlices.length > WHEEL_MAX_SLICES) {
    throw new WheelValidationError(`Çarkta ${WHEEL_MIN_SLICES} ile ${WHEEL_MAX_SLICES} arasında dilim olmalı.`);
  }
  const usedIds = new Set<string>();
  const slices = rawSlices.map((item, index): WheelSlice => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const type = PRIZE_TYPES.includes(row.type as WheelPrizeType) ? row.type as WheelPrizeType : "none";
    let id = cleanText(row.id, 24).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id || usedIds.has(id)) id = `d${index + 1}`;
    while (usedIds.has(id)) id = `${id}x`;
    usedIds.add(id);
    const label = cleanText(row.label, 28);
    if (!label) throw new WheelValidationError(`${index + 1}. dilimin adı boş olamaz.`);
    let value = Number(row.value ?? 0);
    if (!Number.isFinite(value)) value = 0;
    if (type === "percent") {
      value = Math.round(value);
      if (value < 1 || value > 100) throw new WheelValidationError(`"${label}": yüzde indirim 1 ile 100 arasında olmalı.`);
    } else if (type === "amount") {
      value = Math.round(value * 100) / 100;
      if (value < 1 || value > 100_000) throw new WheelValidationError(`"${label}": TL indirim 1 ile 100.000 arasında olmalı.`);
    } else if (type === "points") {
      value = Math.round(value);
      if (value < 1 || value > 100_000) throw new WheelValidationError(`"${label}": puan 1 ile 100.000 arasında olmalı.`);
    } else value = 0;
    const serviceId = type === "free_service" ? cleanText(row.serviceId, 128) || null : null;
    if (type === "free_service" && !serviceId) throw new WheelValidationError(`"${label}": ücretsiz verilecek hizmeti seçin.`);
    const weight = Number(row.weight ?? 0);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000) throw new WheelValidationError(`"${label}": şans 0 ile 1000 arasında olmalı.`);
    const stockRaw = row.stock;
    let stock: number | null = null;
    if (stockRaw !== null && stockRaw !== undefined && stockRaw !== "") {
      stock = Math.floor(Number(stockRaw));
      if (!Number.isFinite(stock) || stock < 0 || stock > 1_000_000) throw new WheelValidationError(`"${label}": stok 0 veya daha büyük bir sayı olmalı.`);
    }
    const color = /^#[0-9a-fA-F]{6}$/.test(String(row.color ?? "")) ? String(row.color) : null;
    return {
      id, label, type, value, serviceId,
      serviceName: type === "free_service" ? cleanText(row.serviceName, 80) || null : null,
      weight: Math.round(weight * 100) / 100, stock, color,
    };
  });
  if (!slices.some((slice) => slice.weight > 0)) throw new WheelValidationError("En az bir dilimin şansı 0'dan büyük olmalı.");
  if (!slices.some((slice) => slice.type !== "none")) throw new WheelValidationError("Çarkta en az bir ödül dilimi olmalı.");

  const resetCampaign = data.newCampaign === true || !previous?.campaignId;
  return {
    enabled: data.enabled === true,
    title, subtitle,
    campaignId: resetCampaign ? newCampaignId() : previous!.campaignId,
    startsAt, endsAt, prizeValidDays, slices,
  };
}

export function publicWheel(settings: WheelSettings): PublicWheel | null {
  if (!settings.enabled) return null;
  return {
    campaignId: settings.campaignId,
    title: settings.title,
    subtitle: settings.subtitle,
    startsAt: settings.startsAt,
    endsAt: settings.endsAt,
    prizeValidDays: settings.prizeValidDays,
    slices: settings.slices.map((slice) => ({ id: slice.id, label: slice.label, type: slice.type, color: slice.color })),
  };
}

export function wheelIsLive(settings: Pick<WheelSettings, "enabled" | "startsAt" | "endsAt">, now: number): boolean {
  if (!settings.enabled) return false;
  if (settings.startsAt && now < settings.startsAt) return false;
  if (settings.endsAt && now >= settings.endsAt) return false;
  return true;
}

/**
 * Ağırlığa göre dilim seçer. Stoğu biten dilim çıkmaz; hiçbir ödül dilimi kalmadıysa "none" dilimi
 * (ağırlığı 0 olsa bile) döner, o da yoksa null (çark kapanmalı).
 * random: [0, 1) aralığında güvenli rastgele sayı.
 */
export function pickSliceIndex(slices: WheelSlice[], awarded: Record<string, number>, random: number): number | null {
  const available = slices
    .map((slice, index) => ({ slice, index }))
    .filter(({ slice }) => slice.weight > 0 && (slice.stock === null || (awarded[slice.id] ?? 0) < slice.stock));
  const total = available.reduce((sum, item) => sum + item.slice.weight, 0);
  if (total > 0) {
    let cursor = Math.min(Math.max(random, 0), 0.999999999) * total;
    for (const item of available) {
      cursor -= item.slice.weight;
      if (cursor < 0) return item.index;
    }
    return available[available.length - 1].index;
  }
  const fallback = slices.findIndex((slice) => slice.type === "none");
  return fallback >= 0 ? fallback : null;
}

export function prizeFromSlice(slice: WheelSlice): WheelPrize {
  return { type: slice.type, value: slice.value, label: slice.label, serviceId: slice.serviceId, serviceName: slice.serviceName };
}

/** "SR-K7QM-4XPA": karışan karakter yok (0/O, 1/I). bytes en az 8 bayt olmalı. */
export function prizeCode(bytes: Uint8Array): string {
  const chars = Array.from(bytes.slice(0, 8), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  return `SR-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

export type PricedLine = { serviceId: string | null; price: number };

/** Randevudaki hizmet satırları için ödülün TL karşılığı (0 = bu randevuya uygulanamaz). */
export function prizeDiscount(prize: Pick<WheelPrize, "type" | "value" | "serviceId">, lines: PricedLine[], total: number): number {
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

/** Ödül bu randevuya bağlanabilir mi? Ücretsiz hizmet yalnız o hizmet alınıyorsa; puan/boş hiçbir zaman. */
export function prizeAppliesToBooking(prize: Pick<WheelPrize, "type" | "serviceId">, serviceIds: Array<string | null>): boolean {
  if (prize.type === "percent" || prize.type === "amount") return true;
  if (prize.type === "free_service") return Boolean(prize.serviceId && serviceIds.includes(prize.serviceId));
  return false;
}

/** Müşteriye ve panele gösterilen kısa açıklama. */
export function prizeText(prize: Pick<WheelPrize, "type" | "value" | "label" | "serviceName">): string {
  if (prize.type === "percent") return `%${prize.value} indirim`;
  if (prize.type === "amount") return `${formatTl(prize.value)} indirim`;
  if (prize.type === "free_service") return prize.serviceName ? `Ücretsiz ${prize.serviceName}` : prize.label;
  if (prize.type === "points") return `${prize.value} puan`;
  return prize.label;
}

function formatTl(value: number): string {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value)} ₺`;
}

/** Telefon başına bir hak: belge kimliği kampanya + telefon özetinden türetilir. */
export function spinDocumentId(campaignId: string, phoneHash: string): string {
  return `${campaignId}_${phoneHash.slice(0, 32)}`;
}
