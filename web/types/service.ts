import type { EntityBase } from "@/types/common";

/** fixed: "750 ₺" · from: "750 ₺'den başlayan" · range: "500–900 ₺" · quote: "Fiyat görüşmede belirlenir". */
export type ServicePriceType = "fixed" | "from" | "range" | "quote";

/** Seçenek: kendi fiyatı ve süresi olan alt seçim (ör. kısa / orta / uzun saç). */
export interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

/** Dil kodu → işletmenin girdiği metnin karşılığı (ör. en). Boş alan Türkçe metne düşer. */
/** auto: sunucu otomatik çevirdi · manual: işletme elle düzeltti (otomatik çeviri ezmez). */
export type ServiceTranslations = Partial<Record<string, { name?: string; description?: string; variants?: Record<string, string>; auto?: boolean; manual?: boolean; sourceHash?: string }>>;

export interface Service extends EntityBase {
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  currency: "TRY" | "USD" | "EUR";
  isActive: boolean;
  isBookableOnline: boolean;
  requiresDeposit: boolean;
  depositAmount: number;
  assignableStaffIds: string[];
  imageUrl?: string;
  /** Yoksa "fixed". price her zaman en düşük/başlangıç tutarıdır (mobil uygulamalar yalnız bunu okur). */
  priceType?: ServicePriceType;
  /** Yalnız "range" için üst sınır. */
  priceMax?: number;
  /** Seçenekler (en fazla 8). Aralık/teklif fiyatında kullanılmaz. */
  variants?: ServiceVariant[];
  translations?: ServiceTranslations;
  sortOrder: number;
  templateSource?: string;
  templateKey?: string;
  templateDraft?: boolean;
}
