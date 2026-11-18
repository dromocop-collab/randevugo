// Arkadaşını getir (referans) programı — saf kurallar. Test: referral-domain.test.mjs
// Her firmanın (businessOrganizations) bir kodu var. Kodla açılan YENİ firmanın ilk mağazası yayına girince
// davet eden firmanın tüm şubelerine ödül süresi (vars. +1 ay) işlenir. Kötüye kullanım: kendini davet,
// aynı telefon/e-posta, yıllık üst sınır.

export const REFERRAL_SETTINGS_PATH = "platformPrivateSettings/referrals";
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O, 1/I karışmaz

export type ReferralSettings = {
  enabled: boolean;
  /** Davet edene verilecek ay. */
  rewardMonths: number;
  /** Bir firmanın 365 günde en fazla kaç ödül alabileceği. */
  yearlyCap: number;
  /** Davetle gelen yeni işletmenin deneme süresine eklenen gün (0 = yok). */
  referredBonusDays: number;
};

export const REFERRAL_DEFAULTS: ReferralSettings = { enabled: true, rewardMonths: 1, yearlyCap: 12, referredBonusDays: 0 };

export function normalizeReferralSettings(input: unknown): ReferralSettings {
  const row = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const int = (value: unknown, fallback: number, min: number, max: number) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  return {
    enabled: row.enabled !== false,
    rewardMonths: int(row.rewardMonths, REFERRAL_DEFAULTS.rewardMonths, 1, 12),
    yearlyCap: int(row.yearlyCap, REFERRAL_DEFAULTS.yearlyCap, 1, 120),
    referredBonusDays: int(row.referredBonusDays, REFERRAL_DEFAULTS.referredBonusDays, 0, 90),
  };
}

function foldUpper(value: string): string {
  return value.toLocaleUpperCase("tr-TR").replace(/İ/g, "I").replace(/Ğ/g, "G").replace(/Ü/g, "U").replace(/Ş/g, "S").replace(/Ö/g, "O").replace(/Ç/g, "C")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
}

/** Kullanıcının yazdığı kodu sadeleştirir ("salon-7k2 " → "SALON7K2"); geçersizse null. */
export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = foldUpper(value.trim()).slice(0, 16);
  return /^[A-Z0-9]{5,12}$/.test(code) ? code : null;
}

/**
 * Firma adından akılda kalır kod: adın ilk 5 harfi + 3 rastgele karakter (rastgele kısımda 0/O, 1/I yok).
 * "Salon Yavuz" → "SALON7K2". bytes: en az 3 rastgele bayt.
 */
export function referralCodeFromName(name: string, bytes: Uint8Array): string {
  const letters = foldUpper(name).replace(/[0-9]/g, "").slice(0, 5);
  const prefix = letters.length >= 3 ? letters : `SR${letters}`.slice(0, 5);
  const suffix = Array.from(bytes.slice(0, 3), (byte) => REFERRAL_CODE_ALPHABET[byte % REFERRAL_CODE_ALPHABET.length]).join("");
  return `${prefix}${suffix}`;
}

/** Metin içinden olası referans kodu (WhatsApp "Kaydol SALON7K2", "davet kodum: salon7k2"). En az bir rakam ister. */
export function referralCodeInText(text: string): string | null {
  for (const token of text.split(/[\s,.;:!?()"'#]+/)) {
    const code = normalizeReferralCode(token);
    if (code && /\d/.test(code) && /[A-Z]/.test(code)) return code;
  }
  return null;
}

export type ReferralParty = { ownerUid: string; organizationId: string; phone: string; email: string };

/** Davet geçerli mi (ödül verilebilir mi)? Geçersizse nedeni. */
export function referralBlockReason(referrer: ReferralParty, referred: ReferralParty): "self" | "same_phone" | "same_email" | null {
  if (!referrer.ownerUid || referrer.ownerUid === referred.ownerUid || (referrer.organizationId && referrer.organizationId === referred.organizationId)) return "self";
  const digits = (value: string) => value.replace(/\D/g, "").slice(-10);
  if (digits(referrer.phone).length === 10 && digits(referrer.phone) === digits(referred.phone)) return "same_phone";
  const email = (value: string) => value.trim().toLowerCase();
  if (email(referrer.email) && email(referrer.email) === email(referred.email)) return "same_email";
  return null;
}

export const REFERRAL_BLOCK_TEXT: Record<string, string> = {
  self: "Kendi firmanı davet edemezsin.",
  same_phone: "Davet eden ile aynı telefon numarası.",
  same_email: "Davet eden ile aynı e-posta adresi.",
  cap: "Yıllık davet ödülü sınırına ulaşıldı.",
  disabled: "Davet programı kapalı.",
  not_active: "İşletme yayına girmedi.",
  admin: "Süper admin reddetti.",
};

function addMonths(baseMillis: number, months: number): number {
  const base = new Date(baseMillis);
  const target = new Date(base.getTime());
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(base.getUTCDate(), lastDay));
  return target.getTime();
}

function millisOf(value: unknown): number | null {
  if (typeof value === "string") { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null; }
  if (value && typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") return (value as { toMillis: () => number }).toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export type RewardPatch = { kind: "lifetime" } | { kind: "trial" | "active" | "restart"; patch: Record<string, unknown>; endsAt: number };

/**
 * Bir şubenin aboneliğine ödül süresi:
 * - süresiz → değişmez
 * - denemede → deneme bitişi +N ay (deneme olarak kalır)
 * - aktif (süresi sürüyor) → bitiş +N ay
 * - süresi dolmuş/iptal/eksik → bugünden N ay aktif
 */
export function rewardSubscriptionPatch(row: Record<string, unknown> | undefined, months: number, now: number): RewardPatch {
  if (row?.isLifetime === true || row?.accessMode === "lifetime") return { kind: "lifetime" };
  const status = String(row?.status ?? "");
  if (status === "trialing") {
    const end = Math.max(millisOf(row?.trialEndsAt) ?? now, now);
    const endsAt = addMonths(end, months);
    return { kind: "trial", endsAt, patch: { trialEndsAt: new Date(endsAt).toISOString() } };
  }
  const activeEnd = status === "active" ? millisOf(row?.subscriptionEndsAt) : null;
  if (activeEnd && activeEnd > now) {
    const endsAt = addMonths(activeEnd, months);
    return { kind: "active", endsAt, patch: { subscriptionEndsAt: new Date(endsAt).toISOString() } };
  }
  const endsAt = addMonths(now, months);
  return {
    kind: "restart", endsAt,
    patch: { status: "active", accessMode: "timed", isLifetime: false, subscriptionStartedAt: new Date(now).toISOString(), subscriptionEndsAt: new Date(endsAt).toISOString() },
  };
}

/** Yeni gelenin deneme süresine bonus gün. */
export function bonusTrialEnd(trialEndsAtIso: string, days: number): string {
  const base = Date.parse(trialEndsAtIso);
  return new Date((Number.isFinite(base) ? base : Date.now()) + days * 86_400_000).toISOString();
}
