"use client";

import type { ReactNode } from "react";
import { trackPixel } from "@/features/attribution/attribution";

// WhatsApp'tan kayıt botu (functions/src/whatsapp-signup-domain.ts) bu numarada çalışır (Meta Cloud API, Senin Randevun).
// Hazır mesaj isSignupIntent'e takılır ("işletmemi", "kaydetmek"); bot adım adım sorup hesabı açar.
// Süper admin › WhatsApp Gelen › "WhatsApp'tan kayıt" kapalıysa bot cevap vermez, mesaj gelen kutusuna düşer.
export const SIGNUP_WHATSAPP_NUMBER = "905449788298";
// Bot Türkçe konuşur; mesaj dil seçiminden bağımsız Türkçe kalır ki niyet eşleşsin. i18n-ignore
const SIGNUP_TEXT = "Merhaba, işletmemi ücretsiz kaydetmek istiyorum";

export function WhatsAppSignupLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a
      className={className}
      href={`https://wa.me/${SIGNUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(SIGNUP_TEXT)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackPixel("Contact", `wa-signup-${crypto.randomUUID()}`)}
    >
      {children}
    </a>
  );
}
