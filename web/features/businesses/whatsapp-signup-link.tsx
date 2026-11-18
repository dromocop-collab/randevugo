"use client";

import { useEffect, useState, type ReactNode } from "react";
import { trackAction } from "@/features/analytics/track-action";
import { readReferralCode } from "@/features/referral/referral";

// WhatsApp'tan kayıt botu (functions/src/whatsapp-signup-domain.ts) bu numarada çalışır (Meta Cloud API, Senin Randevun).
// Hazır mesaj isSignupIntent'e takılır ("işletmemi", "kaydetmek"); bot adım adım sorup hesabı açar.
// Süper admin › WhatsApp Gelen › "WhatsApp'tan kayıt" kapalıysa bot cevap vermez, mesaj gelen kutusuna düşer.
export const SETUP_HELP_TEXT = "Merhaba, kurulumu sizin yapmanızı istiyorum"; // i18n-ignore
export const SIGNUP_WHATSAPP_NUMBER = "905449788298";
// Bot Türkçe konuşur; mesaj dil seçiminden bağımsız Türkçe kalır ki niyet eşleşsin. i18n-ignore
const SIGNUP_TEXT = "Merhaba, işletmemi ücretsiz kaydetmek istiyorum";

/** text verilirse (ör. kurulum yardımı) kayıt botu başlamaz, mesaj gelen kutusuna düşer. */
export function WhatsAppSignupLink({ className, children, text = SIGNUP_TEXT }: { className?: string; children: ReactNode; text?: string }) {
  // Davet linkiyle (?ref=) gelindiyse kayıt mesajına kod eklenir; bot "Davet kodu KOD"u tanır.
  const [message, setMessage] = useState(text);
  useEffect(() => {
    const code = text === SIGNUP_TEXT ? readReferralCode() : null;
    queueMicrotask(() => setMessage(code ? `${SIGNUP_TEXT} · Davet kodu ${code}` : text)); // i18n-ignore — bot Türkçe
  }, [text]);
  return (
    <a
      className={className}
      href={`https://wa.me/${SIGNUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackAction("signup:whatsapp")}
    >
      {children}
    </a>
  );
}
