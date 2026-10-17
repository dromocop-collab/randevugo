import { createHash } from "crypto";

// İşletme konumu (Keşfet → "Yakınımdaki işletmeler") — saf yardımcılar. Test: geo-domain.test.mjs
// Konum adresten sunucuda bulunur (OpenStreetMap Nominatim); işletme istemciden "geo" yazamaz (firestore.rules).

export type GeoPrecision = "pin" | "address" | "district" | "city";
export type BusinessGeo = { lat: number; lng: number; precision: GeoPrecision; fingerprint: string };

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Adres alanları değişmediyse yeniden konum aranmaz. */
export function addressFingerprint(business: { address?: unknown; district?: unknown; city?: unknown }) {
  const text = [business.address, business.district, business.city].map((item) => clean(item).toLocaleLowerCase("tr-TR")).join("|");
  return createHash("sha256").update(text).digest("hex").slice(0, 24);
}

/** En ayrıntılıdan en kabaya arama sorguları: açık adres → ilçe → il. */
export function geocodeQueries(business: { address?: unknown; district?: unknown; city?: unknown }): Array<{ q: string; precision: GeoPrecision }> {
  const address = clean(business.address);
  const district = clean(business.district);
  const city = clean(business.city);
  if (!city) return [];
  const out: Array<{ q: string; precision: GeoPrecision }> = [];
  if (address) {
    out.push({ q: [address, district, city, "Türkiye"].filter(Boolean).join(", "), precision: "address" });
    // Bina no / kat / daire OSM'de çoğu zaman yok: numarasız sokak/mahalle ile tekrar dene.
    const street = address.replace(/\b(no|numara|kat|daire|d)\s*[:.]?\s*\d[\d/a-z-]*/giu, " ").replace(/\b\d+[/\w-]*/g, " ").replace(/[,\s]+/g, " ").trim();
    if (street && street !== address) out.push({ q: [street, district, city, "Türkiye"].filter(Boolean).join(", "), precision: "address" });
  }
  if (district) out.push({ q: [district, city, "Türkiye"].join(", "), precision: "district" });
  out.push({ q: `${city}, Türkiye`, precision: "city" });
  return out;
}

/** Nominatim yanıtından ilk geçerli Türkiye koordinatı. */
export function parseNominatim(body: unknown): { lat: number; lng: number } | null {
  if (!Array.isArray(body) || !body.length) return null;
  const lat = Number((body[0] as { lat?: unknown }).lat);
  const lng = Number((body[0] as { lon?: unknown }).lon);
  // Türkiye sınırlarının kaba kutusu: yanlış ülkeden eşleşmeyi reddeder.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 35.5 || lat > 42.5 || lng < 25.5 || lng > 45) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/** İki nokta arası kuş uçuşu mesafe (km). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Türkiye'nin kaba sınır kutusu. */
export function isInTurkey(point: { lat: number; lng: number }) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && point.lat >= 35.5 && point.lat <= 42.5 && point.lng >= 25.5 && point.lng <= 45;
}

export const MAX_PIN_DISTANCE_KM = 40;

/**
 * İşletmenin haritada elle koyduğu pin: Türkiye içinde ve (biliniyorsa) ilçe/il merkezine en fazla 40 km.
 * Böylece keşifte "yakınımdaki" sıralaması başka şehre taşınarak oynanamaz.
 */
export function validateOwnerPin(input: { lat: unknown; lng: unknown }, reference: { lat: number; lng: number } | null): { lat: number; lng: number } | string {
  const point = { lat: Number(input.lat), lng: Number(input.lng) };
  if (!isInTurkey(point)) return "Konum Türkiye sınırları içinde olmalı.";
  if (reference && distanceKm(point, reference) > MAX_PIN_DISTANCE_KM) return `Konum, adresteki ilçeye en fazla ${MAX_PIN_DISTANCE_KM} km uzaklıkta olabilir. Adresiniz değiştiyse önce adresi güncelleyin.`;
  return { lat: Math.round(point.lat * 1e6) / 1e6, lng: Math.round(point.lng * 1e6) / 1e6 };
}
