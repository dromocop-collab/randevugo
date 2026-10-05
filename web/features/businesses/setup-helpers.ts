/**
 * İşletme kurulum sihirbazının saf yardımcıları (Firebase/React yok).
 * node --test ile doğrudan çalışabilsin diye "@/..." takma adı kullanılmaz.
 */

export const STORE_HOST = "seninrandevun.com";
export const STORE_ORIGIN = `https://${STORE_HOST}`;

/** Türkçe karakterleri güvenli bağlantıya çevirir: "Şık Saçlar Kuaför" → "sik-saclar-kuafor". */
export function slugifyBusinessName(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ö/g, "o").replace(/ç/g, "c").replace(/ı/g, "i")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60);
}

/** Yazarken sondaki tireyi korur (kullanıcı "abc-" yazıp devam edebilsin); kaydetmeden önce finalizeSlug kullanılır. */
export function finalizeSlug(value: string): string {
  return slugifyBusinessName(value).replace(/-+$/, "");
}

/** Sunucudaki createBusiness ile aynı kural. */
export function isValidSlug(value: string): boolean {
  return value.length >= 3 && value.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Alınmış bir adres için akıllı alternatifler (ilçe/şehir ekli). */
export function suggestSlugAlternatives(base: string, district?: string, city?: string): string[] {
  const root = finalizeSlug(base);
  if (!root) return [];
  const out = new Set<string>();
  for (const place of [district, city]) {
    const part = finalizeSlug(place ?? "");
    if (part && !root.endsWith(part)) out.add(`${root}-${part}`.slice(0, 60).replace(/-+$/, ""));
  }
  out.add(`${root}-randevu`.slice(0, 60));
  return [...out].filter(isValidSlug).slice(0, 3);
}

/** Şablonlar ve hizmet kategorileri için anahtar — service-category-repository.normalizeCategoryName ile birebir aynı. */
export function normalizeTemplateKey(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function storePath(slug: string): string {
  return `/isletme/${slug}`;
}

export function storeUrl(slug: string): string {
  return `${STORE_ORIGIN}${storePath(slug)}`;
}

export function storeDisplayUrl(slug: string): string {
  return `${STORE_HOST}${storePath(slug || "isletmen")}`;
}

export function whatsappShareUrl(businessName: string, url: string): string {
  const text = `${businessName.trim() || "İşletmemiz"} artık online randevu alıyor! Uygun saati seç, randevunu hemen oluştur: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatTry(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "Fiyat sorunuz";
  return `₺${Math.round(amount).toLocaleString("tr-TR")}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

/** Telefonu yerel 10 haneye indirger: "+90 532 000 00 00" / "0532..." → "5320000000". */
export function localPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits.slice(0, 10);
}

export function isValidMobilePhone(value: string): boolean {
  return /^5\d{9}$/.test(localPhoneDigits(value));
}

/** 5XX XXX XX XX biçimi (yazarken). */
export function formatPhoneInput(value: string): string {
  const digits = localPhoneDigits(value);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].filter(Boolean);
  return parts.join(" ");
}

/* ─── Kalan süre ─── */

/** Her adımın tahmini süresi (saniye) verildiğinde mevcut adımdan sonrası dahil kalan süre etiketi. */
export function remainingTimeLabel(stepSeconds: readonly number[], currentStep: number): string {
  const remaining = stepSeconds.slice(Math.max(0, currentStep)).reduce((sum, value) => sum + value, 0);
  if (currentStep >= stepSeconds.length - 1) return "Son adım";
  if (remaining <= 60) return "~1 dk kaldı";
  return `~${Math.ceil(remaining / 60)} dk kaldı`;
}

/* ─── Çalışma saatleri ─── */

export interface WorkingDay {
  day: number;
  isOpen: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

/** Pazartesiden başlayan görüntüleme sırası; day değeri JS Date.getDay() (0 = Pazar). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_SHORT: Record<number, string> = { 0: "Paz", 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt" };
export const DAY_LONG: Record<number, string> = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cumartesi" };

export type HoursPreset = "weekdays-saturday" | "weekdays" | "everyday";

/** Varsayılan: Pzt–Cmt 09:00–19:00, Pazar kapalı. */
export function createDefaultWorkingHours(preset: HoursPreset = "weekdays-saturday", start = "09:00", end = "19:00"): WorkingDay[] {
  return WEEK_ORDER.map((day) => ({
    day,
    isOpen: preset === "everyday" ? true : preset === "weekdays" ? day >= 1 && day <= 5 : day !== 0,
    start,
    end,
  }));
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Hatalı gün varsa Türkçe hata mesajı döner. */
export function validateWorkingHours(days: readonly WorkingDay[]): string | null {
  if (!days.some((day) => day.isOpen)) return "En az bir gün açık olmalı.";
  for (const day of days) {
    if (!day.isOpen) continue;
    if (!isTime(day.start) || !isTime(day.end)) return `${DAY_LONG[day.day]} için saatleri SS:DD biçiminde gir.`;
    if (day.start >= day.end) return `${DAY_LONG[day.day]}: kapanış saati açılıştan sonra olmalı.`;
    if (day.breakStart || day.breakEnd) {
      if (!day.breakStart || !day.breakEnd || !isTime(day.breakStart) || !isTime(day.breakEnd)) return `${DAY_LONG[day.day]}: mola saatlerini tamamla.`;
      if (day.breakStart >= day.breakEnd || day.breakStart <= day.start || day.breakEnd >= day.end) return `${DAY_LONG[day.day]}: mola çalışma saatlerinin içinde olmalı.`;
    }
  }
  return null;
}

/** Kısa özet: "Pzt–Cmt 09:00–19:00 · Paz kapalı". */
export function summarizeWorkingHours(days: readonly WorkingDay[]): string {
  const ordered = WEEK_ORDER.map((day) => days.find((item) => item.day === day)).filter((item): item is WorkingDay => Boolean(item));
  const groups: { from: number; to: number; label: string }[] = [];
  ordered.forEach((item) => {
    const label = item.isOpen ? `${item.start}–${item.end}` : "kapalı";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.to = item.day;
    else groups.push({ from: item.day, to: item.day, label });
  });
  return groups.map((group) => `${DAY_SHORT[group.from]}${group.from !== group.to ? `–${DAY_SHORT[group.to]}` : ""} ${group.label}`).join(" · ");
}

/** Türkiye'nin 81 ili (alfabetik, Türkçe). */
export const TR_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
] as const;

/** Yazılan şehri resmi yazımına eşler ("istanbul" → "İstanbul"); eşleşme yoksa olduğu gibi döner. */
export function canonicalCity(value: string): string {
  const key = finalizeSlug(value);
  return TR_CITIES.find((city) => finalizeSlug(city) === key) ?? value.trim();
}

/** Kategori araması için sadeleştirilmiş metin. */
export function searchKey(value: string): string {
  return finalizeSlug(value).replace(/-/g, " ");
}
