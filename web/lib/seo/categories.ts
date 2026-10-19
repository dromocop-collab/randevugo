/**
 * Arama motoru sayfalarında kullanılan kategori sözlüğü (saf modül, test edilebilir).
 * Anahtarlar `canonicalBusinessCategory` çıktısıyla aynıdır; /sehir/[city]/[category]
 * adresleri bu anahtarları kullanır, bu yüzden değiştirilmemelidir.
 *
 * label/plural/noun/examples tk() ile işaretlidir (Türkçe kaynak = sözlük anahtarı);
 * gösterirken localizeSeoCategory(item, t) ya da t(item.label) kullanın.
 */
import { tk, type Locale, type TFunction } from "../../i18n/config.ts";

export type SeoCategory = {
  slug: string;
  /** Başlıklarda kullanılan tekil ad: "Kuaför". */
  label: string;
  /** Liste başlıklarında çoğul ad: "Kuaförler". */
  plural: string;
  /** Cümle içinde küçük harfli tekil ad: "kuaför". */
  noun: string;
  /** schema.org LocalBusiness alt türü. */
  schemaType: string;
  /** Kategoriye özel tanıtım sayfası. */
  landing?: string;
  image?: string;
  /** Cümle içinde örnek hizmetler (yalnızca genel tanım; işletme verisi yerine geçmez). */
  examples: string;
};

export const SEO_CATEGORIES: Record<string, SeoCategory> = {
  kuafor: { slug: "kuafor", label: tk("Kuaför"), plural: tk("Kuaförler"), noun: tk("kuaför"), schemaType: "HairSalon", landing: "/kuafor-randevu", image: "/images/categories/kuafor.png", examples: tk("saç kesimi, boya ve bakım") },
  berber: { slug: "berber", label: tk("Berber"), plural: tk("Berberler"), noun: tk("berber"), schemaType: "HairSalon", landing: "/berber-randevu", image: "/images/categories/berber.png", examples: tk("saç, sakal ve tıraş") },
  guzellik: { slug: "guzellik", label: tk("Güzellik Merkezi"), plural: tk("Güzellik Merkezleri"), noun: tk("güzellik merkezi"), schemaType: "BeautySalon", landing: "/guzellik-merkezi-randevu", image: "/images/categories/guzellik.png", examples: tk("cilt bakımı, epilasyon ve kaş-kirpik") },
  nail: { slug: "nail", label: tk("Nail Studio"), plural: tk("Nail Studio'lar"), noun: tk("nail studio"), schemaType: "NailSalon", landing: "/nail-studio-randevu", image: "/images/categories/nail.png", examples: tk("manikür, pedikür ve nail art") },
  spa: { slug: "spa", label: tk("Spa ve Masaj"), plural: tk("Spa ve Masaj Salonları"), noun: tk("spa ve masaj salonu"), schemaType: "DaySpa", landing: "/spa-randevu", image: "/images/categories/spa.png", examples: tk("masaj, hamam ve spa ritüelleri") },
  spor: { slug: "spor", label: tk("Spor ve PT"), plural: tk("Spor Salonları ve Eğitmenler"), noun: tk("spor salonu ve eğitmen"), schemaType: "ExerciseGym", landing: "/spor-randevu", image: "/images/categories/spor.png", examples: tk("kişisel antrenman, pilates ve fitness") },
  saglik: { slug: "saglik", label: tk("Sağlık"), plural: tk("Sağlık Merkezleri"), noun: tk("sağlık merkezi"), schemaType: "MedicalClinic", landing: "/saglik-randevu", image: "/images/categories/saglik.png", examples: tk("muayene, fizyoterapi ve diyetisyen görüşmesi") },
  danismanlik: { slug: "danismanlik", label: tk("Danışmanlık"), plural: tk("Danışmanlar"), noun: tk("danışman"), schemaType: "ProfessionalService", landing: "/danismanlik-randevu", image: "/images/categories/danismanlik.png", examples: tk("terapi, koçluk ve uzman görüşmesi") },
  veteriner: { slug: "veteriner", label: tk("Veteriner"), plural: tk("Veteriner Klinikleri"), noun: tk("veteriner"), schemaType: "VeterinaryCare", landing: "/veteriner-randevu", image: "/images/categories/veteriner.png", examples: tk("muayene, aşı ve pet bakımı") },
  yazilim: { slug: "yazilim", label: tk("Yazılım ve Web"), plural: tk("Yazılım ve Web Uzmanları"), noun: tk("yazılım ve web uzmanı"), schemaType: "ProfessionalService", landing: "/yazilim-web-randevu", image: "/images/categories/yazilim.png", examples: tk("web sitesi, yazılım ve dijital danışmanlık") },
  egitim: { slug: "egitim", label: tk("Eğitim ve Kurs"), plural: tk("Kurslar ve Eğitmenler"), noun: tk("kurs ve eğitmen"), schemaType: "LocalBusiness", examples: tk("özel ders, kurs ve atölye") },
  servis: { slug: "servis", label: tk("Servis ve Teknik"), plural: tk("Teknik Servisler"), noun: tk("teknik servis"), schemaType: "LocalBusiness", examples: tk("tamir, bakım ve teknik destek") },
};

/** Sitede kendi sayfası olabilen kategori anahtarları (sıra = gösterim sırası). */
export const SEO_CATEGORY_SLUGS = Object.keys(SEO_CATEGORIES);

export function isSeoCategory(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEO_CATEGORIES, value);
}

export function seoCategory(slug: string | undefined | null): SeoCategory | undefined {
  return slug && isSeoCategory(slug) ? SEO_CATEGORIES[slug] : undefined;
}

/**
 * Kanonik kategori anahtarını schema.org türüne eşler. Bilinmeyen kategoriler için
 * metin ipuçlarına bakılır; hiçbiri uymazsa genel `LocalBusiness` döner.
 */
export function schemaTypeForCategory(category: string | undefined | null): string {
  const known = seoCategory(category ?? "");
  if (known) return known.schemaType;
  const value = (category ?? "").toLocaleLowerCase("tr-TR");
  if (/\bdis\b|diş|dentist/.test(value)) return "Dentist"; // i18n-ignore
  if (/doktor|hekim|physician/.test(value)) return "Physician";
  if (/klinik|fizyo|diyet|psikolog|saglik|sağlık/.test(value)) return "MedicalClinic"; // i18n-ignore
  if (/tirnak|tırnak|nail/.test(value)) return "NailSalon"; // i18n-ignore
  if (/spa|masaj/.test(value)) return "DaySpa";
  if (/sac|saç|kuafor|kuaför|berber/.test(value)) return "HairSalon"; // i18n-ignore
  if (/guzellik|güzellik|estetik|cilt|bakim|bakım/.test(value)) return "HealthAndBeautyBusiness"; // i18n-ignore
  if (/spor|fitness|pilates|yoga|gym/.test(value)) return "ExerciseGym";
  if (/veteriner|pet/.test(value)) return "VeterinaryCare";
  return "LocalBusiness";
}

/** İnsan okunur kategori adı; bilinmeyen anahtar başlık biçimine çevrilir. */
export function categoryDisplayName(slug: string | undefined | null): string {
  const known = seoCategory(slug ?? "");
  if (known) return known.label;
  const text = (slug ?? "").replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1) : tk("Profesyonel Hizmet");
}

/** Kategorinin görünen adlarını etkin dile çevirir (slug, şema türü ve adresler değişmez). */
export function localizeSeoCategory<T extends SeoCategory>(item: T, t: TFunction): T {
  return { ...item, label: t(item.label), plural: t(item.plural), noun: t(item.noun), examples: t(item.examples) };
}

/**
 * Cümle şablonları için kategori değişkenleri (kategori önce localizeSeoCategory ile çevrilmiş olmalı):
 * category = tekil başlık ("Kuaför" / "Hair Salon"), noun = cümle içi tekil, plural = çoğul başlık,
 * pluralLower = küçük harfli çoğul, examples = küçük harfli örnekler, Examples = baş harfi büyük örnekler.
 */
export function seoCategoryVars(item: SeoCategory, locale: Locale) {
  const lower = (value: string) => locale === "tr" ? value.toLocaleLowerCase("tr-TR") : value.toLowerCase();
  const upperFirst = (value: string) => value ? value.charAt(0).toLocaleUpperCase(locale === "tr" ? "tr-TR" : "en-US") + value.slice(1) : value;
  return { category: item.label, noun: item.noun, plural: item.plural, pluralLower: lower(item.plural), examples: item.examples, Examples: upperFirst(item.examples) };
}
