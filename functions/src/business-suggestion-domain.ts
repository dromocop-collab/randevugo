// Müşterinin önerdiği işletmeler — saf yardımcılar. Test: business-suggestion-domain.test.mjs
// Boş şehir sayfası ve sonuçsuz keşif ekranındaki formdan gelir: businessSuggestions/{ad+şehir özeti}.
// Aynı işletmeyi önerenler tek kayıtta toplanır (votes). Süper admin › İşletme Önerileri'nden aranır.
// Öneren kişiden kişisel bilgi alınmaz; telefon yalnız işletmenin kendi numarasıdır ve isteğe bağlıdır.

import { createHash } from "crypto";
import { fold, PROVINCES } from "./whatsapp-signup-domain.js";

export type BusinessSuggestion = {
  id: string; businessName: string; city: string; district: string; category: string; phone: string | null;
};

const text = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** 0XXX… / +90XXX… → 90XXXXXXXXXX (sabit hat ya da cep). Geçersizse null. */
export function suggestionPhone(raw: unknown): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return /^[2-5]\d{9}$/.test(digits) ? `90${digits}` : null;
}

/** Geçersizse null: işletme adı en az 2 harf, şehir 81 ilden biri; numara yazıldıysa geçerli olmalı; gizli alan (bot) boş olmalı. */
export function parseBusinessSuggestion(raw: unknown): BusinessSuggestion | null {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  if (typeof data.website === "string" && data.website.trim()) return null;
  const businessName = text(data.businessName, 100);
  if (fold(businessName).replace(/[^a-z]/g, "").length < 2) return null;
  const city = PROVINCES.find((item) => fold(item) === fold(text(data.city, 40)));
  if (!city) return null;
  const hasPhone = text(data.phone, 30).length > 0;
  const phone = hasPhone ? suggestionPhone(data.phone) : null;
  if (hasPhone && !phone) return null;
  const category = /^[a-z0-9-]{1,40}$/.test(String(data.category ?? "")) ? String(data.category) : "";
  const id = createHash("sha256").update(`${fold(businessName)}|${fold(city)}`).digest("hex").slice(0, 32);
  return { id, businessName, city, district: text(data.district, 60), category, phone };
}
