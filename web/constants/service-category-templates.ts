import { canonicalBusinessCategory } from "@/lib/business-categories";

export interface ServiceTemplate {
  name: string;
  description?: string;
  durationMinutes: number;
  audience?: "kadin" | "erkek";
}

export interface CategoryTemplate {
  name: string;
  icon: string;
  color: string;
  description: string;
  services: ServiceTemplate[];
}

export interface SectorTemplate {
  label: string;
  categories: CategoryTemplate[];
}

const service = (
  name: string,
  durationMinutes = 30,
  description?: string,
  audience?: "kadin" | "erkek",
): ServiceTemplate => ({ name, durationMinutes, description, audience });

/** Categories are customer-facing main headings; nested items are bookable services. */
export const SECTOR_TEMPLATES: Record<string, SectorTemplate> = {
  kuafor: {
    label: "Kuaför",
    categories: [
      {
        name: "Saç Hizmetleri", icon: "✂️", color: "#0ea5e9",
        description: "Kesim, renklendirme, şekillendirme ve profesyonel saç bakımları",
        services: [
          service("Saç Kesimi", 45), service("Çocuk Saç Kesimi", 30), service("Saç Yıkama", 15),
          service("Fön", 30), service("Kırık Fön", 35), service("Maşa", 45), service("Saç Bakımı", 45),
          service("Keratin Bakım", 90), service("Saç Botoksu", 90), service("Brezilya Fönü", 120),
          service("Perma", 120), service("Protez Saç", 120),
          service("Saç Boyama", 120, undefined, "kadin"), service("Saç Dip Boyama", 90, undefined, "kadin"),
          service("Komple Boya", 150, undefined, "kadin"), service("Saç Renk Değişimi", 180, undefined, "kadin"),
          service("Röfle & Gölge", 180, undefined, "kadin"), service("Ombre", 180, undefined, "kadin"),
          service("Balayage", 180, undefined, "kadin"), service("Sombre", 150, undefined, "kadin"),
          service("Topuz", 60, undefined, "kadin"), service("Örgü", 45, undefined, "kadin"),
          service("Nişan Saçı", 90, undefined, "kadin"), service("Gelin Saçı", 120, undefined, "kadin"),
          service("Gelin Başı (Tesettür)", 150, undefined, "kadin"), service("Saç Kaynak", 180, undefined, "kadin"),
          service("Saç & Sakal Tıraşı", 45, undefined, "erkek"), service("Sakal Tıraşı", 25, undefined, "erkek"),
          service("Damat Tıraşı", 60, undefined, "erkek"), service("Beyaz Kırıcı", 45, undefined, "erkek"),
        ],
      },
      {
        name: "Makyaj Hizmetleri", icon: "💄", color: "#ec4899",
        description: "Günlük, özel gün ve profesyonel makyaj uygulamaları",
        services: [service("Kaş Alma", 20, undefined, "kadin"), service("Dudak Üstü", 15, undefined, "kadin"), service("Günlük Makyaj", 45, undefined, "kadin"), service("Profesyonel Makyaj", 60, undefined, "kadin"), service("Gece Makyajı", 60, undefined, "kadin"), service("Gelin Makyajı", 90, undefined, "kadin"), service("Porselen Makyaj", 75, undefined, "kadin"), service("Kaş Laminasyonu", 45, undefined, "kadin"), service("Kirpik Lifting", 45, undefined, "kadin")],
      },
      {
        name: "Cilt Bakımı Hizmetleri", icon: "🧴", color: "#10b981",
        description: "Cilt analizi, arındırma, nem ve yenileme bakımları",
        services: [service("Cilt Analizi", 20), service("Klasik Cilt Bakımı", 60), service("Derinlemesine Cilt Bakımı", 75), service("Hydrafacial Bakım", 60), service("Leke Bakımı", 60), service("Anti-Aging Bakım", 60)],
      },
      {
        name: "Lazer Epilasyon Hizmetleri", icon: "⚡", color: "#f97316",
        description: "Kadın ve erkek için bölgesel lazer epilasyon seansları",
        services: [service("Tüm Vücut Lazer", 90), service("Yüz Bölgesi Lazer", 30), service("Koltuk Altı Lazer", 20), service("Kol Lazer", 30), service("Bacak Lazer", 45), service("Sırt & Göğüs Lazer", 45)],
      },
      {
        name: "Masaj Hizmetleri", icon: "💆", color: "#8b5cf6",
        description: "Rahatlama ve bakım odaklı profesyonel masajlar",
        services: [service("Klasik Masaj", 60), service("Aromaterapi Masajı", 60), service("Boyun & Sırt Masajı", 30), service("Ayak Masajı", 30), service("Medikal Masaj", 60)],
      },
    ],
  },
  berber: {
    label: "Berber",
    categories: [
      { name: "Saç & Sakal Hizmetleri", icon: "✂️", color: "#0ea5e9", description: "Kesim, tıraş ve şekillendirme", services: [service("Saç Kesimi", 30), service("Çocuk Saç Kesimi", 25), service("Saç Yıkama & Fön", 20), service("Sakal Tıraşı", 20, undefined, "erkek"), service("Saç & Sakal Tıraşı", 45, undefined, "erkek")] },
      { name: "Bakım Hizmetleri", icon: "💆", color: "#10b981", description: "Yüz, saç ve sakal bakımları", services: [service("Cilt Bakımı", 45), service("Sakal Bakımı", 30), service("Saç Bakımı", 30), service("Ağda & Alın Düzeltme", 20), service("Yüz Maskesi", 25)] },
      { name: "Renklendirme Hizmetleri", icon: "🎨", color: "#8b5cf6", description: "Saç ve sakal renklendirme", services: [service("Saç Boyama", 60), service("Sakal Boyama", 35), service("Beyaz Kapama", 45)] },
      { name: "Damat & Özel Gün", icon: "✨", color: "#ca8a04", description: "Özel gün hazırlık paketleri", services: [service("Damat Tıraşı", 75, undefined, "erkek"), service("Damat Bakım Paketi", 120, undefined, "erkek"), service("VIP Bakım Paketi", 90, undefined, "erkek")] },
    ],
  },
  guzellik: {
    label: "Güzellik Merkezi",
    categories: [
      { name: "Cilt Bakımı Hizmetleri", icon: "🧴", color: "#10b981", description: "Profesyonel cilt analizi ve bakımları", services: [service("Cilt Analizi", 20), service("Klasik Cilt Bakımı", 60), service("Hydrafacial", 60), service("Leke Bakımı", 60), service("Anti-Aging Bakım", 60)] },
      { name: "Epilasyon & Lazer", icon: "⚡", color: "#ef4444", description: "Lazer epilasyon ve ağda uygulamaları", services: [service("Tüm Vücut Lazer", 90), service("Bölgesel Lazer", 30), service("Kadın Ağda", 45), service("Erkek Ağda", 45)] },
      { name: "Kaş & Kirpik Hizmetleri", icon: "👁️", color: "#8b5cf6", description: "Kaş tasarımı ve kirpik uygulamaları", services: [service("Kaş Tasarımı", 30), service("Kaş Laminasyonu", 45), service("Kirpik Lifting", 45), service("İpek Kirpik", 90), service("Kirpik Dolgu", 60)] },
      { name: "Makyaj Hizmetleri", icon: "💄", color: "#ec4899", description: "Günlük ve özel gün makyajı", services: [service("Günlük Makyaj", 45), service("Gece Makyajı", 60), service("Gelin Makyajı", 90), service("Kalıcı Makyaj", 120)] },
      { name: "Masaj & Spa Hizmetleri", icon: "💆", color: "#06b6d4", description: "Masaj ve rahatlama bakımları", services: [service("Klasik Masaj", 60), service("Aromaterapi Masajı", 60), service("Bölgesel İncelme", 45), service("Lenf Drenaj", 45)] },
    ],
  },
  nail: {
    label: "Nail Studio",
    categories: [
      { name: "El & Ayak Bakımı", icon: "💅", color: "#ec4899", description: "Manikür, pedikür ve bakım", services: [service("Manikür", 45), service("Pedikür", 60), service("Spa Manikür", 60), service("Spa Pedikür", 75)] },
      { name: "Protez & Jel Tırnak", icon: "💎", color: "#8b5cf6", description: "Protez, jel ve güçlendirme uygulamaları", services: [service("Protez Tırnak", 120), service("Jel Tırnak", 90), service("Jel Güçlendirme", 75), service("Protez Tırnak Dolgu", 75), service("Protez/Jel Çıkarma", 45)] },
      { name: "Oje & Nail Art", icon: "🎨", color: "#f59e0b", description: "Kalıcı oje ve tasarım", services: [service("Kalıcı Oje", 60), service("Kalıcı Oje Çıkarma", 30), service("Nail Art", 30), service("French Uygulama", 30)] },
    ],
  },
  spa: {
    label: "Spa / Masaj",
    categories: [
      { name: "Masaj Terapileri", icon: "💆", color: "#14b8a6", description: "Rahatlatıcı ve terapötik masajlar", services: [service("Klasik Masaj", 60), service("Medikal Masaj", 60), service("Aromaterapi Masajı", 60), service("Derin Doku Masajı", 60), service("Çift Masajı", 60)] },
      { name: "Hamam & Islak Alan", icon: "🫧", color: "#06b6d4", description: "Hamam, kese ve sauna ritüelleri", services: [service("Hamam & Kese", 60), service("Köpük Masajı", 30), service("Sauna", 45), service("Buhar Odası", 30)] },
      { name: "Vücut Bakımları", icon: "✨", color: "#8b5cf6", description: "Arınma ve bölgesel bakımlar", services: [service("Vücut Peeling", 45), service("Bölgesel Bakım", 60), service("Lenf Drenaj", 45), service("Spa Paketi", 120)] },
    ],
  },
  spor: {
    label: "Spor / Personal Training",
    categories: [
      { name: "Bireysel Antrenman", icon: "🏋️", color: "#ef4444", description: "Kişiye özel antrenman hizmetleri", services: [service("Personal Training", 60), service("Fonksiyonel Antrenman", 60), service("Boks Antrenmanı", 60), service("Vücut Analizi", 30), service("Program Hazırlama", 45)] },
      { name: "Pilates & Yoga", icon: "🧘", color: "#8b5cf6", description: "Bireysel ve grup stüdyo dersleri", services: [service("Reformer Pilates", 50), service("Mat Pilates", 50), service("Yoga", 60), service("Hamile Pilatesi", 50)] },
      { name: "Grup Dersleri", icon: "👥", color: "#0ea5e9", description: "Enerjik grup egzersizleri", services: [service("HIIT", 45), service("Spinning", 45), service("Zumba", 50), service("Grup Fonksiyonel", 50)] },
    ],
  },
  saglik: {
    label: "Sağlık",
    categories: [
      { name: "Muayene & Kontrol", icon: "🩺", color: "#0ea5e9", description: "İlk muayene ve takip görüşmeleri", services: [service("İlk Muayene", 30), service("Kontrol Muayenesi", 20), service("Online Muayene", 30), service("Tetkik Değerlendirme", 20)] },
      { name: "Fizik Tedavi & Fizyoterapi", icon: "🦴", color: "#8b5cf6", description: "Değerlendirme ve terapi seansları", services: [service("Fizyoterapi Değerlendirme", 45), service("Fizik Tedavi Seansı", 60), service("Manuel Terapi", 45), service("Egzersiz Danışmanlığı", 45)] },
      { name: "Beslenme & Psikoloji", icon: "🧠", color: "#22c55e", description: "Bireysel danışmanlık seansları", services: [service("Diyetisyen İlk Görüşme", 45), service("Diyetisyen Kontrol", 30), service("Psikolojik Danışmanlık", 50), service("Çift Görüşmesi", 60)] },
      { name: "Diş Hizmetleri", icon: "🦷", color: "#f59e0b", description: "Diş muayene ve uygulamaları", services: [service("Diş Muayenesi", 30), service("Diş Taşı Temizliği", 45), service("Dolgu", 45), service("Beyazlatma", 60)] },
    ],
  },
  danismanlik: {
    label: "Danışmanlık",
    categories: [
      { name: "Bireysel Danışmanlık", icon: "🧠", color: "#8b5cf6", description: "Kişisel gelişim ve yaşam desteği", services: [service("Bireysel Seans", 50), service("Yaşam Koçluğu", 60), service("Kariyer Danışmanlığı", 60), service("Online Danışmanlık", 50)] },
      { name: "Aile & Çift Danışmanlığı", icon: "💑", color: "#ec4899", description: "Çift ve aile görüşmeleri", services: [service("Çift Görüşmesi", 60), service("Aile Danışmanlığı", 60), service("Ebeveyn Danışmanlığı", 50)] },
      { name: "Kurumsal Danışmanlık", icon: "🏢", color: "#f59e0b", description: "İşletme, hukuk ve finans desteği", services: [service("İşletme Danışmanlığı", 60), service("Hukuk Danışmanlığı", 45), service("Mali Danışmanlık", 60), service("Strateji Görüşmesi", 90)] },
      { name: "Eğitim Danışmanlığı", icon: "🎓", color: "#6366f1", description: "Öğrenci ve eğitim planlama", services: [service("Eğitim Planlama", 60), service("Tercih Danışmanlığı", 60), service("Öğrenci Koçluğu", 50)] },
    ],
  },
  veteriner: {
    label: "Veteriner",
    categories: [
      { name: "Muayene & Koruyucu Sağlık", icon: "🐾", color: "#f59e0b", description: "Muayene, aşı ve parazit uygulamaları", services: [service("Genel Muayene", 30), service("Kontrol Muayenesi", 20), service("Aşılama", 20), service("İç Parazit Uygulaması", 20), service("Dış Parazit Uygulaması", 20)] },
      { name: "Tahlil & Görüntüleme", icon: "🔬", color: "#6366f1", description: "Laboratuvar ve görüntüleme işlemleri", services: [service("Kan Tahlili", 30), service("Ultrason", 30), service("Röntgen", 30), service("Genel Tarama", 45)] },
      { name: "Pet Kuaför & Bakım", icon: "🛁", color: "#ec4899", description: "Yıkama, tıraş ve bakım", services: [service("Kedi Tıraşı", 60), service("Köpek Tıraşı", 90), service("Yıkama & Kurutma", 60), service("Tırnak Kesimi", 20)] },
      { name: "Operasyon & Diş", icon: "🏥", color: "#ef4444", description: "Operasyon öncesi görüşme ve ağız bakımı", services: [service("Operasyon Ön Görüşmesi", 30), service("Diş Kontrolü", 30), service("Diş Taşı Temizliği", 60)] },
    ],
  },
  egitim: {
    label: "Eğitim",
    categories: [
      { name: "Akademik Dersler", icon: "📚", color: "#0ea5e9", description: "Birebir ve grup akademik eğitim", services: [service("Birebir Ders", 60), service("Grup Dersi", 60), service("Sınav Hazırlık", 90), service("Ödev Desteği", 60)] },
      { name: "Dil Eğitimi", icon: "🌍", color: "#ec4899", description: "Yabancı dil dersleri", services: [service("İngilizce Dersi", 60), service("Almanca Dersi", 60), service("Konuşma Pratiği", 45), service("Online Dil Dersi", 60)] },
      { name: "Sanat & Müzik", icon: "🎨", color: "#f97316", description: "Enstrüman ve yaratıcı atölyeler", services: [service("Piyano Dersi", 60), service("Gitar Dersi", 60), service("Şan Dersi", 60), service("Resim Atölyesi", 90)] },
      { name: "Rehberlik & Koçluk", icon: "🧭", color: "#14b8a6", description: "Akademik takip ve planlama", services: [service("Öğrenci Koçluğu", 50), service("Tercih Danışmanlığı", 60), service("Çalışma Programı", 45)] },
    ],
  },
  servis: {
    label: "Servis / Teknik",
    categories: [
      { name: "Arıza & Onarım", icon: "🛠️", color: "#f59e0b", description: "Arıza tespiti ve onarım", services: [service("Arıza Tespiti", 60), service("Yerinde Onarım", 90), service("Uzaktan Destek", 30), service("Parça Değişimi", 60)] },
      { name: "Bakım Hizmetleri", icon: "🔧", color: "#64748b", description: "Planlı ve periyodik bakım", services: [service("Genel Bakım", 60), service("Periyodik Bakım", 90), service("Temizlik & Bakım", 60), service("Kontrol Randevusu", 45)] },
      { name: "Montaj & Kurulum", icon: "⚙️", color: "#0ea5e9", description: "Yeni ürün kurulumları", services: [service("Montaj", 90), service("Kurulum", 90), service("Söküm & Taşıma", 120)] },
      { name: "Keşif & Danışmanlık", icon: "🧭", color: "#22c55e", description: "Yerinde keşif ve ihtiyaç analizi", services: [service("Yerinde Keşif", 60), service("Teknik Danışmanlık", 60), service("Fiyatlandırma Görüşmesi", 30)] },
    ],
  },
  yazilim: {
    label: "Yazılım / Web / Dijital",
    categories: [
      { name: "Web & E-Ticaret", icon: "💻", color: "#0ea5e9", description: "Web sitesi ve e-ticaret çözümleri", services: [service("Kurumsal Web Sitesi Görüşmesi", 60), service("E-Ticaret Sitesi Görüşmesi", 60), service("Landing Page Görüşmesi", 45), service("Web Sitesi Bakım", 60)] },
      { name: "Yazılım & Mobil", icon: "⚙️", color: "#10b981", description: "Özel yazılım ve mobil ürünler", services: [service("Özel Yazılım Analizi", 90), service("Mobil Uygulama Görüşmesi", 60), service("Entegrasyon Danışmanlığı", 60), service("Teknik Destek", 45)] },
      { name: "Tasarım & İçerik", icon: "🎨", color: "#ec4899", description: "Dijital tasarım ve üretim", services: [service("UI/UX Tasarım Görüşmesi", 60), service("Logo & Kurumsal Kimlik", 60), service("Video Prodüksiyon Görüşmesi", 60), service("Sosyal Medya Danışmanlığı", 60)] },
    ],
  },
};

export function getCategoryTemplates(
  sector: string,
  businessType: "kadin" | "erkek" | "unisex" | "" = "unisex",
): CategoryTemplate[] {
  const normalizedSector = canonicalBusinessCategory(sector);
  const categories = SECTOR_TEMPLATES[normalizedSector]?.categories ?? [{
    name: "Genel Hizmetler",
    icon: "📋",
    color: "#64748b",
    description: "İşletmenizin temel hizmetleri",
    services: [service("Standart Hizmet", 30)],
  }];
  if (!businessType || businessType === "unisex") return categories;
  return categories
    .map((category) => ({
      ...category,
      services: category.services.filter((item) => !item.audience || item.audience === businessType),
    }))
    .filter((category) => category.services.length > 0);
}
