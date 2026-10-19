import type { Service } from "@/types/service";
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
