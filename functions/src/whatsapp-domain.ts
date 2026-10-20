import { createHmac, timingSafeEqual } from "crypto";

// WhatsApp Cloud API (Meta) ile randevu bildirimleri — saf yardımcılar. Test: whatsapp-domain.test.mjs
// Ayar: platformPrivateSettings/whatsapp (yalnız sunucu okur). Kanal kapalıysa her şey SMS ile devam eder.

export type AppointmentMessageType = "confirmation" | "reminder" | "cancellation" | "reschedule";

export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  apiVersion: string;
  /** Varsayılan https://graph.facebook.com; yalnız emülatör testleri için http://127.0.0.1:<port> kabul edilir. */
  apiBase: string;
  language: string;
  templates: Record<AppointmentMessageType, string>;
};

/** Kullanılan şablonlar: düğmeli sr_* (2026-10-20, Meta'da onaylı). Eski klasik şablonlar: randevu_onay, randevu_hatirlatma_v2, randevu_iptal, randevu_degisiklik. */
export const DEFAULT_TEMPLATES: Record<AppointmentMessageType, string> = {
  confirmation: "sr_randevu_onay",
  reminder: "sr_randevu_hatirlatma",
  cancellation: "sr_randevu_iptal",
  reschedule: "sr_randevu_degisiklik",
};

export function parseWhatsAppConfig(data: Record<string, unknown> | null | undefined): WhatsAppConfig | null {
  if (!data || data.enabled !== true) return null;
  const phoneNumberId = String(data.phoneNumberId ?? "").trim();
  const accessToken = String(data.accessToken ?? "").trim();
  const appSecret = String(data.appSecret ?? "").trim();
  const verifyToken = String(data.verifyToken ?? "").trim();
  if (!/^\d{6,}$/.test(phoneNumberId) || accessToken.length < 20 || !appSecret || !verifyToken) return null;
  const raw = (data.templates ?? {}) as Record<string, unknown>;
  const templates = { ...DEFAULT_TEMPLATES };
  for (const key of Object.keys(DEFAULT_TEMPLATES) as AppointmentMessageType[]) {
    if (typeof raw[key] === "string" && /^[a-z0-9_]{1,512}$/.test(raw[key] as string)) templates[key] = raw[key] as string;
  }
  const apiVersion = /^v\d+\.\d+$/.test(String(data.apiVersion ?? "")) ? String(data.apiVersion) : "v21.0";
  const language = /^[a-z]{2}(_[A-Z]{2})?$/.test(String(data.language ?? "")) ? String(data.language) : "tr";
  const apiBase = /^http:\/\/127\.0\.0\.1:\d+$/.test(String(data.apiBase ?? "")) ? String(data.apiBase) : "https://graph.facebook.com";
  return { phoneNumberId, accessToken, appSecret, verifyToken, apiVersion, apiBase, language, templates };
}

/**
 * Webhook için yalnız doğrulama sırları: kanal kapalıyken (enabled=false, şablonlar onay beklerken) de
 * Meta'nın webhook doğrulaması ve durum bildirimleri çalışsın diye gönderim ayarlarından bağımsızdır.
 */
export function parseWhatsAppWebhookSecrets(data: Record<string, unknown> | null | undefined): { verifyToken: string; appSecret: string } {
  return { verifyToken: String(data?.verifyToken ?? "").trim(), appSecret: String(data?.appSecret ?? "").trim() };
}

/** "+90 555 111 22 33" / "05551112233" / "5551112233" → "905551112233"; Türkiye cep dışı numara → null. */
export function toWhatsAppPhone(value: unknown): string | null {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return /^905\d{9}$/.test(digits) ? digits : null;
}

export type TemplateParams = {
  businessName: string; serviceName: string; dateText: string; detailsUrl: string;
  /** Düğmeli şablonlar: ayrı tarih ("22.10.2026") ve saat ("13:00"), randevu anahtarı ve işletme adresi (slug). */
  dayText?: string; timeText?: string; publicToken?: string; businessSlug?: string;
};

/**
 * Şablon gövde değişkenleri (Meta'da şablonlar bu sırayla oluşturulmalı):
 *   onay / hatırlatma / değişiklik: {{1}} işletme, {{2}} hizmet, {{3}} tarih-saat, {{4}} randevu bağlantısı
 *   iptal: {{1}} işletme, {{2}} hizmet, {{3}} tarih-saat
 */
/**
 * Düğmeli şablonlar (sr_ ön ekli): gövde {{1}} işletme, {{2}} hizmet, {{3}} tarih, {{4}} saat; bağlantılar düğmede.
 * Onay/hatırlatma/değişiklik: düğme 0 "Randevumu Gör" → /randevu/{{1}}, düğme 1 "Randevu Değiştir" → /randevu-degistir/{{1}} (randevu anahtarı).
 * İptal: düğme 0 "Yeni Randevu Al" → /isletme/{{1}} (işletme adresi).
 */
export const BUTTON_TEMPLATES: Record<AppointmentMessageType, string> = {
  confirmation: "sr_randevu_onay",
  reminder: "sr_randevu_hatirlatma",
  cancellation: "sr_randevu_iptal",
  reschedule: "sr_randevu_degisiklik",
};

export function isButtonTemplate(name: string): boolean {
  return name.startsWith("sr_");
}

/** Düğmeli şablon gönderilebilir mi? Bağlantı parametresi boş olamaz (Meta reddeder → SMS'e düşer). */
export function buttonTemplateReady(type: AppointmentMessageType, params: TemplateParams): boolean {
  return type === "cancellation" ? Boolean(params.businessSlug?.trim()) : Boolean(params.publicToken?.trim());
}

export function buildTemplateMessage(type: AppointmentMessageType, to: string, params: TemplateParams, config: Pick<WhatsAppConfig, "templates" | "language">) {
  // Meta: değişken boş olamaz, satır sonu/sekme ve 4+ boşluk içeremez.
  const text = (value: string, fallback: string) => (value.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || fallback).slice(0, 200);
  const name = config.templates[type];
  if (isButtonTemplate(name)) {
    const body = [text(params.businessName, "İşletme"), text(params.serviceName, "Randevu"), text(params.dayText ?? params.dateText, "-"), text(params.timeText ?? "", "-")];
    const url = (index: number, value: string) => ({ type: "button", sub_type: "url", index: String(index), parameters: [{ type: "text", text: value }] });
    const buttons = type === "cancellation"
      ? [url(0, String(params.businessSlug ?? "").trim())]
      : [url(0, String(params.publicToken ?? "").trim()), url(1, String(params.publicToken ?? "").trim())];
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name,
        language: { code: config.language },
        components: [{ type: "body", parameters: body.map((value) => ({ type: "text", text: value })) }, ...buttons],
      },
    };
  }
  const values = [text(params.businessName, "İşletme"), text(params.serviceName, "Randevu"), text(params.dateText, "-")];
  if (type !== "cancellation") values.push(text(params.detailsUrl, "https://seninrandevun.com"));
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: config.templates[type],
      language: { code: config.language },
      components: [{ type: "body", parameters: values.map((value) => ({ type: "text", text: value })) }],
    },
  };
}

/** Meta webhook imzası: X-Hub-Signature-256 = "sha256=" + HMAC_SHA256(appSecret, rawBody). */
export function verifyWebhookSignature(rawBody: Buffer | string, header: unknown, appSecret: string): boolean {
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type WebhookStatus = { messageId: string; status: string; errorCode: number | null; errorTitle: string | null };

/** Webhook gövdesinden mesaj durumlarını çıkarır (sent/delivered/read/failed). */
export function extractStatuses(body: unknown): WebhookStatus[] {
  const out: WebhookStatus[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    for (const change of ((entry as { changes?: unknown[] })?.changes ?? [])) {
      const statuses = (change as { value?: { statuses?: unknown[] } })?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const raw of statuses) {
        const row = raw as { id?: unknown; status?: unknown; errors?: Array<{ code?: unknown; title?: unknown }> };
        if (typeof row.id !== "string" || typeof row.status !== "string") continue;
        const error = Array.isArray(row.errors) ? row.errors[0] : undefined;
        out.push({
          messageId: row.id,
          status: row.status,
          errorCode: error && Number.isFinite(Number(error.code)) ? Number(error.code) : null,
          errorTitle: error && typeof error.title === "string" ? error.title.slice(0, 200) : null,
        });
      }
    }
  }
  return out;
}

export type ReadinessCheck = { key: string; label: string; ok: boolean; blocking: boolean; detail: string };

/**
 * Kanalı açmadan önce kontrol listesi (süper admin WhatsApp paneli). blocking=true olanlar tamamlanmadan kanal açılmaz.
 * Görünen ad onayı engel değildir: Meta onay beklerken de şablon mesajlarını iletir (başlıkta numara görünür).
 */
export function whatsappReadiness(input: {
  settings: Record<string, unknown> | null | undefined;
  phone: { status?: string; name_status?: string; code_verification_status?: string } | null;
  templates: Array<{ name: string; status: string; language: string }> | null;
  requiredTemplates: string[];
  /**
   * Kanalın açılması için şart olan şablonlar (varsayılan: hepsi). Diğerleri onaysızken kanal yine açılır;
   * Meta onaysız şablonu anında reddeder ve o bildirim otomatik SMS'e düşer.
   */
  essentialTemplates?: string[];
  language: string;
}): { ready: boolean; checks: ReadinessCheck[] } {
  const s = input.settings ?? {};
  const has = (key: string, min = 1) => String(s[key] ?? "").trim().length >= min;
  const approved = new Set((input.templates ?? []).filter((t) => t.status === "APPROVED" && t.language === input.language).map((t) => t.name));
  const essential = new Set(input.essentialTemplates ?? input.requiredTemplates);
  const missingEssential = input.requiredTemplates.filter((name) => essential.has(name) && !approved.has(name));
  const missingOptional = input.requiredTemplates.filter((name) => !essential.has(name) && !approved.has(name));
  const checks: ReadinessCheck[] = [
    { key: "phoneNumberId", label: "Telefon numarası kimliği", ok: /^\d{6,}$/.test(String(s.phoneNumberId ?? "")), blocking: true, detail: "Firestore: phoneNumberId" },
    { key: "accessToken", label: "Kalıcı erişim anahtarı", ok: has("accessToken", 20), blocking: true, detail: "Sistem kullanıcısı token'ı (accessToken)" },
    { key: "appSecret", label: "Uygulama gizli anahtarı", ok: /^[0-9a-f]{32}$/.test(String(s.appSecret ?? "").trim()), blocking: true, detail: "Webhook imza doğrulaması (appSecret, 32 karakter)" },
    { key: "verifyToken", label: "Webhook doğrulama kelimesi", ok: has("verifyToken", 8), blocking: true, detail: "verifyToken" },
    {
      key: "phone", label: "Numara Meta'ya bağlı", ok: input.phone?.status === "CONNECTED", blocking: true,
      detail: input.phone ? `Durum: ${input.phone.status ?? "?"}` : "Meta'dan numara bilgisi alınamadı (token veya kimlik hatalı olabilir)",
    },
    {
      key: "templates", label: "Şablonlar onaylı", ok: missingEssential.length === 0, blocking: true,
      detail: missingEssential.length ? `Onay bekleyen/eksik: ${missingEssential.join(", ")}` : `${input.requiredTemplates.length - missingOptional.length} şablon onaylı`,
    },
    ...(missingOptional.length ? [{
      key: "templatesOptional", label: "Diğer şablonlar", ok: false, blocking: false,
      detail: `Onay bekleyen: ${missingOptional.join(", ")} — onaylanana kadar bu bildirimler SMS ile gider`,
    }] : []),
    {
      key: "displayName", label: "Görünen ad onayı", ok: input.phone?.name_status === "APPROVED", blocking: false,
      detail: input.phone?.name_status === "APPROVED" ? "Müşteriler işletme adını görür" : "Onay bekleniyor; bu sürede sohbet başlığında numara görünür",
    },
  ];
  return { ready: checks.every((check) => check.ok || !check.blocking), checks };
}

export type WhatsAppMessageRow = { status?: unknown; type?: unknown; errorCode?: unknown };

/** whatsappMessages kayıtlarından durum/tür dağılımı ve iletim oranı. */
export function summarizeWhatsAppMessages(rows: WhatsAppMessageRow[]) {
  const byStatus: Record<string, number> = { accepted: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  const byType: Record<string, number> = {};
  const errors: Record<string, number> = {};
  for (const row of rows) {
    const status = String(row.status ?? "accepted");
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    const type = String(row.type ?? "other");
    byType[type] = (byType[type] ?? 0) + 1;
    if (status === "failed" && row.errorCode !== null && row.errorCode !== undefined) errors[String(row.errorCode)] = (errors[String(row.errorCode)] ?? 0) + 1;
  }
  const total = rows.length;
  const reached = byStatus.delivered + byStatus.read;
  const settled = reached + byStatus.failed;
  return { total, byStatus, byType, errors, deliveryRate: settled ? Math.round((reached / settled) * 1000) / 10 : null, readRate: reached ? Math.round((byStatus.read / reached) * 1000) / 10 : null };
}

/* ── İşlem sonrası memnuniyet (sr_islem_sonrasi: {{1}} işletme, {{2}} hizmet; 3 hızlı yanıt) ─────────────────── */

export const FOLLOW_UP_TEMPLATE = "sr_islem_sonrasi";
/** Randevu "tamamlandı" olduktan sonra bekleme. */
export const FOLLOW_UP_DELAY_MS = 2 * 60 * 60_000;
/** Tamamlanmadan bu kadar süre geçtiyse anket gönderilmez (eski kayıt toplu tamamlanmış olabilir). */
export const FOLLOW_UP_MAX_AGE_MS = 24 * 60 * 60_000;

/** Hızlı yanıt metni → puan. Meta düğme metnini aynen geri gönderir. */
export function followUpRating(text: unknown): { rating: number; label: string } | null {
  const value = String(text ?? "").trim().toLocaleLowerCase("tr-TR");
  if (value === "harikaydı") return { rating: 5, label: "Harikaydı" };
  if (value === "iyiydi") return { rating: 4, label: "İyiydi" };
  if (value === "geliştirilebilir") return { rating: 2, label: "Geliştirilebilir" };
  return null;
}

export function buildFollowUpTemplate(to: string, params: { businessName: string; serviceName: string }, language: string, name = FOLLOW_UP_TEMPLATE) {
  const text = (value: string, fallback: string) => (value.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || fallback).slice(0, 200);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name,
      language: { code: language },
      components: [{ type: "body", parameters: [text(params.businessName, "İşletme"), text(params.serviceName, "Hizmet")].map((value) => ({ type: "text", text: value })) }],
    },
  };
}

export type IncomingReply = { messageId: string; from: string; contextId: string | null; text: string };

/** Webhook gövdesinden müşterinin düğme yanıtları (şablon hızlı yanıtı "button", etkileşimli "button_reply"). */
export function extractIncomingReplies(body: unknown): IncomingReply[] {
  const out: IncomingReply[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    for (const change of ((entry as { changes?: unknown[] })?.changes ?? [])) {
      const messages = (change as { value?: { messages?: unknown[] } })?.value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const raw of messages) {
        const row = raw as { id?: unknown; from?: unknown; type?: unknown; context?: { id?: unknown };
          button?: { text?: unknown; payload?: unknown }; interactive?: { button_reply?: { title?: unknown } } };
        if (typeof row.id !== "string" || typeof row.from !== "string") continue;
        const text = row.type === "button" ? row.button?.text ?? row.button?.payload
          : row.type === "interactive" ? row.interactive?.button_reply?.title : undefined;
        if (typeof text !== "string" || !text.trim()) continue;
        out.push({ messageId: row.id, from: row.from, contextId: typeof row.context?.id === "string" ? row.context.id : null, text: text.trim() });
      }
    }
  }
  return out;
}

/** İşletmenin Instagram değeri (kullanıcı adı, @ad ya da bağlantı) → profil adresi; geçersizse null. */
export function instagramProfileUrl(value: unknown): string | null {
  let handle = String(value ?? "").trim();
  if (!handle) return null;
  const match = /instagram\.com\/([^/?#\s]+)/i.exec(handle);
  if (match) handle = match[1]!;
  handle = handle.replace(/^@/, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://www.instagram.com/${handle}` : null;
}

/** Yanıta göre teşekkür metni (müşteri yazdıktan sonraki 24 saat içinde şablonsuz gönderilir). */
export function followUpThanksText(rating: number, businessName: string, storeUrl: string | null): string {
  if (rating >= 5) {
    return `Çok teşekkür ederiz! 💚 Güzel görüşünüzü ${businessName} ile paylaştık.${storeUrl ? `\n\nDeneyiminizi başkalarıyla paylaşmak isterseniz buradan yorum bırakabilirsiniz:\n${storeUrl}` : ""}`;
  }
  if (rating >= 4) return `Teşekkür ederiz! 💚 Görüşünüz ${businessName} ile paylaşıldı. Sizi yeniden görmek isteriz.`;
  return `Geri bildiriminiz için teşekkürler. 🙏 Görüşünüz ${businessName} ile paylaşıldı; bir dahaki ziyaretinizde daha iyi bir deneyim için çalışacağız.`;
}

export function buildTextMessage(to: string, body: string) {
  return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: true, body: body.slice(0, 4000) } };
}

/** Tek bağlantı düğmeli etkileşimli mesaj (yalnız müşterinin yazdığı 24 saatlik pencerede). */
export function buildCtaUrlMessage(to: string, body: string, buttonText: string, url: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: { type: "cta_url", body: { text: body.slice(0, 1024) }, action: { name: "cta_url", parameters: { display_text: buttonText.slice(0, 20), url } } },
  };
}
