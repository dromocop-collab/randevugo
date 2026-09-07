export interface CategoryTemplate {
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export interface SectorTemplate {
  label: string;
  categories: CategoryTemplate[];
}

/**
 * Industry-specific service category templates.
 * When a business selects its sector, these templates can be auto-seeded.
 */
export const SECTOR_TEMPLATES: Record<string, SectorTemplate> = {
  kuafor: {
    label: "Kuaför",
    categories: [
      { name: "Saç Kesim", icon: "✂️", color: "#0ea5e9", description: "Kadın, erkek ve çocuk kesimleri" },
      { name: "Saç Boyama", icon: "🎨", color: "#8b5cf6", description: "Dip, komple ve tonlama işlemleri" },
      { name: "Röfle / Meç", icon: "✨", color: "#f97316", description: "Işıltı, röfle ve meç uygulamaları" },
      { name: "Ombre / Balayage", icon: "🌈", color: "#d946ef", description: "Geçişli renklendirme teknikleri" },
      { name: "Fön / Şekillendirme", icon: "💨", color: "#f59e0b", description: "Fön, maşa, dalga ve şekillendirme" },
      { name: "Saç Bakımı", icon: "💆", color: "#10b981", description: "Nem, onarım ve saç derisi bakımları" },
      { name: "Keratin / Botoks", icon: "✨", color: "#ec4899", description: "Düzleştirme ve yoğun bakım" },
      { name: "Gelin Saçı / Topuz", icon: "👰", color: "#f43f5e", description: "Özel gün saçı ve profesyonel topuz" },
      { name: "Perma", icon: "🌀", color: "#14b8a6", description: "Kalıcı dalga ve bukle işlemleri" },
      { name: "Saç Ekleme / Kaynak", icon: "🔗", color: "#6366f1", description: "Kaynak, çıtçıt ve saç uzatma" },
    ],
  },
  berber: {
    label: "Berber",
    categories: [
      { name: "Saç Kesim", icon: "✂️", color: "#0ea5e9" },
      { name: "Sakal Tıraşı", icon: "🪒", color: "#64748b" },
      { name: "Sakal Şekillendirme", icon: "🧔", color: "#8b5cf6" },
      { name: "Cilt Bakımı", icon: "💆", color: "#10b981" },
      { name: "Yıkama & Masaj", icon: "🚿", color: "#06b6d4" },
      { name: "Ağda / Alın Düzeltme", icon: "🧹", color: "#f59e0b" },
      { name: "Saç Boyama / Beyaz Kapama", icon: "🎨", color: "#334155", description: "Renklendirme ve beyaz kapatma işlemleri" },
      { name: "Damat Bakımı", icon: "✨", color: "#ca8a04", description: "Özel gün saç, sakal ve bakım paketi" },
    ],
  },
  guzellik: {
    label: "Güzellik Merkezi",
    categories: [
      { name: "Cilt Bakımı", icon: "🧴", color: "#10b981" },
      { name: "Makyaj", icon: "💄", color: "#ec4899" },
      { name: "Epilasyon / Ağda", icon: "✨", color: "#f59e0b" },
      { name: "Kaş & Kirpik", icon: "👁️", color: "#8b5cf6" },
      { name: "İpek Kirpik", icon: "🦋", color: "#6366f1" },
      { name: "Kalıcı Makyaj", icon: "🖌️", color: "#d946ef" },
      { name: "Lazer Epilasyon", icon: "⚡", color: "#ef4444" },
      { name: "Masaj & SPA", icon: "💆‍♀️", color: "#06b6d4" },
    ],
  },
  nail: {
    label: "Nail Studio",
    categories: [
      { name: "Manikür", icon: "💅", color: "#ec4899" },
      { name: "Pedikür", icon: "🦶", color: "#10b981" },
      { name: "Protez Tırnak", icon: "💎", color: "#8b5cf6" },
      { name: "Nail Art", icon: "🎨", color: "#f59e0b" },
      { name: "Jel Tırnak", icon: "✨", color: "#d946ef" },
      { name: "Tırnak Bakımı", icon: "🧴", color: "#06b6d4" },
      { name: "Kalıcı Oje", icon: "💅", color: "#f43f5e", description: "Kalıcı oje uygulama ve yenileme" },
      { name: "Protez / Jel Çıkarma", icon: "🫧", color: "#64748b", description: "Güvenli çıkarma ve bakım işlemleri" },
    ],
  },
  spa: {
    label: "Spa / Masaj",
    categories: [
      { name: "Klasik Masaj", icon: "💆", color: "#14b8a6", description: "Rahatlatıcı tüm vücut masajı" },
      { name: "Medikal Masaj", icon: "👐", color: "#0ea5e9", description: "Bölgesel ve terapötik uygulamalar" },
      { name: "Aromaterapi", icon: "🌿", color: "#22c55e", description: "Aromatik yağlarla bakım" },
      { name: "Hamam / Kese", icon: "🫧", color: "#06b6d4", description: "Geleneksel hamam ritüelleri" },
      { name: "Sauna", icon: "♨️", color: "#f97316", description: "Sauna ve buhar seansları" },
      { name: "Çift Masajı", icon: "💞", color: "#ec4899", description: "İki kişilik eş zamanlı seans" },
      { name: "Bölgesel Bakım", icon: "✨", color: "#8b5cf6", description: "Sıkılaşma ve bölgesel uygulamalar" },
      { name: "Spa Paketi", icon: "🎁", color: "#eab308", description: "Birleşik bakım ve dinlenme ritüelleri" },
    ],
  },
  spor: {
    label: "Spor / Personal Training",
    categories: [
      { name: "Personal Training", icon: "🏋️", color: "#ef4444" },
      { name: "Grup Dersi", icon: "👥", color: "#0ea5e9" },
      { name: "Pilates", icon: "🧘", color: "#8b5cf6" },
      { name: "Yoga", icon: "🧘‍♀️", color: "#10b981" },
      { name: "Fonksiyonel Antrenman", icon: "💪", color: "#f59e0b" },
      { name: "Boks / Kickbox", icon: "🥊", color: "#64748b" },
      { name: "Reformer Pilates", icon: "🧘", color: "#ec4899", description: "Bireysel ve grup reformer seansları" },
      { name: "Ölçüm / Programlama", icon: "📊", color: "#14b8a6", description: "Vücut analizi ve antrenman planı" },
    ],
  },
  saglik: {
    label: "Sağlık",
    categories: [
      { name: "Muayene", icon: "🩺", color: "#0ea5e9" },
      { name: "Kontrol", icon: "📋", color: "#10b981" },
      { name: "Fizik Tedavi", icon: "🦴", color: "#8b5cf6" },
      { name: "Diş", icon: "🦷", color: "#f59e0b" },
      { name: "Göz", icon: "👁️", color: "#06b6d4" },
      { name: "Beslenme / Diyet", icon: "🥗", color: "#22c55e" },
      { name: "Psikolojik Danışmanlık", icon: "🧠", color: "#a855f7", description: "Bireysel görüşme ve değerlendirme" },
      { name: "Fizyoterapi", icon: "👐", color: "#14b8a6", description: "Hareket değerlendirmesi ve terapi" },
      { name: "Laboratuvar / Tetkik", icon: "🧪", color: "#6366f1", description: "Tahlil ve ölçüm randevuları" },
      { name: "Online Görüşme", icon: "💻", color: "#0ea5e9", description: "Uzaktan sağlık danışmanlığı" },
    ],
  },
  danismanlik: {
    label: "Danışmanlık",
    categories: [
      { name: "Bireysel Seans", icon: "🧠", color: "#8b5cf6" },
      { name: "Çift Terapisi", icon: "💑", color: "#ec4899" },
      { name: "Kariyer Danışmanlığı", icon: "💼", color: "#0ea5e9" },
      { name: "Hukuk", icon: "⚖️", color: "#64748b" },
      { name: "Mali Müşavirlik", icon: "📊", color: "#10b981" },
      { name: "Yaşam Koçluğu", icon: "🌱", color: "#22c55e", description: "Hedef ve gelişim görüşmeleri" },
      { name: "İşletme Danışmanlığı", icon: "🏢", color: "#f59e0b", description: "Strateji ve operasyon görüşmeleri" },
      { name: "Eğitim Danışmanlığı", icon: "🎓", color: "#6366f1", description: "Okul, bölüm ve eğitim planlama" },
      { name: "Online Danışmanlık", icon: "💻", color: "#06b6d4", description: "Görüntülü uzaktan görüşme" },
    ],
  },
  veteriner: {
    label: "Veteriner",
    categories: [
      { name: "Muayene", icon: "🐾", color: "#f59e0b" },
      { name: "Aşılama", icon: "💉", color: "#10b981" },
      { name: "Tıraş & Bakım", icon: "✂️", color: "#0ea5e9" },
      { name: "Diş Bakımı", icon: "🦷", color: "#8b5cf6" },
      { name: "Operasyon", icon: "🏥", color: "#ef4444" },
      { name: "Parazit Uygulaması", icon: "🛡️", color: "#14b8a6", description: "İç ve dış parazit uygulamaları" },
      { name: "Tahlil / Görüntüleme", icon: "🔬", color: "#6366f1", description: "Kan tahlili, ultrason ve görüntüleme" },
      { name: "Pet Kuaför", icon: "🛁", color: "#ec4899", description: "Yıkama, tarama ve profesyonel bakım" },
      { name: "Beslenme Danışmanlığı", icon: "🥣", color: "#22c55e", description: "Mama ve beslenme planlaması" },
    ],
  },
  egitim: {
    label: "Eğitim",
    categories: [
      { name: "Birebir Ders", icon: "📚", color: "#0ea5e9" },
      { name: "Grup Dersi", icon: "👥", color: "#8b5cf6" },
      { name: "Online Ders", icon: "💻", color: "#10b981" },
      { name: "Sınav Hazırlık", icon: "📝", color: "#f59e0b" },
      { name: "Dil Eğitimi", icon: "🌍", color: "#ec4899" },
      { name: "Müzik Dersi", icon: "🎵", color: "#f43f5e", description: "Enstrüman ve şan dersleri" },
      { name: "Sanat Atölyesi", icon: "🎨", color: "#f97316", description: "Resim, tasarım ve yaratıcı atölyeler" },
      { name: "Rehberlik / Koçluk", icon: "🧭", color: "#14b8a6", description: "Akademik takip ve öğrenci koçluğu" },
    ],
  },
  servis: {
    label: "Servis / Teknik",
    categories: [
      { name: "Bakım", icon: "🔧", color: "#64748b" },
      { name: "Onarım", icon: "🛠️", color: "#f59e0b" },
      { name: "Montaj", icon: "⚙️", color: "#0ea5e9" },
      { name: "Kontrol", icon: "📋", color: "#10b981" },
      { name: "Temizlik", icon: "🧹", color: "#8b5cf6" },
      { name: "Arıza Tespiti", icon: "🔍", color: "#ef4444", description: "Yerinde veya uzaktan arıza analizi" },
      { name: "Periyodik Bakım", icon: "📅", color: "#06b6d4", description: "Planlı kontrol ve bakım randevuları" },
      { name: "Danışmanlık / Keşif", icon: "🧭", color: "#22c55e", description: "İhtiyaç analizi ve ön keşif" },
    ],
  },
  yazilim: {
    label: "Yazılım / Web / Dijital",
    categories: [
      { name: "Web Sitesi", icon: "💻", color: "#0ea5e9" },
      { name: "Mobil Uygulama", icon: "📱", color: "#8b5cf6" },
      { name: "Özel Yazılım", icon: "⚙️", color: "#10b981" },
      { name: "E-Ticaret", icon: "🛒", color: "#f59e0b" },
      { name: "UI / UX Tasarım", icon: "🎨", color: "#ec4899" },
      { name: "Bakım & Destek", icon: "🛠️", color: "#64748b" },
      { name: "Video Prodüksiyon", icon: "🎬", color: "#ef4444" },
      { name: "Sosyal Medya", icon: "📣", color: "#06b6d4" },
    ],
  },
};

/**
 * Get category templates for a given business sector.
 * Falls back to a generic set if sector is unknown.
 */
export function getCategoryTemplates(
  sector: string
): CategoryTemplate[] {
  const normalizedSector = canonicalBusinessCategory(sector);

  return SECTOR_TEMPLATES[normalizedSector]?.categories ?? [
    { name: "Genel", icon: "📋", color: "#64748b", description: "Genel hizmet kategorisi" },
  ];
}
import { canonicalBusinessCategory } from "@/lib/business-categories";
