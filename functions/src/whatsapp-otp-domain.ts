// Doğrulama kodu WhatsApp'tan (Meta "Authentication" şablonu), olmazsa SMS ile. Test: whatsapp-otp-domain.test.mjs
// Şablon Süper Admin › WhatsApp karşılama ekranındaki "Şablonları onaya gönder" ile birlikte Meta'ya gönderilir.

export const OTP_TEMPLATE_NAME = "sr_dogrulama_kodu";
export const OTP_TTL_MINUTES = 5;

/** Meta'nın authentication şablonu: gövde metni sabittir, kod ve "Kodu kopyala" düğmesi Meta tarafından oluşturulur. */
export function otpTemplateCreatePayload(language: string) {
  return {
    name: OTP_TEMPLATE_NAME,
    language,
    category: "AUTHENTICATION",
    components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: OTP_TTL_MINUTES },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Kodu kopyala" }] },
    ],
  };
}

/** Gönderim yükü: kod hem gövdeye hem kopyala düğmesine aynı parametreyle gider (Meta zorunluluğu). */
export function otpTemplateMessage(to: string, code: string, language: string) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: OTP_TEMPLATE_NAME,
      language: { code: language },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
      ],
    },
  };
}

export type OtpChannel = "whatsapp" | "sms";

/**
 * Kanal ve bekleme kuralı:
 * - İstemci "sms" isterse SMS (WhatsApp gelmediyse); WhatsApp'tan sonra SMS'e geçiş 20 sn sonra serbest.
 * - Aksi halde WhatsApp hazırsa WhatsApp, değilse SMS.
 * - Aynı kanaldan tekrar gönderme 60 sn bekler.
 */
export function otpSendPlan(input: {
  requested: unknown;
  whatsappReady: boolean;
  previousProvider: string | null;
  secondsSinceLast: number | null;
}): { channel: OtpChannel; waitSeconds: number } {
  const wantsSms = input.requested === "sms";
  const channel: OtpChannel = wantsSms || !input.whatsappReady ? "sms" : "whatsapp";
  const switchingToSms = channel === "sms" && input.previousProvider === "whatsapp";
  const gap = switchingToSms ? 20 : 60;
  const since = input.secondsSinceLast;
  const waitSeconds = since === null || since >= gap ? 0 : Math.ceil(gap - since);
  return { channel, waitSeconds };
}
