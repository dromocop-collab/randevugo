export interface CategoryTemplate {
  name: string;
  icon: string;
  color: string;
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
      { name: "Saç Kesim", icon: "✂️", color: "#0ea5e9" },
      { name: "Saç Boyama", icon: "🎨", color: "#8b5cf6" },
      { name: "Ombre / Balayage", icon: "🌈", color: "#d946ef" },
      { name: "Fön / Şekillendirme", icon: "💨", color: "#f59e0b" },
      { name: "Saç Bakımı", icon: "💆", color: "#10b981" },
      { name: "Keratin / Botoks", icon: "✨", color: "#ec4899" },
      { name: "Gelin Saçı", icon: "👰", color: "#f43f5e" },
      { name: "Saç Ekleme / Kaynak", icon: "🔗", color: "#6366f1" },
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
    ],
  },
};

/**
 * Get category templates for a given business sector.
 * Falls back to a generic set if sector is unknown.
 */
export function getCategoryTemplates(sector: string): CategoryTemplate[] {
  return SECTOR_TEMPLATES[sector]?.categories ?? [
    { name: "Genel", icon: "📋", color: "#64748b" },
  ];
}
