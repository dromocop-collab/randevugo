// Yarım kalan işletme kayıtları — saf yardımcılar. Test: signup-lead-domain.test.mjs
//
// Kayıt formunun 2. adımında (işletme adı + cep) "yarım kayıt" yazılır: signupLeads/{90XXXXXXXXXX}.
// Kişi kaydı bitirirse createBusinessForOwner kaydı "converted" yapar. Bitirmezse 30 dk sonra bir kez WhatsApp
// hatırlatma şablonu gider (ayar: platformPrivateSettings/whatsapp.leadReminder.enabled, varsayılan KAPALI;
// şablon Meta'da onaylanınca süper admin › Yarım kayıtlar'dan açılır). Süper admin listeden elle de ulaşabilir.

import type { TemplateDefinition } from "./onboarding-whatsapp-domain.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Formdan çıkıp gitmiş sayılmak için beklenen süre (bu sürede kaydı bitiren hatırlatma almaz). */
export const LEAD_REMINDER_DELAY_MS = 30 * MINUTE;
/** Bu kadar eski yarım kayda otomatik mesaj gitmez (kanal sonradan açıldıysa eski kayıtlar rahatsız edilmesin). */
export const LEAD_REMINDER_MAX_AGE_MS = 20 * HOUR;

export type LeadInput = {
  phone: string;
  name: string;
  category: string;
  city: string;
  district: string;
  source: string | null;
  campaign: string | null;
};

const text = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Türkiye cep numarası → 90 5XX XXX XX XX (WhatsApp biçimi). Geçersizse null. */
export function leadPhone(raw: unknown): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return /^5\d{9}$/.test(digits) ? `90${digits}` : null;
}

/** Formdan gelen yarım kayıt. Ad ve geçerli cep zorunlu; gerisi kısaltılıp temizlenir. */
export function parseLeadInput(raw: unknown): LeadInput | null {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const phone = leadPhone(data.phone);
  const name = text(data.name, 100);
  if (!phone || name.length < 2) return null;
  const slug = (value: unknown) => /^[a-z0-9-]{1,40}$/.test(String(value ?? "")) ? String(value) : "";
  const tag = (value: unknown) => { const v = text(value, 60).toLowerCase(); return /^[\p{L}\p{N}._ -]+$/u.test(v) ? v : null; };
  return {
    phone, name, category: slug(data.category), city: text(data.city, 40), district: text(data.district, 60),
    source: tag(data.source), campaign: tag(data.campaign),
  };
}

export type LeadSettings = { reminderEnabled: boolean };

export function parseLeadSettings(raw: unknown): LeadSettings {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return { reminderEnabled: data.reminderEnabled === true };
}

export type LeadState = {
  status: string;
  createdAtMs: number | null;
  reminderSentAtMs: number | null;
  optedOut: boolean;
};

export type LeadDecision = { send: true } | { send: false; reason: "converted" | "closed" | "already_sent" | "opted_out" | "too_old" | "too_early" };

export function decideLeadReminder(lead: LeadState, nowMs: number): LeadDecision {
  if (lead.status === "converted") return { send: false, reason: "converted" };
  if (lead.status !== "open") return { send: false, reason: "closed" };
  if (lead.reminderSentAtMs) return { send: false, reason: "already_sent" };
  if (lead.optedOut) return { send: false, reason: "opted_out" };
  const created = lead.createdAtMs ?? nowMs;
  if (nowMs - created > LEAD_REMINDER_MAX_AGE_MS) return { send: false, reason: "too_old" };
  if (nowMs - created < LEAD_REMINDER_DELAY_MS) return { send: false, reason: "too_early" };
  return { send: true };
}

export const LEAD_SKIP_LABEL: Record<string, string> = {
  converted: "Kaydı tamamladı", closed: "Kapatıldı", already_sent: "Zaten gönderildi", opted_out: "DUR dedi",
  too_old: "Çok eski", too_early: "Henüz erken",
};

/** Hatırlatma şablonu (Meta'ya karşılama şablonlarıyla birlikte gönderilir). Hızlı yanıt WhatsApp kayıt botunu başlatır. */
export const LEAD_TEMPLATE_DEFINITION: TemplateDefinition = {
  name: "sr_kayit_yarim",
  category: "MARKETING",
  body: "Merhaba, *{{1}}* için Senin Randevun kaydına başlamıştın ama yarıda kaldı. 🙂\n\nKalan adımlar yaklaşık 1 dakika sürüyor; ilk ay ücretsiz, kredi kartı gerekmez. İstersen buradan yaz, kaydını birlikte tamamlayalım.",
  bodyExample: ["Ayşe Güzellik Salonu"],
  buttons: [
    { type: "URL", text: "Kaydı tamamla", url: "https://seninrandevun.com/isletmeler/kayit" },
    { type: "QUICK_REPLY", text: "WhatsApp'tan tamamla" },
  ],
};

const clean = (value: string) => (value.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || "İşletmen").slice(0, 100);

export function leadReminderMessage(to: string, businessName: string, language: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: LEAD_TEMPLATE_DEFINITION.name,
      language: { code: language },
      components: [{ type: "body", parameters: [{ type: "text", text: clean(businessName) }] }],
    },
  };
}

/** Gelen kutusundaki okunur kopya. */
export function renderLeadReminderText(businessName: string): string {
  return LEAD_TEMPLATE_DEFINITION.body.replace("{{1}}", clean(businessName));
}
