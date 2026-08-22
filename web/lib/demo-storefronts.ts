import type { Business, DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";

type DemoService = readonly [name: string, description: string, duration: number, price: number];

interface DemoDefinition {
  id: string;
  title: string;
  storeName: string;
  description: string;
  icon: string;
  staffTitle: string;
  services: readonly DemoService[];
}

export interface DemoStorefront {
  business: Business;
  workingHours: DaySchedule[];
  services: Service[];
  staff: Staff[];
  serviceCategories: ServiceCategory[];
}

const NOW = "2026-01-01T00:00:00.000Z";

const DEFINITIONS: readonly DemoDefinition[] = [
  { id: "kuafor", title: "Kuaför", storeName: "Örnek Saç Atölyesi", description: "Kesimden renklendirmeye, saçına iyi gelecek profesyonel dokunuşları keşfet.", icon: "💇", staffTitle: "Saç Tasarım Uzmanı", services: [["Saç Kesimi & Şekillendirme", "Yüz tipine uygun kesim ve profesyonel şekillendirme.", 60, 900], ["Boya & Renk Danışmanlığı", "Kişiye özel renk analizi ve uygulama.", 120, 2400], ["Fön & Bakım", "Yoğun bakım ve kalıcı fön deneyimi.", 45, 650]] },
  { id: "berber", title: "Berber", storeName: "Örnek Centilmen Berber", description: "Modern kesim, sakal tasarımı ve erkek bakımını aynı deneyimde buluştur.", icon: "💈", staffTitle: "Berber & Stil Uzmanı", services: [["Saç & Sakal Paketi", "Kesim, sakal tasarımı ve sıcak havlu bakımı.", 60, 850], ["Modern Erkek Kesimi", "Saç yapısına ve stile uygun profesyonel kesim.", 40, 550], ["Damat Bakımı", "Özel günlere eksiksiz hazırlık ritüeli.", 90, 1800]] },
  { id: "guzellik", title: "Güzellik", storeName: "Örnek Işıltı Güzellik", description: "Cilt bakımı, kaş-kirpik ve makyaj hizmetleriyle kendine ayırdığın zamanı güzelleştir.", icon: "✨", staffTitle: "Güzellik Uzmanı", services: [["Profesyonel Cilt Bakımı", "Cilt analizi ve ihtiyaca özel bakım protokolü.", 75, 1400], ["Kaş & Kirpik Tasarımı", "Yüz hatlarına uygun doğal ve dengeli görünüm.", 50, 950], ["Profesyonel Makyaj", "Güne veya özel davete uygun kalıcı makyaj.", 60, 1650]] },
  { id: "nail", title: "Nail Studio", storeName: "Örnek Nail Lab", description: "Bakımlı eller ve özgün tasarımlar için modern nail studio deneyimi.", icon: "💅", staffTitle: "Nail Artist", services: [["Manikür", "Tırnak ve el bakımı, şekillendirme ve bakım.", 45, 600], ["Kalıcı Oje", "Uzun süre dayanıklı renk ve profesyonel uygulama.", 60, 850], ["Nail Art Tasarımı", "Tarzına özel detaylı tırnak tasarımı.", 90, 1350]] },
  { id: "spa", title: "Spa & Masaj", storeName: "Örnek Huzur Spa", description: "Günün temposunu geride bırakacağın dinlendirici masaj ve spa ritüelleri.", icon: "🌿", staffTitle: "Masaj Terapisti", services: [["Aromaterapi Masajı", "Doğal yağlarla zihni ve bedeni dinlendiren ritüel.", 60, 1600], ["Klasik Masaj", "Kas gerginliğini azaltmaya yardımcı uygulama.", 50, 1300], ["Spa Yenilenme Ritüeli", "Peeling, bakım ve masajı buluşturan deneyim.", 120, 2900]] },
  { id: "spor", title: "Spor", storeName: "Örnek Performans Stüdyo", description: "Hedeflerine uygun kişisel antrenman, pilates ve performans programları.", icon: "🏋️", staffTitle: "Kişisel Antrenör", services: [["Kişisel Antrenman", "Hedef ve seviyene göre birebir çalışma.", 60, 1100], ["Reformer Pilates", "Kontrollü hareketlerle güç ve esneklik seansı.", 50, 900], ["Performans Analizi", "Ölçüm, hedeflendirme ve kişisel program tasarımı.", 75, 1450]] },
  { id: "saglik", title: "Sağlık", storeName: "Örnek Sağlıklı Yaşam Merkezi", description: "Uzman görüşmeleri ve takip seanslarıyla iyi yaşam yolculuğunu planla.", icon: "🩺", staffTitle: "Sağlık Danışmanı", services: [["Uzman Görüşmesi", "İhtiyaçların için kapsamlı ilk değerlendirme.", 45, 1250], ["Kontrol Seansı", "Gelişim takibi ve kişisel plan güncellemesi.", 30, 850], ["Sağlıklı Yaşam Danışmanlığı", "Sürdürülebilir alışkanlıklar için yol haritası.", 60, 1400]] },
  { id: "veteriner", title: "Veteriner", storeName: "Örnek Pati Veteriner", description: "Dostlarının sağlığı, rutin kontrolleri ve bakımı için güven veren hizmetler.", icon: "🐾", staffTitle: "Veteriner Hekim", services: [["Genel Muayene", "Dostun için kapsamlı sağlık değerlendirmesi.", 30, 900], ["Aşı & Takip", "Yaşına uygun aşı planı ve düzenli takip.", 30, 750], ["Tırnak & Temel Bakım", "Konforlu ve özenli temel bakım uygulaması.", 40, 650]] },
  { id: "danismanlik", title: "Danışmanlık", storeName: "Örnek Pusula Danışmanlık", description: "Kararlarını netleştirecek uzman görüşmeleri ve uygulanabilir stratejiler.", icon: "🧭", staffTitle: "Kıdemli Danışman", services: [["İlk Görüşme", "Hedef ve ihtiyaçların birlikte analiz edilir.", 45, 1200], ["Strateji Seansı", "Somut adımlar içeren kişisel yol haritası.", 75, 2100], ["Takip Görüşmesi", "İlerlemenin değerlendirilmesi ve plan güncellemesi.", 30, 850]] },
  { id: "yazilim", title: "Yazılım", storeName: "Örnek Dijital Stüdyo", description: "Web, mobil uygulama ve e-ticaret projeleri için uçtan uca dijital çözümler.", icon: "💻", staffTitle: "Yazılım Çözüm Uzmanı", services: [["Kurumsal Web Sitesi", "Hızlı, güvenli ve mobil uyumlu kurumsal web deneyimi.", 60, 35000], ["Mobil Uygulama Analizi", "iOS ve Android projen için kapsam ve teknik yol haritası.", 75, 4500], ["E-ticaret Kurulumu", "Satışa hazır, ödeme ve ürün yönetimi entegre mağaza.", 90, 55000]] },
];

const byCategory = new Map(DEFINITIONS.map((definition) => [definition.id, definition]));
const bySlug = new Map(DEFINITIONS.map((definition) => [`ornek-${definition.id}-magazasi`, definition]));

function makeDemo(definition: DemoDefinition): DemoStorefront {
  const slug = `ornek-${definition.id}-magazasi`;
  const categoryID = `demo-category-${definition.id}`;
  const services: Service[] = definition.services.map(([name, description, durationMinutes, price], index) => ({
    id: `demo-${definition.id}-service-${index + 1}`, createdAt: NOW, updatedAt: NOW,
    name, description, category: categoryID, price, durationMinutes, currency: "TRY",
    isActive: true, isBookableOnline: false, requiresDeposit: false, depositAmount: 0,
    assignableStaffIds: [`demo-${definition.id}-staff`], sortOrder: index,
  }));
  const workingHours: DaySchedule[] = Array.from({ length: 7 }, (_, day) => ({ day, isOpen: day !== 0, start: "09:00", end: "18:00" }));
  return {
    business: {
      id: `demo-${definition.id}`, createdAt: NOW, updatedAt: NOW, ownerUid: "demo", slug,
      name: definition.storeName, description: definition.description, category: definition.id,
      phone: "", email: "", address: "Örnek vitrin", city: "", district: "",
      logoUrl: `/images/categories/${definition.id}.png`, coverUrl: `/images/categories/${definition.id}.png`, galleryUrls: [],
      isPublished: true, status: "active", approvalStatus: "approved", storePosition: 1,
      minimumBookingNoticeMinutes: 60, maximumBookingDaysAhead: 30, appointmentBufferMinutes: 0,
      slotIntervalMinutes: 30, rating: 0, reviewCount: 0, plan: "FREE", isVerified: false,
    },
    workingHours,
    services,
    staff: [{
      id: `demo-${definition.id}-staff`, createdAt: NOW, updatedAt: NOW, fullName: "Örnek Uzman",
      phone: "", email: "", position: definition.staffTitle, isActive: true,
      serviceIds: services.map((service) => service.id), workingHours, leaveDates: [], appointmentCapacity: 1, sortOrder: 0,
    }],
    serviceCategories: [{ id: categoryID, createdAt: NOW, updatedAt: NOW, name: definition.title, icon: definition.icon, color: "#0B6B45", sortOrder: 0 }],
  };
}

export function getDemoStorefrontByCategory(category: string): DemoStorefront | null {
  const definition = byCategory.get(category);
  return definition ? makeDemo(definition) : null;
}

export function getDemoStorefrontBySlug(slug: string): DemoStorefront | null {
  const definition = bySlug.get(slug);
  return definition ? makeDemo(definition) : null;
}

export function isDemoBusiness(business: Business): boolean {
  return business.id.startsWith("demo-");
}
