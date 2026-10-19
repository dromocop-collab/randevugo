// Hizmet fiyat tipi, seçenekler (varyant) ve çeviriler — saf yardımcılar. Test: service-pricing-domain.test.mjs
// Web tarafındaki karşılığı: web/features/services/service-pricing.ts (iki dosya senkron tutulmalı).
//
// Geriye uyumluluk: eski hizmetlerde bu alanlar yoktur → sabit fiyat, seçeneksiz. Mobil uygulamalar yalnız
// price/durationMinutes okur; bu yüzden price her zaman "en az" tutarı, durationMinutes varsayılan süreyi taşır.

export type ServicePriceType = "fixed" | "from" | "range" | "quote";
export const SERVICE_PRICE_TYPES: readonly ServicePriceType[] = ["fixed", "from", "range", "quote"];

export type ServiceVariant = { id: string; name: string; price: number; durationMinutes: number };

export const MAX_SERVICE_VARIANTS = 8;

export function servicePriceType(service: Record<string, unknown> | null | undefined): ServicePriceType {
  const value = service?.priceType;
  return typeof value === "string" && (SERVICE_PRICE_TYPES as readonly string[]).includes(value) ? value as ServicePriceType : "fixed";
}

function finite(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

/** Kayıtlı seçenekleri doğrular; bozuk satırları atar. Aralık/teklif fiyatlı hizmette seçenek kullanılmaz. */
export function serviceVariants(service: Record<string, unknown> | null | undefined): ServiceVariant[] {
  if (!service || !Array.isArray(service.variants)) return [];
  const type = servicePriceType(service);
  if (type === "range" || type === "quote") return [];
  const seen = new Set<string>();
  const rows: ServiceVariant[] = [];
  for (const raw of service.variants.slice(0, MAX_SERVICE_VARIANTS)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const name = String(row.name ?? "").trim().slice(0, 60);
    const price = finite(row.price, 0, 1_000_000);
    const durationMinutes = finite(row.durationMinutes, 5, 480);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !name || price === null || durationMinutes === null || seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, name, price, durationMinutes: Math.round(durationMinutes) });
  }
  return rows;
}

/**
 * Müşterinin seçtiği seçenek. Seçenekli hizmette kimlik gönderilmezse (eski istemci/mobil uygulama) ilk seçenek
 * kullanılır; gönderilen kimlik geçersizse null + invalid döner (çağıran hata verir).
 */
export function resolveServiceVariant(service: Record<string, unknown>, variantId: unknown): { variant: ServiceVariant | null; invalid: boolean } {
  const variants = serviceVariants(service);
  if (variants.length === 0) return { variant: null, invalid: false };
  if (variantId === undefined || variantId === null || variantId === "") return { variant: variants[0]!, invalid: false };
  const match = variants.find((item) => item.id === variantId);
  return match ? { variant: match, invalid: false } : { variant: null, invalid: true };
}

/** Seçeneğin fiyat ve süresini hizmetin üzerine yazar (personel özel fiyat/süresinden sonra uygulanır). */
export function applyServiceVariant<T extends Record<string, unknown>>(service: T, variant: ServiceVariant | null): T {
  if (!variant) return service;
  return { ...service, price: variant.price, durationMinutes: variant.durationMinutes };
}

/** Randevu belgesine yazılan fiyat görüntüsü (iş bitince kesin fiyat girilmesi gerekip gerekmediği buradan anlaşılır). */
export function appointmentPriceSnapshot(service: Record<string, unknown>, variant: ServiceVariant | null) {
  const type = servicePriceType(service);
  const price = Math.max(0, Number(service.price ?? 0) || 0);
  const priceMax = type === "range" ? Math.max(price, Number(service.priceMax ?? 0) || 0) : null;
  return {
    servicePrice: type === "quote" ? 0 : price,
    servicePriceType: type,
    ...(priceMax !== null ? { servicePriceMax: priceMax } : {}),
    ...(variant ? { serviceVariantId: variant.id, serviceVariantName: variant.name } : {}),
  };
}

/** Randevudaki hizmet adı: "Saç Boyama · Uzun saç". */
export function serviceDisplayName(name: string, variant: ServiceVariant | null): string {
  const base = name.trim().slice(0, 70);
  return variant ? `${base} · ${variant.name}`.slice(0, 120) : base;
}

/** Hizmetin dil karşılıkları: translations.en.name gibi. Randevuya o anki görüntüsü kopyalanır. */
export function serviceNameTranslations(service: Record<string, unknown>, variant: ServiceVariant | null): Record<string, string> {
  const raw = service.translations;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [locale, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z]{2}$/.test(locale) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim().slice(0, 70) : "";
    if (!name) continue;
    const variantNames = row.variants && typeof row.variants === "object" ? row.variants as Record<string, unknown> : {};
    const variantName = variant && typeof variantNames[variant.id] === "string" ? String(variantNames[variant.id]).trim().slice(0, 60) : "";
    out[locale] = variant ? `${name} · ${variantName || variant.name}`.slice(0, 120) : name;
  }
  return out;
}

/** Otomatik çeviri isteği: kısa metin listesi doğrulaması. */
export function translationItems(value: unknown): Array<{ key: string; text: string }> {
  if (!Array.isArray(value)) return [];
  const rows: Array<{ key: string; text: string }> = [];
  for (const raw of value.slice(0, 120)) {
    if (!raw || typeof raw !== "object") continue;
    const key = String((raw as Record<string, unknown>).key ?? "").trim();
    const text = String((raw as Record<string, unknown>).text ?? "").trim().slice(0, 400);
    if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(key) || !text) continue;
    rows.push({ key, text });
  }
  return rows;
}

/** Model yanıtındaki JSON nesnesini çıkarır; yalnız istenen anahtarları ve makul uzunlukları kabul eder. */
export function parseTranslationResponse(body: string, keys: string[]): Record<string, string> {
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(body.slice(start, end + 1)); } catch { return {}; }
  if (!parsed || typeof parsed !== "object") return {};
  const allowed = new Set(keys);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!allowed.has(key) || typeof value !== "string") continue;
    const text = value.trim().slice(0, 400);
    if (text) out[key] = text;
  }
  return out;
}

/* ── Otomatik çeviri (hizmet/kategori kaydedilince sunucu tetikleyicisi) ─────────────────────── */

/** Otomatik çevrilen hedef diller. Yeni dil: buraya ekle (ad modele söylenir). */
export const AUTO_TRANSLATE_LANGUAGES: Record<string, string> = { en: "English" };

function shortHash(text: string): string {
  // FNV-1a 32 bit — yalnız "kaynak metin değişti mi" karşılaştırması için.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export type TranslationSource = { items: Array<{ key: string; text: string }>; hash: string };

/** Hizmetin çevrilecek metinleri: ad, açıklama, seçenek adları. Fiyat/süre değişimi hash'i etkilemez. */
export function serviceTranslationSource(service: Record<string, unknown>): TranslationSource {
  const items: Array<{ key: string; text: string }> = [];
  const name = String(service.name ?? "").trim().slice(0, 120);
  const description = String(service.description ?? "").trim().slice(0, 400);
  if (name) items.push({ key: "name", text: name });
  if (description) items.push({ key: "description", text: description });
  for (const variant of serviceVariants(service)) items.push({ key: `v.${variant.id}`, text: variant.name });
  return { items, hash: shortHash(JSON.stringify(items)) };
}

export function categoryTranslationSource(category: Record<string, unknown>): TranslationSource {
  const name = String(category.name ?? "").trim().slice(0, 120);
  const items = name ? [{ key: "name", text: name }] : [];
  return { items, hash: shortHash(JSON.stringify(items)) };
}

/**
 * Bu dil için çeviri gerekiyor mu? Elle düzeltilmiş (manual) çeviri hiç ezilmez; kaynak metin
 * değişmediyse (hash aynı) tekrar çevrilmez — kendi yazımımızın tetiklemesi de böylece durur.
 */
export function needsAutoTranslation(document: Record<string, unknown>, locale: string, source: TranslationSource): boolean {
  if (source.items.length === 0) return false;
  const translations = document.translations && typeof document.translations === "object" ? document.translations as Record<string, unknown> : {};
  const current = translations[locale] && typeof translations[locale] === "object" ? translations[locale] as Record<string, unknown> : null;
  if (current?.manual === true) return false;
  return current?.sourceHash !== source.hash;
}

/** Model çıktısından translations.<dil> nesnesi kurar. */
export function buildServiceTranslation(result: Record<string, string>, hash: string) {
  const variants: Record<string, string> = {};
  for (const [key, value] of Object.entries(result)) if (key.startsWith("v.")) variants[key.slice(2)] = value;
  return {
    ...(result.name ? { name: result.name } : {}),
    ...(result.description ? { description: result.description } : {}),
    ...(Object.keys(variants).length ? { variants } : {}),
    auto: true,
    sourceHash: hash,
  };
}
