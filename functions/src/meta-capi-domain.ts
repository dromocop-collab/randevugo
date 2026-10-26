import { createHash } from "crypto";

// Meta Conversions API — saf yardımcılar. Test: meta-capi-domain.test.mjs
// Sunucu, "kayda başladı" (Lead) ve "işletme oluşturdu" (CompleteRegistration) olaylarını Meta'ya bildirir; reklam
// "kayıt olacak kişiyi" bulmayı bu sinyallerle öğrenir. E-posta/telefon Meta kuralına göre normalleştirilip SHA-256 ile
// gönderilir (açık metin gitmez). Tarayıcı Pixel'iyle aynı olay iki kez sayılmasın diye event_id ortak tutulur.

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Meta tıklama kimliği (fbclid) — URL'den gelir; yalnız güvenli karakterler. */
export function sanitizeFbclid(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{10,500}$/.test(text) ? text : null;
}

/** fbc biçimi: fb.1.<ilk görülme ms>.<fbclid> */
export function buildFbc(fbclid: string | null, capturedAt: number | null | undefined): string | null {
  if (!fbclid) return null;
  const at = Number(capturedAt);
  return `fb.1.${Number.isFinite(at) && at > 0 ? Math.round(at) : Date.now()}.${fbclid}`;
}

/** Tarayıcıdan gelen _fbp / fbc çerez değerleri: fb.<n>.<ms>.<değer> */
export function sanitizeFbCookie(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^fb\.\d\.\d{10,14}\.[A-Za-z0-9_.-]{5,500}$/.test(text) ? text : null;
}

export function hashEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? sha256(email) : null;
}

/** Telefon: yalnız rakam, ülke koduyla (TR: 90…). */
export function hashPhone(value: unknown): string | null {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return /^\d{10,15}$/.test(digits) ? sha256(digits) : null;
}

export function hashExternalId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? sha256(text) : null;
}

export type CapiUserInput = {
  email?: unknown; phone?: unknown; externalId?: unknown; ip?: string | null; userAgent?: string | null; fbc?: string | null; fbp?: string | null;
};

export type CapiEventInput = {
  eventName: "Lead" | "CompleteRegistration" | "ViewContent" | "StartTrial";
  eventId: string; eventTimeMs: number; sourceUrl: string; user: CapiUserInput; customData?: Record<string, string | number>;
};

/** Meta'ya gidecek tek olay. Eşleştirme bilgisi hiç yoksa null (gönderilmez). */
export function buildCapiEvent(input: CapiEventInput) {
  const userData: Record<string, unknown> = {};
  const em = hashEmail(input.user.email); if (em) userData.em = [em];
  const ph = hashPhone(input.user.phone); if (ph) userData.ph = [ph];
  const external = hashExternalId(input.user.externalId); if (external) userData.external_id = [external];
  if (input.user.ip && input.user.ip !== "unknown") userData.client_ip_address = input.user.ip;
  if (input.user.userAgent) userData.client_user_agent = input.user.userAgent.slice(0, 400);
  const fbc = sanitizeFbCookie(input.user.fbc); if (fbc) userData.fbc = fbc;
  const fbp = sanitizeFbCookie(input.user.fbp); if (fbp) userData.fbp = fbp;
  if (!userData.em && !userData.ph && !userData.fbc && !userData.fbp && !userData.client_ip_address) return null;
  return {
    event_name: input.eventName,
    event_time: Math.floor(input.eventTimeMs / 1000),
    event_id: input.eventId.slice(0, 100),
    action_source: "website",
    event_source_url: input.sourceUrl,
    user_data: userData,
    ...(input.customData ? { custom_data: input.customData } : {}),
  };
}

/** Pixel kimliği: yalnız rakam. */
export function normalizePixelId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^\d{10,20}$/.test(text) ? text : null;
}
