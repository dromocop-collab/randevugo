// Tek randevuda birden fazla hizmet (ana hizmet + ek hizmetler) — saf yardımcılar. Test: multi-service-domain.test.mjs
// Web karşılığı: web/features/services/multi-service.ts (birleşik fiyat/süre mantığı iki dosyada senkron tutulmalı).
//
// Veri modeli (mevcut, updateAppointmentServices ile aynı): serviceId/serviceName ana hizmet; additionalServices
// [{ serviceId, name, price, durationMinutes, priceType?, priceMax?, variantId? }]; servicePrice ve
// serviceDurationMinutes TOPLAM; primaryServicePrice/primaryServiceDurationMinutes ana hizmet payı.
// Eski istemciler ve mobil uygulamalar additionalServices göndermez → davranış değişmez.

import type { ServicePriceType } from "./service-pricing-domain.js";

/** Ana hizmetin yanına en fazla bu kadar ek hizmet seçilebilir (toplam 5 hizmet). */
export const MAX_EXTRA_SERVICES = 4;
/** Bir randevunun toplam süresi (slot motoru 8 saatten uzun süreyi desteklemez). */
export const MAX_COMBINED_DURATION_MINUTES = 480;

export type ExtraServiceRequest = { serviceId: string; variantId?: string };

/**
 * İstemciden gelen ek hizmet listesi. Ana hizmet ve tekrarlar atılır; biçimi bozuk öğe sessizce atlanmaz,
 * hata verilir (müşteri seçtiğinin kaybolduğunu fark etmeden randevu almasın).
 */
export function parseExtraServiceRequests(value: unknown, primaryServiceId: string): ExtraServiceRequest[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Ek hizmet listesi geçersiz.");
  const seen = new Set<string>([primaryServiceId]);
  const rows: ExtraServiceRequest[] = [];
  for (const raw of value) {
    const row = typeof raw === "string" ? { serviceId: raw } : raw && typeof raw === "object" ? raw as Record<string, unknown> : null;
    const serviceId = typeof row?.serviceId === "string" ? row.serviceId.trim() : "";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(serviceId)) throw new Error("Ek hizmet listesi geçersiz.");
    if (seen.has(serviceId)) continue;
    seen.add(serviceId);
    const variantId = typeof row?.variantId === "string" && row.variantId.trim() ? row.variantId.trim() : undefined;
    rows.push(variantId ? { serviceId, variantId } : { serviceId });
  }
  if (rows.length > MAX_EXTRA_SERVICES) throw new Error(`Bir randevuda en fazla ${MAX_EXTRA_SERVICES + 1} hizmet seçilebilir.`);
  return rows;
}

/** Personel bu hizmeti verebilir mi? (loadBookingContext'teki kuralla aynı: önce branş, sonra hizmet listesi.) */
export function staffCanProvide(
  staff: { serviceIds?: unknown; specialtyCategoryIds?: unknown } | null | undefined,
  serviceId: string,
  category: unknown,
): boolean {
  if (!staff) return true;
  const serviceIds = Array.isArray(staff.serviceIds) ? staff.serviceIds.map(String) : [];
  const categories = Array.isArray(staff.specialtyCategoryIds) ? staff.specialtyCategoryIds.map(String) : [];
  if (categories.length > 0 && !categories.includes(String(category ?? ""))) return false;
  return serviceIds.length === 0 || serviceIds.includes(serviceId);
}

export type PricePart = { price: number; priceType: ServicePriceType; priceMax?: number | null };

/**
 * Birden fazla hizmetin birleşik fiyat görüntüsü. price "en az" toplamdır (teklif = 0).
 * Hepsi sabit → sabit; yalnız sabit + aralık → aralık (üst sınırlar toplanır); hepsi teklif → teklif;
 * diğer karışımlar → "…'den başlayan" (kesin tutar işletmede girilir).
 */
export function combinePriceParts(parts: PricePart[]): { servicePrice: number; servicePriceType: ServicePriceType; servicePriceMax?: number } {
  const clean = parts.map((part) => {
    const price = part.priceType === "quote" ? 0 : Math.max(0, Number(part.price) || 0);
    const max = part.priceType === "range" ? Math.max(price, Number(part.priceMax) || 0) : price;
    return { price, max, type: part.priceType };
  });
  const servicePrice = round(clean.reduce((sum, part) => sum + part.price, 0));
  const types = new Set(clean.map((part) => part.type));
  if (types.size === 0 || (types.size === 1 && types.has("fixed"))) return { servicePrice, servicePriceType: "fixed" };
  if (types.size === 1 && types.has("quote")) return { servicePrice: 0, servicePriceType: "quote" };
  if ([...types].every((type) => type === "fixed" || type === "range")) {
    return { servicePrice, servicePriceType: "range", servicePriceMax: round(clean.reduce((sum, part) => sum + part.max, 0)) };
  }
  return { servicePrice, servicePriceType: "from" };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** Bildirim/SMS için kısa hizmet özeti: "Saç kesimi + Sakal" ya da sığmazsa "Saç kesimi +2 hizmet". */
export function appointmentServiceSummary(serviceName: unknown, additionalServices: unknown, max = 70): string {
  const primary = String(serviceName ?? "").trim();
  const extras = Array.isArray(additionalServices)
    ? additionalServices.flatMap((item) => {
        const name = item && typeof item === "object" ? String((item as Record<string, unknown>).name ?? "").trim() : "";
        return name ? [name] : [];
      })
    : [];
  const names = [primary, ...extras].filter(Boolean);
  if (names.length === 0) return "";
  const full = names.join(" + ");
  if (full.length <= max) return full;
  const head = names[0]!;
  const rest = names.length - 1;
  if (rest === 0) return `${head.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
  const suffix = ` +${rest} hizmet`;
  return head.length + suffix.length <= max ? `${head}${suffix}` : `${head.slice(0, Math.max(1, max - suffix.length - 1)).trimEnd()}…${suffix}`;
}
