import "server-only";
import type { Locale, Messages } from "./config";
import en from "./bundles/en";

// Sunucu tarafı sözlükler (getT). İstemci aynı paketleri client.tsx içinde ayrı dosya olarak yükler;
// böylece sözlük her sayfanın HTML'ine gömülmez ve Türkçe ziyaretçi hiç indirmez.
// Yeni dil: bundles/<dil>.ts oluştur, burada ve client.tsx'teki LOADERS'ta kaydet.
const DICTIONARIES: Partial<Record<Locale, Messages>> = { en };

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? {};
}
