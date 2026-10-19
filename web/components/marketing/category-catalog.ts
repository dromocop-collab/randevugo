/**
 * Müşteri tarafındaki sabit kategori kataloğu: menü, alt bilgi ve /kategoriler sayfası
 * aynı listeyi kullanır. Sunucu ve istemci bileşenlerinden güvenle içe aktarılabilir.
 *
 * label/description tk() ile işaretlidir; gösterirken t(category.label) kullanın.
 */
import { tk } from "@/i18n/config";

export type CatalogCategory = {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  image?: string;
  /** Kategoriye özel SEO açılış sayfası. */
  landing?: string;
  /** Kart vurgu rengi. */
  accent: string;
};

export const CATEGORY_CATALOG: readonly CatalogCategory[] = [
  { slug: "kuafor", label: tk("Kuaför"), emoji: "💇", description: tk("Kesim, renklendirme ve saç bakımı"), image: "/images/categories/kuafor.png", landing: "/kuafor-randevu", accent: "#1f7a4a" },
  { slug: "berber", label: tk("Berber"), emoji: "💈", description: tk("Saç, sakal ve modern erkek bakımı"), image: "/images/categories/berber.png", landing: "/berber-randevu", accent: "#2563eb" },
  { slug: "guzellik", label: tk("Güzellik Merkezi"), emoji: "💅", description: tk("Cilt bakımı ve güzellik ritüelleri"), image: "/images/categories/guzellik.png", landing: "/guzellik-merkezi-randevu", accent: "#db2777" },
  { slug: "spa", label: tk("Spa & Masaj"), emoji: "🧖", description: tk("Rahatlama, masaj ve yenilenme"), image: "/images/categories/spa.png", landing: "/spa-randevu", accent: "#b7791f" },
  { slug: "nail", label: tk("Nail Studio"), emoji: "💎", description: tk("Manikür, pedikür ve nail art"), image: "/images/categories/nail.png", landing: "/nail-studio-randevu", accent: "#7c3aed" },
  { slug: "spor", label: tk("Spor & PT"), emoji: "🏋️", description: tk("Kişisel antrenman, pilates ve fitness"), image: "/images/categories/spor.png", landing: "/spor-randevu", accent: "#65a30d" },
  { slug: "saglik", label: tk("Sağlık"), emoji: "🩺", description: tk("Klinik, fizyoterapi ve diyetisyen"), image: "/images/categories/saglik.png", landing: "/saglik-randevu", accent: "#0891b2" },
  { slug: "danismanlik", label: tk("Danışmanlık"), emoji: "📋", description: tk("Terapi, koçluk ve uzman görüşmesi"), image: "/images/categories/danismanlik.png", landing: "/danismanlik-randevu", accent: "#d97706" },
  { slug: "veteriner", label: tk("Veteriner"), emoji: "🐾", description: tk("Dostların için güvenilir bakım"), image: "/images/categories/veteriner.png", landing: "/veteriner-randevu", accent: "#e11d48" },
  { slug: "yazilim", label: tk("Yazılım & Web"), emoji: "💻", description: tk("Web, mobil ve dijital çözümler"), image: "/images/categories/yazilim.png", landing: "/yazilim-web-randevu", accent: "#4f46e5" },
  { slug: "egitim", label: tk("Eğitim"), emoji: "📚", description: tk("Kurs, özel ders ve atölyeler"), image: "/images/categories/egitim-v2.png", accent: "#0d9488" },
  { slug: "servis", label: tk("Servis & Teknik"), emoji: "🔧", description: tk("Tamir, bakım ve teknik servis"), image: "/images/categories/servis-v2.png", accent: "#475569" },
];

export const FALLBACK_CATEGORY_IMAGE = "/images/categories/diger-v2.png";

// Yönetici veya işletmenin eklediği özel kategoriler için isimden en yakın görsel (ör. "Yazılım – Web – Video" → yazılım).
// i18n-ignore — aşağıdaki desenler Türkçe veri eşleştirir, görünen metin değildir.
const IMAGE_KEYWORDS: Array<[RegExp, string]> = [
  [/yaz[ıi]l[ıi]m|web|video|dijital|tasar[ıi]m|ajans|foto/, "yazilim"], // i18n-ignore
  [/kuaf|sa[çc]/, "kuafor"], // i18n-ignore
  [/berber|sakal/, "berber"],
  [/g[üu]zel|cilt|estetik|lazer|kirpik|ka[şs]/, "guzellik"], // i18n-ignore
  [/nail|t[ıi]rnak|man[ıi]k/, "nail"], // i18n-ignore
  [/spa|masaj|hamam|sauna/, "spa"],
  [/spor|fitness|pilates|yoga|pt\b|antrenman/, "spor"],
  [/sa[ğg]l[ıi]k|klinik|doktor|di[şs]|fizyo|diyet|psikolog/, "saglik"], // i18n-ignore
  [/dan[ıi][şs]man|ko[çc]|terapi|hukuk|avukat|muhasebe/, "danismanlik"], // i18n-ignore
  [/veteriner|pet|hayvan|kedi|k[öo]pek/, "veteriner"], // i18n-ignore
  [/e[ğg]itim|kurs|ders|at[öo]lye|okul|m[üu]zik/, "egitim"], // i18n-ignore
  [/servis|tamir|teknik|bak[ıi]m|oto|ara[çc]|klima|temizlik/, "servis"], // i18n-ignore
];

/** Kategori için görsel: katalogdaki görsel, yoksa isimden tahmin, yoksa genel görsel. */
export function categoryImageFor(slug: string, label = ""): string {
  const known = CATEGORY_CATALOG.find((item) => item.slug === slug)?.image;
  if (known) return known;
  const text = `${slug} ${label}`.toLocaleLowerCase("tr-TR");
  const match = IMAGE_KEYWORDS.find(([pattern]) => pattern.test(text));
  return match ? CATEGORY_CATALOG.find((item) => item.slug === match[1])?.image ?? FALLBACK_CATEGORY_IMAGE : FALLBACK_CATEGORY_IMAGE;
}

/** Hızlı erişim çipleri için görselli ilk kategoriler. */
export const FEATURED_CATEGORIES = CATEGORY_CATALOG.filter((item) => item.image).slice(0, 8);

export function categoryHref(slug: string) {
  return `/kesfet?category=${encodeURIComponent(slug)}`;
}
