// Tek randevuda birden fazla hizmet — birleşik fiyat/süre. Sunucu karşılığı: functions/src/multi-service-domain.ts
// (combinePriceParts iki dosyada aynı kalmalı). Test: multi-service.test.mjs
import type { TFunction } from "@/i18n/config";
import type { Service, ServicePriceType, ServiceVariant } from "@/types/service";

/** Ana hizmetin yanına en fazla bu kadar ek hizmet (toplam 5). */
export const MAX_EXTRA_SERVICES = 4;
/** Toplam süre sınırı (saat motoru 8 saatten uzun randevuyu desteklemez). */
export const MAX_COMBINED_DURATION_MINUTES = 480;

export type PricePart = { price: number; priceType: ServicePriceType; priceMax?: number | null };
export type CombinedPrice = { servicePrice: number; servicePriceType: ServicePriceType; servicePriceMax?: number };

/** Hepsi sabit → sabit; sabit + aralık → aralık; hepsi teklif → teklif; diğer karışımlar → "…'den başlayan". */
export function combinePriceParts(parts: PricePart[]): CombinedPrice {
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

/** Seçili hizmetin (ve seçeneğinin) fiyat parçası. */
export function servicePricePart(service: Pick<Service, "price" | "priceType" | "priceMax">, variant?: ServiceVariant | null): PricePart {
  const priceType = service.priceType === "from" || service.priceType === "range" || service.priceType === "quote" ? service.priceType : "fixed";
  return { price: variant?.price ?? service.price, priceType, priceMax: priceType === "range" ? service.priceMax : null };
}

/** Birleşik fiyat etiketi (randevudaki appointmentPriceLabel ile aynı biçim). */
export function combinedPriceLabel(combined: CombinedPrice, t: TFunction, money: (value: number) => string): string {
  if (combined.servicePriceType === "quote") return t("Fiyat görüşmede");
  if (combined.servicePriceType === "range") return t("{min} – {max}", { min: money(combined.servicePrice), max: money(Math.max(combined.servicePrice, combined.servicePriceMax ?? combined.servicePrice)) });
  if (combined.servicePriceType === "from") return t("{price}'den başlayan", { price: money(combined.servicePrice) });
  return money(combined.servicePrice);
}

/** Randevudaki ek hizmet satırının fiyat etiketi (eski satırlarda tip yok → sabit). */
export function extraLinePriceLabel(line: { price: number; priceType?: ServicePriceType; priceMax?: number }, t: TFunction, money: (value: number) => string): string {
  return combinedPriceLabel({ servicePrice: Math.max(0, Number(line.price) || 0), servicePriceType: line.priceType ?? "fixed", servicePriceMax: line.priceMax }, t, money);
}
