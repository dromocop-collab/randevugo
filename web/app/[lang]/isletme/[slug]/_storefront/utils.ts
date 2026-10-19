import type { Business, DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { LiveWaitEstimate } from "@/features/live-queue/wait-estimate";
import { millisToZonedDateTime } from "@/lib/time/zoned";
import { interpolate, tk, type TFunction } from "@/i18n/config";

export const DAY_NAMES = [tk("Pazar"), tk("Pazartesi"), tk("Salı"), tk("Çarşamba"), tk("Perşembe"), tk("Cuma"), tk("Cumartesi")];
/** Pazartesi ile başlayan Türk haftası. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const CATEGORY_LABELS: Record<string, string> = {
  kuafor: tk("Kuaför"), berber: tk("Berber"), guzellik: tk("Güzellik Merkezi"), nail: "Nail Studio",
  spa: tk("Spa & Masaj"), spor: tk("Spor & PT"), saglik: tk("Sağlık"), danismanlik: tk("Danışmanlık"),
  veteriner: tk("Veteriner"), yazilim: tk("Yazılım"), egitim: tk("Eğitim"), servis: tk("Servis & Teknik"), diger: tk("Profesyonel hizmet"),
};

/** Kategori etiketi; t verilirse çevrilir (bilinmeyen kategori adı veri olarak kalır). */
export function categoryLabel(category?: string, t: TFunction = (source) => source) {
  if (!category) return t("Profesyonel hizmet");
  return CATEGORY_LABELS[category] ? t(CATEGORY_LABELS[category]) : category.replace(/[-_]+/g, " ").replace(/^\p{L}/u, (l) => l.toLocaleUpperCase("tr-TR"));
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
  | { kind: "closed"; next: { offset: number; day: number; start: string } | null };

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
    if (minutes < start) return { kind: "closed", next: { offset: 0, day, start: today.start } };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (day + offset) % 7;
    const schedule = hours.find((item) => item.day === nextDay && item.isOpen);
    if (schedule) {
      return { kind: "closed", next: { offset, day: nextDay, start: schedule.start } };
    }
  }
  return { kind: "closed", next: null };
}

function nextOpeningLabel(next: { offset: number; day: number; start: string }, t: TFunction) {
  if (next.offset === 0) return t("Bugün {time}'da açılıyor", { time: next.start });
  if (next.offset === 1) return t("Yarın {time}'da açılıyor", { time: next.start });
  return t("{day} {time}'da açılıyor", { day: t(DAY_NAMES[next.day]), time: next.start });
}

export function openStatusLabel(status: OpenStatus, t: TFunction = interpolate) {
  switch (status.kind) {
    case "open": return status.closingSoon ? t("Yakında kapanıyor · {time}", { time: status.until }) : t("Şimdi açık · {time}'e kadar", { time: status.until });
    case "break": return t("Molada · {time}'de dönüyor", { time: status.until });
    case "closed": return status.next ? t("Kapalı · {next}", { next: nextOpeningLabel(status.next, t) }) : t("Şu anda kapalı");
    default: return "";
  }
}

export function formatPrice(price: number, currency: Service["currency"] = "TRY", locale = "tr-TR") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price.toLocaleString(locale)} ₺`;
  }
}

export function formatDuration(totalMinutes: number, t: TFunction = interpolate) {
  if (!totalMinutes || totalMinutes < 60) return t("{count} dk", { count: totalMinutes || 0 });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? t("{hours} sa {minutes} dk", { hours, minutes }) : t("{hours} sa", { hours });
}

/** waitEstimateLabel'ın çevrilebilir karşılığı (aynı mantık). */
export function liveWaitLabel(estimate: LiveWaitEstimate | null, t: TFunction = interpolate) {
  if (!estimate) return t("Bekleme süresi şu anda hesaplanamıyor");
  if (estimate.status === "available_now") return t("Şimdi müsait");
  if (estimate.minWaitMinutes !== null && estimate.maxWaitMinutes !== null)
    return t("Tahmini bekleme: {min}–{max} dk", { min: estimate.minWaitMinutes, max: estimate.maxWaitMinutes });
  if (estimate.status === "business_closed") return t("Bugün canlı sıra kapalı");
  if (estimate.status === "no_eligible_staff") return t("Bugün uygun personel bulunmuyor");
  return t("Bekleme süresi şu anda hesaplanamıyor");
}

export function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i") // i18n-ignore — arama normalleştirmesi
    .normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
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

export function relativeDate(iso: string, nowMillis: number, t: TFunction = interpolate, locale = "tr-TR") {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const days = Math.floor((nowMillis - time) / 86_400_000);
  if (days < 1) return t("Bugün");
  if (days < 2) return t("Dün");
  if (days < 7) return t("{count} gün önce", { count: days });
  if (days < 30) return t("{count} hafta önce", { count: Math.floor(days / 7) });
  if (days < 365) return t("{count} ay önce", { count: Math.floor(days / 30) });
  return new Date(iso).toLocaleDateString(locale, { month: "long", year: "numeric" });
}
