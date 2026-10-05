/**
 * Müşteri tarafındaki sabit kategori kataloğu: menü, alt bilgi ve /kategoriler sayfası
 * aynı listeyi kullanır. Sunucu ve istemci bileşenlerinden güvenle içe aktarılabilir.
 */
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
  { slug: "kuafor", label: "Kuaför", emoji: "💇", description: "Kesim, renklendirme ve saç bakımı", image: "/images/categories/kuafor.png", landing: "/kuafor-randevu", accent: "#1f7a4a" },
  { slug: "berber", label: "Berber", emoji: "💈", description: "Saç, sakal ve modern erkek bakımı", image: "/images/categories/berber.png", landing: "/berber-randevu", accent: "#2563eb" },
  { slug: "guzellik", label: "Güzellik Merkezi", emoji: "💅", description: "Cilt bakımı ve güzellik ritüelleri", image: "/images/categories/guzellik.png", landing: "/guzellik-merkezi-randevu", accent: "#db2777" },
  { slug: "spa", label: "Spa & Masaj", emoji: "🧖", description: "Rahatlama, masaj ve yenilenme", image: "/images/categories/spa.png", landing: "/spa-randevu", accent: "#b7791f" },
  { slug: "nail", label: "Nail Studio", emoji: "💎", description: "Manikür, pedikür ve nail art", image: "/images/categories/nail.png", landing: "/nail-studio-randevu", accent: "#7c3aed" },
  { slug: "spor", label: "Spor & PT", emoji: "🏋️", description: "Kişisel antrenman, pilates ve fitness", image: "/images/categories/spor.png", landing: "/spor-randevu", accent: "#65a30d" },
  { slug: "saglik", label: "Sağlık", emoji: "🩺", description: "Klinik, fizyoterapi ve diyetisyen", image: "/images/categories/saglik.png", landing: "/saglik-randevu", accent: "#0891b2" },
  { slug: "danismanlik", label: "Danışmanlık", emoji: "📋", description: "Terapi, koçluk ve uzman görüşmesi", image: "/images/categories/danismanlik.png", landing: "/danismanlik-randevu", accent: "#d97706" },
  { slug: "veteriner", label: "Veteriner", emoji: "🐾", description: "Dostların için güvenilir bakım", image: "/images/categories/veteriner.png", landing: "/veteriner-randevu", accent: "#e11d48" },
  { slug: "yazilim", label: "Yazılım & Web", emoji: "💻", description: "Web, mobil ve dijital çözümler", image: "/images/categories/yazilim.png", landing: "/yazilim-web-randevu", accent: "#4f46e5" },
  { slug: "egitim", label: "Eğitim", emoji: "📚", description: "Kurs, özel ders ve atölyeler", accent: "#0d9488" },
  { slug: "servis", label: "Servis & Teknik", emoji: "🔧", description: "Tamir, bakım ve teknik servis", accent: "#475569" },
];

/** Hızlı erişim çipleri için görselli ilk kategoriler. */
export const FEATURED_CATEGORIES = CATEGORY_CATALOG.filter((item) => item.image).slice(0, 8);

export function categoryHref(slug: string) {
  return `/kesfet?category=${encodeURIComponent(slug)}`;
}
