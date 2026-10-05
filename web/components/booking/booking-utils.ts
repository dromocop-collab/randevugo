import { format } from "date-fns";
import type { Staff } from "@/types/staff";

export function formatServiceDuration(minutes: number) {
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} gün`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} saat`;
  if (minutes > 60) return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
  return `${minutes} dk`;
}

export function formatPrice(value: number) {
  return `${value.toLocaleString("tr-TR")} ₺`;
}

export function expertiseLabel(level: Staff["expertiseLevel"]) {
  if (level === "trainer") return "Eğitmen / Usta";
  if (level === "senior") return "Kıdemli uzman";
  if (level === "junior") return "Gelişen uzman";
  return "Uzman";
}

export function displayName(value: string) {
  return value.trim().split(/\s+/).map((part) => part ? `${part.charAt(0).toLocaleUpperCase("tr-TR")}${part.slice(1).toLocaleLowerCase("tr-TR")}` : part).join(" ");
}

export function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase("tr-TR")).join("") || "?";
}

export function publicStaffBio(value?: string) {
  const bio = value?.trim() ?? "";
  if (bio.length < 20 || /^(test|demo|deneme|lorem|x+|k+)$/i.test(bio)) return "";
  return bio;
}

export function istanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToIso(value: string, days: number) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}

export function normalizeTurkishPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("905")) return `+${digits}`;
  return value.trim();
}

export function isValidTurkishPhone(value: string) {
  return /^\+905\d{9}$/.test(normalizeTurkishPhone(value));
}

export function isValidOptionalEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** "+905321234567" → "0532 *** ** 67" (doğrulama ekranında gösterim için). */
export function maskPhone(value: string) {
  const normalized = normalizeTurkishPhone(value);
  if (!/^\+905\d{9}$/.test(normalized)) return value;
  return `0${normalized.slice(3, 6)} *** ** ${normalized.slice(-2)}`;
}

/** Saat etiketinden ("09:30") günün bölümünü bulur. */
export type DayPart = "morning" | "noon" | "evening";
export function dayPartOf(label: string): DayPart {
  const hour = Number.parseInt(label, 10);
  if (hour < 12) return "morning";
  if (hour < 17) return "noon";
  return "evening";
}
