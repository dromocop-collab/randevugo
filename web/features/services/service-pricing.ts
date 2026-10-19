// Hizmet fiyat tipi, seçenekler ve dil karşılıkları — arayüz yardımcıları.
// Sunucudaki karşılığı: functions/src/service-pricing-domain.ts (kurallar senkron tutulmalı).
import { tk, type Locale, type TFunction } from "@/i18n/config";
import type { Appointment } from "@/types/appointments";
import type { Service, ServicePriceType, ServiceVariant } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";

export const MAX_SERVICE_VARIANTS = 8;

export const PRICE_TYPE_OPTIONS: Array<{ value: ServicePriceType; label: string; hint: string }> = [
  { value: "fixed", label: tk("Sabit fiyat"), hint: tk("Her müşteri aynı tutarı öder.") },
  { value: "from", label: tk("Başlangıç fiyatı"), hint: tk("“750 ₺'den başlayan” olarak görünür; kesin tutarı iş bitince girersiniz.") },
  { value: "range", label: tk("Fiyat aralığı"), hint: tk("“500–900 ₺” olarak görünür; kesin tutarı iş bitince girersiniz.") },
  { value: "quote", label: tk("Görüşmede belirlenir"), hint: tk("Fiyat gösterilmez; kesin tutarı iş bitince girersiniz.") },
];

export function priceTypeOf(service: Pick<Service, "priceType"> | null | undefined): ServicePriceType {
  const value = service?.priceType;
  return value === "from" || value === "range" || value === "quote" ? value : "fixed";
}

/** Geçerli seçenekler; aralık/teklif fiyatında seçenek kullanılmaz (sunucu da yok sayar). */
export function variantsOf(service: Pick<Service, "variants" | "priceType"> | null | undefined): ServiceVariant[] {
  const type = priceTypeOf(service);
  if (!service?.variants?.length || type === "range" || type === "quote") return [];
  return service.variants.filter((item) => item && item.id && item.name && Number.isFinite(item.price) && item.durationMinutes >= 5).slice(0, MAX_SERVICE_VARIANTS);
}

export function newVariantId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type Money = (value: number) => string;

/** Tutar biçimi: "1.250 ₺" (etkin dilin sayı biçimiyle). */
export function moneyFormatter(intlLocale: string): Money {
  return (value) => `${Math.round(value).toLocaleString(intlLocale)} ₺`;
}

/**
 * Listelerde gösterilecek fiyat etiketi.
 * Seçenekli hizmette en düşük seçenek "…'den başlayan" olarak gösterilir (tek seçenekse o tutar).
 */
export function servicePriceLabel(service: Pick<Service, "price" | "priceType" | "priceMax" | "variants">, t: TFunction, money: Money): string {
  const type = priceTypeOf(service);
  if (type === "quote") return t("Fiyat görüşmede");
  if (type === "range") return t("{min} – {max}", { min: money(service.price), max: money(Math.max(service.price, service.priceMax ?? service.price)) });
  const variants = variantsOf(service);
  if (variants.length > 0) {
    const prices = variants.map((item) => item.price);
    const min = Math.min(...prices);
    const same = prices.every((value) => value === min);
    return same && type === "fixed" ? money(min) : t("{price}'den başlayan", { price: money(min) });
  }
  return type === "from" ? t("{price}'den başlayan", { price: money(service.price) }) : money(service.price);
}

/** Seçenek fiyat etiketi (başlangıç fiyatlı hizmette "…'den"). */
export function variantPriceLabel(service: Pick<Service, "priceType">, variant: ServiceVariant, t: TFunction, money: Money): string {
  return priceTypeOf(service) === "from" ? t("{price}'den başlayan", { price: money(variant.price) }) : money(variant.price);
}

/** Randevudaki fiyat etiketi; kesin tutar girildiyse (tamamlanmış/tahsil edilmiş) tutarın kendisi. */
export function appointmentPriceLabel(appointment: Pick<Appointment, "servicePrice" | "servicePriceType" | "servicePriceMax" | "servicePriceFinal" | "status">, t: TFunction, money: Money): string {
  const type = appointment.servicePriceType ?? "fixed";
  const price = Number(appointment.servicePrice ?? 0);
  if (type === "fixed" || appointment.servicePriceFinal || appointment.status === "completed") return money(price);
  if (type === "quote") return t("Fiyat görüşmede");
  if (type === "range") return t("{min} – {max}", { min: money(price), max: money(Math.max(price, appointment.servicePriceMax ?? price)) });
  return t("{price}'den başlayan", { price: money(price) });
}

/** Kesin tutarın iş bitince girilmesi gereken randevu mu? */
export function needsFinalPrice(appointment: Pick<Appointment, "servicePriceType" | "servicePriceFinal" | "status">): boolean {
  const type = appointment.servicePriceType ?? "fixed";
  return type !== "fixed" && !appointment.servicePriceFinal && appointment.status !== "completed";
}

/** Ek hizmetlerin toplamı (kesin tutar girerken ana hizmet payını ayırmak için). */
export function extrasTotal(appointment: Pick<Appointment, "additionalServices">): number {
  return (appointment.additionalServices ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.price) || 0), 0);
}

/* ── İşletmenin girdiği metinlerin dil karşılıkları ─────────────────────────── */

export function localizedServiceName(service: Pick<Service, "name" | "translations">, locale: Locale): string {
  return service.translations?.[locale]?.name?.trim() || service.name;
}

export function localizedServiceDescription(service: Pick<Service, "description" | "translations">, locale: Locale): string {
  return service.translations?.[locale]?.description?.trim() || service.description;
}

export function localizedVariantName(service: Pick<Service, "translations">, variant: ServiceVariant, locale: Locale): string {
  return service.translations?.[locale]?.variants?.[variant.id]?.trim() || variant.name;
}

export function localizedCategoryName(category: Pick<ServiceCategory, "name" | "translations">, locale: Locale): string {
  return category.translations?.[locale]?.name?.trim() || category.name;
}

/** Randevudaki hizmet adı (kayıt anındaki dil karşılığı varsa o). */
export function localizedAppointmentServiceName(appointment: Pick<Appointment, "serviceName" | "serviceNameTranslations">, locale: Locale): string {
  return appointment.serviceNameTranslations?.[locale]?.trim() || appointment.serviceName || "";
}
