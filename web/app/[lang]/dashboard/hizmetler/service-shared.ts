import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import type { Service, ServiceTranslations } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";

export const CATEGORY_COLORS = [
  "#0ea5e9", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#d946ef", "#6366f1", "#64748b",
];

export const CATEGORY_ICONS = [
  "✂️", "🎨", "💆", "💅", "🏋️", "🩺", "📋", "🐾",
  "📚", "🔧", "💄", "🧴", "👁️", "🦷", "💉", "🧘",
  "🪒", "🧔", "💨", "🌈", "✨", "🔗", "👰", "🥊",
  "💪", "🧠", "💼", "⚖️", "📊", "🌍", "💻", "📝",
];

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export type ServiceStatusFilter = "all" | "live" | "paused" | "draft";

export function serviceStatus(service: Service): Exclude<ServiceStatusFilter, "all"> {
  if (service.templateDraft && !service.isActive) return "draft";
  return service.isActive ? "live" : "paused";
}

export function bySortOrder<T extends { sortOrder?: number; name?: string; fullName?: string }>(a: T, b: T) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name ?? a.fullName ?? "").localeCompare(String(b.name ?? b.fullName ?? ""), "tr");
}

/** Komşu iki öğenin yerini değiştirir ve değişen sıra numaralarını döndürür (sürüklemesiz sıralama). */
export function reorderPatch<T extends { id: string; sortOrder?: number }>(ordered: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= ordered.length) return [];
  const next = [...ordered];
  [next[index], next[target]] = [next[target], next[index]];
  return next
    .map((item, position) => ({ id: item.id, sortOrder: position, changed: item.sortOrder !== position }))
    .filter((item) => item.changed)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
}

export function formatPrice(value: number) {
  return `${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

export type StaffOverride = NonNullable<Staff["serviceOverrides"]>[string];

/** Firestore tanımsız değerleri kabul etmez; boş özel süre/fiyat kayıtlarını temizler. */
export function cleanOverrides(overrides: Staff["serviceOverrides"] = {}) {
  const result: Record<string, StaffOverride> = {};
  Object.entries(overrides).forEach(([serviceId, value]) => {
    if (!value) return;
    const entry: StaffOverride = {};
    if (typeof value.durationMinutes === "number" && Number.isFinite(value.durationMinutes) && value.durationMinutes > 0) entry.durationMinutes = value.durationMinutes;
    if (typeof value.price === "number" && Number.isFinite(value.price) && value.price >= 0) entry.price = value.price;
    if (Object.keys(entry).length) result[serviceId] = entry;
  });
  return result;
}

export function categoryName(categories: ServiceCategory[], id: string) {
  return categories.find((item) => item.id === id)?.name ?? "Kategorisiz";
}

/** Varsayılan dil (Türkçe) dışındaki diller — işletme metinlerinin karşılık girilebilen dilleri. */
export const TRANSLATION_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE) as Locale[];

/** Bir dilin hizmet metinleri (düzenleyici taslağı). */
export type ServiceTextDraft = { name: string; description: string; variants: Record<string, string> };

/**
 * Hizmetin dil karşılıklarına bir dilin elle düzeltilmiş metinlerini yazar (manual: true → sunucu otomatik
 * çeviriyle ezmez). Boş alanlar kaydedilmez; dil tamamen boşsa o dil silinir (sunucu yeniden otomatik çevirir).
 * Firestore tanımsız değer kabul etmediği için yalnız dolu alanlar yazılır.
 */
export function withManualServiceTranslation(existing: ServiceTranslations | undefined, locale: string, draft: Partial<ServiceTextDraft>, variantIds: string[]): ServiceTranslations {
  const next: ServiceTranslations = {};
  Object.entries(existing ?? {}).forEach(([key, value]) => { if (value && key !== locale) next[key] = value; });
  const entry: { name?: string; description?: string; variants?: Record<string, string>; manual?: boolean } = {};
  const name = draft.name?.trim();
  const description = draft.description?.trim();
  if (name) entry.name = name;
  if (description) entry.description = description;
  const variants: Record<string, string> = {};
  Object.entries(draft.variants ?? {}).forEach(([id, value]) => {
    const text = value?.trim();
    if (text && variantIds.includes(id)) variants[id] = text;
  });
  if (Object.keys(variants).length) entry.variants = variants;
  if (Object.keys(entry).length) next[locale] = { ...entry, manual: true };
  return next;
}
