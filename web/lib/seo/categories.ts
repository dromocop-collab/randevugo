/**
 * Arama motoru sayfalarında kullanılan kategori sözlüğü (saf modül, test edilebilir).
 * Anahtarlar `canonicalBusinessCategory` çıktısıyla aynıdır; /sehir/[city]/[category]
 * adresleri bu anahtarları kullanır, bu yüzden değiştirilmemelidir.
 */
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
  kuafor: { slug: "kuafor", label: "Kuaför", plural: "Kuaförler", noun: "kuaför", schemaType: "HairSalon", landing: "/kuafor-randevu", image: "/images/categories/kuafor.png", examples: "saç kesimi, boya ve bakım" },
  berber: { slug: "berber", label: "Berber", plural: "Berberler", noun: "berber", schemaType: "HairSalon", landing: "/berber-randevu", image: "/images/categories/berber.png", examples: "saç, sakal ve tıraş" },
  guzellik: { slug: "guzellik", label: "Güzellik Merkezi", plural: "Güzellik Merkezleri", noun: "güzellik merkezi", schemaType: "BeautySalon", landing: "/guzellik-merkezi-randevu", image: "/images/categories/guzellik.png", examples: "cilt bakımı, epilasyon ve kaş-kirpik" },
  nail: { slug: "nail", label: "Nail Studio", plural: "Nail Studio'lar", noun: "nail studio", schemaType: "NailSalon", landing: "/nail-studio-randevu", image: "/images/categories/nail.png", examples: "manikür, pedikür ve nail art" },
  spa: { slug: "spa", label: "Spa ve Masaj", plural: "Spa ve Masaj Salonları", noun: "spa ve masaj salonu", schemaType: "DaySpa", landing: "/spa-randevu", image: "/images/categories/spa.png", examples: "masaj, hamam ve spa ritüelleri" },
  spor: { slug: "spor", label: "Spor ve PT", plural: "Spor Salonları ve Eğitmenler", noun: "spor salonu ve eğitmen", schemaType: "ExerciseGym", landing: "/spor-randevu", image: "/images/categories/spor.png", examples: "kişisel antrenman, pilates ve fitness" },
  saglik: { slug: "saglik", label: "Sağlık", plural: "Sağlık Merkezleri", noun: "sağlık merkezi", schemaType: "MedicalClinic", landing: "/saglik-randevu", image: "/images/categories/saglik.png", examples: "muayene, fizyoterapi ve diyetisyen görüşmesi" },
  danismanlik: { slug: "danismanlik", label: "Danışmanlık", plural: "Danışmanlar", noun: "danışman", schemaType: "ProfessionalService", landing: "/danismanlik-randevu", image: "/images/categories/danismanlik.png", examples: "terapi, koçluk ve uzman görüşmesi" },
  veteriner: { slug: "veteriner", label: "Veteriner", plural: "Veteriner Klinikleri", noun: "veteriner", schemaType: "VeterinaryCare", landing: "/veteriner-randevu", image: "/images/categories/veteriner.png", examples: "muayene, aşı ve pet bakımı" },
  yazilim: { slug: "yazilim", label: "Yazılım ve Web", plural: "Yazılım ve Web Uzmanları", noun: "yazılım ve web uzmanı", schemaType: "ProfessionalService", landing: "/yazilim-web-randevu", image: "/images/categories/yazilim.png", examples: "web sitesi, yazılım ve dijital danışmanlık" },
  egitim: { slug: "egitim", label: "Eğitim ve Kurs", plural: "Kurslar ve Eğitmenler", noun: "kurs ve eğitmen", schemaType: "LocalBusiness", examples: "özel ders, kurs ve atölye" },
  servis: { slug: "servis", label: "Servis ve Teknik", plural: "Teknik Servisler", noun: "teknik servis", schemaType: "LocalBusiness", examples: "tamir, bakım ve teknik destek" },
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
  if (/\bdis\b|diş|dentist/.test(value)) return "Dentist";
  if (/doktor|hekim|physician/.test(value)) return "Physician";
  if (/klinik|fizyo|diyet|psikolog|saglik|sağlık/.test(value)) return "MedicalClinic";
  if (/tirnak|tırnak|nail/.test(value)) return "NailSalon";
  if (/spa|masaj/.test(value)) return "DaySpa";
  if (/sac|saç|kuafor|kuaför|berber/.test(value)) return "HairSalon";
  if (/guzellik|güzellik|estetik|cilt|bakim|bakım/.test(value)) return "HealthAndBeautyBusiness";
  if (/spor|fitness|pilates|yoga|gym/.test(value)) return "ExerciseGym";
  if (/veteriner|pet/.test(value)) return "VeterinaryCare";
  return "LocalBusiness";
}

/** İnsan okunur kategori adı; bilinmeyen anahtar başlık biçimine çevrilir. */
export function categoryDisplayName(slug: string | undefined | null): string {
  const known = seoCategory(slug ?? "");
  if (known) return known.label;
  const text = (slug ?? "").replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1) : "Profesyonel Hizmet";
}
