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

export const DEFAULT_TEMPLATES: Record<AppointmentMessageType, string> = {
  confirmation: "randevu_onay",
  reminder: "randevu_hatirlatma",
  cancellation: "randevu_iptal",
  reschedule: "randevu_degisiklik",
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

export type TemplateParams = { businessName: string; serviceName: string; dateText: string; detailsUrl: string };

/**
 * Şablon gövde değişkenleri (Meta'da şablonlar bu sırayla oluşturulmalı):
 *   onay / hatırlatma / değişiklik: {{1}} işletme, {{2}} hizmet, {{3}} tarih-saat, {{4}} randevu bağlantısı
 *   iptal: {{1}} işletme, {{2}} hizmet, {{3}} tarih-saat
 */
export function buildTemplateMessage(type: AppointmentMessageType, to: string, params: TemplateParams, config: Pick<WhatsAppConfig, "templates" | "language">) {
  // Meta: değişken boş olamaz, satır sonu/sekme ve 4+ boşluk içeremez.
  const text = (value: string, fallback: string) => (value.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || fallback).slice(0, 200);
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
  language: string;
}): { ready: boolean; checks: ReadinessCheck[] } {
  const s = input.settings ?? {};
  const has = (key: string, min = 1) => String(s[key] ?? "").trim().length >= min;
  const approved = new Set((input.templates ?? []).filter((t) => t.status === "APPROVED" && t.language === input.language).map((t) => t.name));
  const missingTemplates = input.requiredTemplates.filter((name) => !approved.has(name));
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
      key: "templates", label: "Şablonlar onaylı", ok: missingTemplates.length === 0, blocking: true,
      detail: missingTemplates.length ? `Onay bekleyen/eksik: ${missingTemplates.join(", ")}` : `${input.requiredTemplates.length} şablon onaylı`,
    },
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
