import type { Business, DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import { millisToZonedDateTime } from "@/lib/time/zoned";

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
/** Pazartesi ile başlayan Türk haftası. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const CATEGORY_LABELS: Record<string, string> = {
  kuafor: "Kuaför", berber: "Berber", guzellik: "Güzellik Merkezi", nail: "Nail Studio",
  spa: "Spa & Masaj", spor: "Spor & PT", saglik: "Sağlık", danismanlik: "Danışmanlık",
  veteriner: "Veteriner", yazilim: "Yazılım", egitim: "Eğitim", servis: "Servis & Teknik", diger: "Profesyonel hizmet",
};

export function categoryLabel(category?: string) {
  if (!category) return "Profesyonel hizmet";
  return CATEGORY_LABELS[category] ?? category.replace(/[-_]+/g, " ").replace(/^\p{L}/u, (l) => l.toLocaleUpperCase("tr-TR"));
}

export function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 2).toLocaleUpperCase("tr-TR") || "?";
}

export function toMinutes(value?: string) {
  if (!value) return Number.NaN;
  const [hour, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export type OpenStatus =
  | { kind: "unknown" }
  | { kind: "open"; until: string; closingSoon: boolean }
  | { kind: "break"; until: string }
  | { kind: "closed"; nextLabel: string | null };

/** İstanbul saatine göre şu anki gün (0=Pazar) ve dakika. */
export function istanbulNow(millis: number) {
  const { date, time } = millisToZonedDateTime(millis);
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return { day, minutes: toMinutes(time) };
}

export function computeOpenStatus(hours: DaySchedule[], millis: number): OpenStatus {
  if (hours.length === 0) return { kind: "unknown" };
  const { day, minutes } = istanbulNow(millis);
  const today = hours.find((item) => item.day === day);
  if (today?.isOpen) {
    const start = toMinutes(today.start);
    const end = toMinutes(today.end);
    const breakStart = toMinutes(today.breakStart);
    const breakEnd = toMinutes(today.breakEnd);
    if (minutes >= start && minutes < end) {
      if (!Number.isNaN(breakStart) && !Number.isNaN(breakEnd) && minutes >= breakStart && minutes < breakEnd) {
        return { kind: "break", until: today.breakEnd! };
      }
      return { kind: "open", until: today.end, closingSoon: end - minutes <= 60 };
    }
    if (minutes < start) return { kind: "closed", nextLabel: `Bugün ${today.start}'da açılıyor` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (day + offset) % 7;
    const schedule = hours.find((item) => item.day === nextDay && item.isOpen);
    if (schedule) {
      const label = offset === 1 ? "Yarın" : DAY_NAMES[nextDay];
      return { kind: "closed", nextLabel: `${label} ${schedule.start}'da açılıyor` };
    }
  }
  return { kind: "closed", nextLabel: null };
}

export function openStatusLabel(status: OpenStatus) {
  switch (status.kind) {
    case "open": return status.closingSoon ? `Yakında kapanıyor · ${status.until}` : `Şimdi açık · ${status.until}'e kadar`;
    case "break": return `Molada · ${status.until}'de dönüyor`;
    case "closed": return status.nextLabel ? `Kapalı · ${status.nextLabel}` : "Şu anda kapalı";
    default: return "";
  }
}

export function formatPrice(price: number, currency: Service["currency"] = "TRY") {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price.toLocaleString("tr-TR")} ₺`;
  }
}

export function formatDuration(totalMinutes: number) {
  if (!totalMinutes || totalMinutes < 60) return `${totalMinutes || 0} dk`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}

export function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function mapsHref(business: Pick<Business, "name" | "address" | "district" | "city">) {
  const query = [business.name, business.address, business.district, business.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function externalUrl(value: string, base: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(trimmed)) return `https://${trimmed}`;
  return `${base}${trimmed.replace(/^@/, "")}`;
}

export function whatsappHref(value: string) {
  if (/^https?:\/\//i.test(value.trim())) return value.trim();
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10) digits = `90${digits}`;
  return digits ? `https://wa.me/${digits}` : null;
}

export type SocialLink = { key: string; label: string; href: string };

export function socialLinks(business: Business): SocialLink[] {
  const social = business.socialMedia ?? {};
  const rows: (SocialLink | null)[] = [
    social.instagram ? { key: "instagram", label: "Instagram", href: externalUrl(social.instagram, "https://instagram.com/") ?? "" } : null,
    social.tiktok ? { key: "tiktok", label: "TikTok", href: externalUrl(social.tiktok, "https://www.tiktok.com/@") ?? "" } : null,
    social.facebook ? { key: "facebook", label: "Facebook", href: externalUrl(social.facebook, "https://facebook.com/") ?? "" } : null,
    social.youtube ? { key: "youtube", label: "YouTube", href: externalUrl(social.youtube, "https://youtube.com/@") ?? "" } : null,
    social.twitter ? { key: "twitter", label: "X (Twitter)", href: externalUrl(social.twitter, "https://x.com/") ?? "" } : null,
    social.whatsapp ? { key: "whatsapp", label: "WhatsApp", href: whatsappHref(social.whatsapp) ?? "" } : null,
  ];
  return rows.filter((row): row is SocialLink => !!row && !!row.href);
}

export function websiteHref(website?: string) {
  if (!website?.trim()) return null;
  return /^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`;
}

export function relativeDate(iso: string, nowMillis: number) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const days = Math.floor((nowMillis - time) / 86_400_000);
  if (days < 1) return "Bugün";
  if (days < 2) return "Dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}
