/**
 * İşletme kurulum sihirbazının saf yardımcıları (Firebase/React yok).
 * node --test ile doğrudan çalışabilsin diye "@/..." takma adı kullanılmaz.
 */

/**
 * Çeviri: bu modül "@/i18n" içe aktaramaz (node --test). Görünen metin döndüren fonksiyonlar isteğe bağlı
 * `t` (useT()/getT() çıktısı) ve `locale` ("en-GB" vb.) alır; verilmezse Türkçe döner.
 */
export type SetupTranslate = (source: string, vars?: Record<string, string | number>) => string;
const fill: SetupTranslate = (source, vars) =>
  vars ? source.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole)) : source;
/** Çevrilecek sabit metin işareti (i18n/config tk ile aynı; denetim aracı bulur). */
const tk = <T extends string>(source: T): T => source;

export const STORE_HOST = "seninrandevun.com";
export const STORE_ORIGIN = `https://${STORE_HOST}`;

/** Türkçe karakterleri güvenli bağlantıya çevirir: "Şık Saçlar Kuaför" → "sik-saclar-kuafor". */
export function slugifyBusinessName(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u") // i18n-ignore
    .replace(/ö/g, "o").replace(/ç/g, "c").replace(/ı/g, "i") // i18n-ignore
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

export function whatsappShareUrl(businessName: string, url: string, t: SetupTranslate = fill): string {
  const text = t("{name} artık online randevu alıyor! Uygun saati seç, randevunu hemen oluştur: {url}", { name: businessName.trim() || t("İşletmemiz"), url });
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatTry(amount: number, t: SetupTranslate = fill, locale = "tr-TR"): string {
  if (!Number.isFinite(amount) || amount <= 0) return t("Fiyat sorunuz");
  return `₺${Math.round(amount).toLocaleString(locale)}`;
}

export function formatDuration(minutes: number, t: SetupTranslate = fill): string {
  if (minutes < 60) return t("{minutes} dk", { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t("{hours} sa {minutes} dk", { hours, minutes: rest }) : t("{hours} sa", { hours });
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
export function remainingTimeLabel(stepSeconds: readonly number[], currentStep: number, t: SetupTranslate = fill): string {
  const remaining = stepSeconds.slice(Math.max(0, currentStep)).reduce((sum, value) => sum + value, 0);
  if (currentStep >= stepSeconds.length - 1) return t("Son adım");
  if (remaining <= 60) return t("~1 dk kaldı");
  return t("~{minutes} dk kaldı", { minutes: Math.ceil(remaining / 60) });
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
/** Gösterirken t(DAY_SHORT[n]) / t(DAY_LONG[n]). */
export const DAY_SHORT: Record<number, string> = { 0: tk("Paz"), 1: tk("Pzt"), 2: tk("Sal"), 3: tk("Çar"), 4: tk("Per"), 5: tk("Cum"), 6: tk("Cmt") };
export const DAY_LONG: Record<number, string> = { 0: tk("Pazar"), 1: tk("Pazartesi"), 2: tk("Salı"), 3: tk("Çarşamba"), 4: tk("Perşembe"), 5: tk("Cuma"), 6: tk("Cumartesi") };

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

/** Hatalı gün varsa (t verilmezse Türkçe) hata mesajı döner. */
export function validateWorkingHours(days: readonly WorkingDay[], t: SetupTranslate = fill): string | null {
  if (!days.some((day) => day.isOpen)) return t("En az bir gün açık olmalı.");
  for (const day of days) {
    if (!day.isOpen) continue;
    const dayName = t(DAY_LONG[day.day] ?? "");
    if (!isTime(day.start) || !isTime(day.end)) return t("{day} için saatleri SS:DD biçiminde gir.", { day: dayName });
    if (day.start >= day.end) return t("{day}: kapanış saati açılıştan sonra olmalı.", { day: dayName });
    if (day.breakStart || day.breakEnd) {
      if (!day.breakStart || !day.breakEnd || !isTime(day.breakStart) || !isTime(day.breakEnd)) return t("{day}: mola saatlerini tamamla.", { day: dayName });
      if (day.breakStart >= day.breakEnd || day.breakStart <= day.start || day.breakEnd >= day.end) return t("{day}: mola çalışma saatlerinin içinde olmalı.", { day: dayName });
    }
  }
  return null;
}

/** Kısa özet: "Pzt–Cmt 09:00–19:00 · Paz kapalı". */
export function summarizeWorkingHours(days: readonly WorkingDay[], t: SetupTranslate = fill): string {
  const ordered = WEEK_ORDER.map((day) => days.find((item) => item.day === day)).filter((item): item is WorkingDay => Boolean(item));
  const groups: { from: number; to: number; label: string }[] = [];
  ordered.forEach((item) => {
    const label = item.isOpen ? `${item.start}–${item.end}` : t("kapalı");
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.to = item.day;
    else groups.push({ from: item.day, to: item.day, label });
  });
  return groups.map((group) => `${t(DAY_SHORT[group.from] ?? "")}${group.from !== group.to ? `–${t(DAY_SHORT[group.to] ?? "")}` : ""} ${group.label}`).join(" · ");
}

/** Türkiye'nin 81 ili (alfabetik, Türkçe). Yer adları çevrilmez. */
export const TR_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", // i18n-ignore
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", // i18n-ignore
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", // i18n-ignore
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", // i18n-ignore
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", // i18n-ignore
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", // i18n-ignore
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", // i18n-ignore
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak", // i18n-ignore
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
