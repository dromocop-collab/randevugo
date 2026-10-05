/**
 * Kategori başına hazır başlangıç hizmetleri (süre + önerilen TRY fiyat aralığı).
 *
 * Grup ve hizmet adları constants/service-category-templates.ts (SECTOR_TEMPLATES) ile BİREBİR aynıdır;
 * böylece `templateKey` (`<grup>:<hizmet>`, normalize edilmiş) paneldeki "hazır kütüphane" ile çakışmaz ve
 * aynı hizmet ikinci kez eklenmez. Saf modül: node --test ile çalışır.
 */
import { normalizeTemplateKey } from "./setup-helpers.ts";

export interface StarterGroup {
  name: string;
  icon: string;
  color: string;
}

export interface StarterServiceTemplate {
  /** Kategori içinde benzersiz, URL güvenli kimlik. */
  id: string;
  group: StarterGroup;
  name: string;
  durationMinutes: number;
  priceMin: number;
  priceMax: number;
  /** İlk açılışta işaretli gelsin mi? */
  recommended?: boolean;
}

export interface StarterSelection {
  selected: boolean;
  price: number;
  durationMinutes: number;
}

export type StarterSelections = Record<string, StarterSelection>;

export interface StarterServicePlanItem {
  templateId: string;
  groupName: string;
  groupIcon: string;
  groupColor: string;
  groupKey: string;
  name: string;
  durationMinutes: number;
  price: number;
  templateKey: string;
}

const g = (name: string, icon: string, color: string): StarterGroup => ({ name, icon, color });

function slugId(value: string): string {
  return normalizeTemplateKey(value).replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function list(group: StarterGroup, rows: Array<[name: string, minutes: number, min: number, max: number, recommended?: boolean]>): StarterServiceTemplate[] {
  return rows.map(([name, durationMinutes, priceMin, priceMax, recommended]) => ({
    id: slugId(`${group.name}-${name}`),
    group,
    name,
    durationMinutes,
    priceMin,
    priceMax,
    recommended: recommended === true,
  }));
}

/* Grup tanımları (ikon/renk SECTOR_TEMPLATES ile aynı). */
const SAC = g("Saç Hizmetleri", "✂️", "#0ea5e9");
const MAKYAJ = g("Makyaj Hizmetleri", "💄", "#ec4899");
const SAC_SAKAL = g("Saç & Sakal Hizmetleri", "✂️", "#0ea5e9");
const BERBER_BAKIM = g("Bakım Hizmetleri", "💆", "#10b981");
const DAMAT = g("Damat & Özel Gün", "✨", "#ca8a04");
const CILT = g("Cilt Bakımı Hizmetleri", "🧴", "#10b981");
const LAZER = g("Epilasyon & Lazer", "⚡", "#ef4444");
const KAS = g("Kaş & Kirpik Hizmetleri", "👁️", "#8b5cf6");
const EL_AYAK = g("El & Ayak Bakımı", "💅", "#ec4899");
const PROTEZ = g("Protez & Jel Tırnak", "💎", "#8b5cf6");
const OJE = g("Oje & Nail Art", "🎨", "#f59e0b");
const MASAJ = g("Masaj Terapileri", "💆", "#14b8a6");
const HAMAM = g("Hamam & Islak Alan", "🫧", "#06b6d4");
const VUCUT = g("Vücut Bakımları", "✨", "#8b5cf6");
const PT = g("Bireysel Antrenman", "🏋️", "#ef4444");
const PILATES = g("Pilates & Yoga", "🧘", "#8b5cf6");
const MUAYENE = g("Muayene & Kontrol", "🩺", "#0ea5e9");
const FTR = g("Fizik Tedavi & Fizyoterapi", "🦴", "#8b5cf6");
const BESLENME = g("Beslenme & Psikoloji", "🧠", "#22c55e");
const BIREYSEL = g("Bireysel Danışmanlık", "🧠", "#8b5cf6");
const AILE = g("Aile & Çift Danışmanlığı", "💑", "#ec4899");
const KURUMSAL = g("Kurumsal Danışmanlık", "🏢", "#f59e0b");
const VET = g("Muayene & Koruyucu Sağlık", "🐾", "#f59e0b");
const PET = g("Pet Kuaför & Bakım", "🛁", "#ec4899");
const WEB = g("Web & E-Ticaret", "💻", "#0ea5e9");
const YAZILIM = g("Yazılım & Mobil", "⚙️", "#10b981");
const TASARIM = g("Tasarım & İçerik", "🎨", "#ec4899");
const AKADEMIK = g("Akademik Dersler", "📚", "#0ea5e9");
const DIL = g("Dil Eğitimi", "🌍", "#ec4899");
const SANAT = g("Sanat & Müzik", "🎨", "#f97316");
const ARIZA = g("Arıza & Onarım", "🛠️", "#f59e0b");
const SERVIS_BAKIM = g("Bakım Hizmetleri", "🔧", "#64748b");
const MONTAJ = g("Montaj & Kurulum", "⚙️", "#0ea5e9");
const KESIF = g("Keşif & Danışmanlık", "🧭", "#22c55e");
const GENEL = g("Genel Hizmetler", "📋", "#64748b");

export const STARTER_SERVICE_TEMPLATES: Record<string, StarterServiceTemplate[]> = {
  kuafor: [
    ...list(SAC, [
      ["Saç Kesimi", 45, 400, 900, true],
      ["Fön", 30, 250, 500, true],
      ["Saç Boyama", 120, 1200, 3000, true],
      ["Keratin Bakım", 90, 1500, 4000],
      ["Balayage", 180, 3000, 7000],
    ]),
    ...list(MAKYAJ, [["Kaş Alma", 20, 150, 350]]),
  ],
  berber: [
    ...list(SAC_SAKAL, [
      ["Saç Kesimi", 30, 300, 700, true],
      ["Sakal Tıraşı", 20, 150, 400, true],
      ["Saç & Sakal Tıraşı", 45, 450, 1000, true],
      ["Çocuk Saç Kesimi", 25, 200, 450],
    ]),
    ...list(BERBER_BAKIM, [["Cilt Bakımı", 45, 400, 1000]]),
    ...list(DAMAT, [["Damat Tıraşı", 75, 1500, 4000]]),
  ],
  guzellik: [
    ...list(CILT, [
      ["Klasik Cilt Bakımı", 60, 800, 1800, true],
      ["Hydrafacial", 60, 1500, 3500],
    ]),
    ...list(LAZER, [
      ["Bölgesel Lazer", 30, 500, 1500, true],
      ["Tüm Vücut Lazer", 90, 2500, 6000],
    ]),
    ...list(KAS, [
      ["Kaş Tasarımı", 30, 300, 700, true],
      ["Kirpik Lifting", 45, 700, 1500],
    ]),
  ],
  nail: [
    ...list(EL_AYAK, [
      ["Manikür", 45, 400, 800, true],
      ["Pedikür", 60, 500, 1000, true],
    ]),
    ...list(OJE, [
      ["Kalıcı Oje", 60, 500, 1000, true],
      ["Nail Art", 30, 200, 600],
    ]),
    ...list(PROTEZ, [
      ["Protez Tırnak", 120, 1200, 2500],
      ["Jel Güçlendirme", 75, 800, 1500],
    ]),
  ],
  spa: [
    ...list(MASAJ, [
      ["Klasik Masaj", 60, 1200, 2500, true],
      ["Aromaterapi Masajı", 60, 1400, 2800, true],
      ["Derin Doku Masajı", 60, 1500, 3000],
    ]),
    ...list(HAMAM, [
      ["Hamam & Kese", 60, 800, 1800, true],
      ["Köpük Masajı", 30, 500, 1000],
    ]),
    ...list(VUCUT, [["Spa Paketi", 120, 3000, 6000]]),
  ],
  spor: [
    ...list(PT, [
      ["Personal Training", 60, 800, 2000, true],
      ["Vücut Analizi", 30, 300, 700, true],
      ["Program Hazırlama", 45, 500, 1200],
    ]),
    ...list(PILATES, [
      ["Reformer Pilates", 50, 700, 1500, true],
      ["Mat Pilates", 50, 400, 900],
      ["Yoga", 60, 400, 900],
    ]),
  ],
  saglik: [
    ...list(MUAYENE, [
      ["İlk Muayene", 30, 1000, 2500, true],
      ["Kontrol Muayenesi", 20, 500, 1200, true],
      ["Online Muayene", 30, 800, 1800],
    ]),
    ...list(FTR, [["Fizik Tedavi Seansı", 60, 1000, 2500]]),
    ...list(BESLENME, [
      ["Diyetisyen İlk Görüşme", 45, 1000, 2500, true],
      ["Psikolojik Danışmanlık", 50, 1500, 3500],
    ]),
  ],
  danismanlik: [
    ...list(BIREYSEL, [
      ["Bireysel Seans", 50, 1200, 3000, true],
      ["Online Danışmanlık", 50, 1000, 2500, true],
      ["Kariyer Danışmanlığı", 60, 1500, 3500],
      ["Yaşam Koçluğu", 60, 1500, 3500],
    ]),
    ...list(AILE, [["Çift Görüşmesi", 60, 2000, 4000, true]]),
    ...list(KURUMSAL, [["İşletme Danışmanlığı", 60, 2500, 7500]]),
  ],
  veteriner: [
    ...list(VET, [
      ["Genel Muayene", 30, 600, 1500, true],
      ["Aşılama", 20, 500, 1500, true],
      ["İç Parazit Uygulaması", 20, 300, 800],
      ["Dış Parazit Uygulaması", 20, 400, 1000],
    ]),
    ...list(PET, [
      ["Yıkama & Kurutma", 60, 600, 1500, true],
      ["Tırnak Kesimi", 20, 150, 400],
    ]),
  ],
  yazilim: [
    ...list(WEB, [
      ["Kurumsal Web Sitesi Görüşmesi", 60, 500, 1500, true],
      ["E-Ticaret Sitesi Görüşmesi", 60, 500, 1500],
    ]),
    ...list(YAZILIM, [
      ["Özel Yazılım Analizi", 90, 2500, 7500, true],
      ["Teknik Destek", 45, 750, 2000, true],
    ]),
    ...list(TASARIM, [
      ["Logo & Kurumsal Kimlik", 60, 1000, 3000],
      ["Sosyal Medya Danışmanlığı", 60, 1000, 3000],
    ]),
  ],
  egitim: [
    ...list(AKADEMIK, [
      ["Birebir Ders", 60, 600, 1500, true],
      ["Grup Dersi", 60, 300, 800, true],
      ["Sınav Hazırlık", 90, 900, 2200],
    ]),
    ...list(DIL, [
      ["İngilizce Dersi", 60, 600, 1500, true],
      ["Konuşma Pratiği", 45, 400, 1000],
    ]),
    ...list(SANAT, [["Piyano Dersi", 60, 700, 1600]]),
  ],
  servis: [
    ...list(ARIZA, [
      ["Arıza Tespiti", 60, 500, 1200, true],
      ["Yerinde Onarım", 90, 1000, 3000, true],
      ["Uzaktan Destek", 30, 300, 800],
    ]),
    ...list(SERVIS_BAKIM, [["Periyodik Bakım", 90, 1000, 2500, true]]),
    ...list(MONTAJ, [["Montaj", 90, 800, 2500]]),
    ...list(KESIF, [["Yerinde Keşif", 60, 300, 1000]]),
  ],
  diger: list(GENEL, [
    ["Ön Görüşme", 30, 300, 800, true],
    ["Standart Hizmet", 45, 500, 1500, true],
    ["Kapsamlı Hizmet", 90, 1000, 3000],
  ]),
};

/** Kategori takma adları (lib/business-categories.ts ile uyumlu, saf kopya). */
const ALIASES: Record<string, string> = {
  "kadin-kuaforu": "kuafor", "kuafor-salonu": "kuafor",
  "erkek-kuaforu": "berber",
  "guzellik-merkezi": "guzellik", estetik: "guzellik",
  "nail-studio": "nail", tirnak: "nail", "tirnak-bakimi": "nail",
  "spa-masaj": "spa", masaj: "spa", wellness: "spa",
  "spor-pt": "spor", "personal-training": "spor", fitness: "spor", pilates: "spor",
  klinik: "saglik", fizyoterapi: "saglik", diyetisyen: "saglik",
  terapi: "danismanlik", psikoloji: "danismanlik", kocluk: "danismanlik",
  "veteriner-klinigi": "veteriner", "pet-kuafor": "veteriner",
  kurs: "egitim", "ozel-ders": "egitim",
  "teknik-servis": "servis", tamir: "servis",
  "yazilim-web": "yazilim", "yazilim-web-video": "yazilim", web: "yazilim",
};

export function starterCategoryKey(category: string): string {
  const key = (category || "").trim().toLowerCase();
  const canonical = ALIASES[key] ?? key;
  return STARTER_SERVICE_TEMPLATES[canonical] ? canonical : "diger";
}

export function getStarterTemplates(category: string): StarterServiceTemplate[] {
  return STARTER_SERVICE_TEMPLATES[starterCategoryKey(category)]!;
}

/** Önerilen fiyat: aralığın ortası, 50 TL'ye yuvarlanmış. */
export function suggestedPrice(template: Pick<StarterServiceTemplate, "priceMin" | "priceMax">): number {
  return Math.max(50, Math.round((template.priceMin + template.priceMax) / 2 / 50) * 50);
}

export function formatPriceRange(template: Pick<StarterServiceTemplate, "priceMin" | "priceMax">): string {
  return `₺${template.priceMin.toLocaleString("tr-TR")}–${template.priceMax.toLocaleString("tr-TR")}`;
}

export function defaultStarterSelections(category: string): StarterSelections {
  const out: StarterSelections = {};
  getStarterTemplates(category).forEach((template) => {
    out[template.id] = { selected: template.recommended === true, price: suggestedPrice(template), durationMinutes: template.durationMinutes };
  });
  return out;
}

/** Önizleme için ilk üç örnek hizmet (işaretliler öncelikli). */
export function previewServices(category: string, selections?: StarterSelections, limit = 3) {
  const templates = getStarterTemplates(category);
  const chosen = selections ? templates.filter((item) => selections[item.id]?.selected) : templates.filter((item) => item.recommended);
  const source = chosen.length ? chosen : templates;
  return source.slice(0, limit).map((item) => ({
    id: item.id,
    name: item.name,
    durationMinutes: selections?.[item.id]?.durationMinutes ?? item.durationMinutes,
    price: selections?.[item.id]?.price ?? suggestedPrice(item),
  }));
}

export function serviceTemplateKey(groupName: string, serviceName: string): string {
  return `${normalizeTemplateKey(groupName)}:${normalizeTemplateKey(serviceName)}`;
}

/**
 * Seçimlerden oluşturulacak hizmet listesini üretir. Geçersiz fiyat/süreler elenir,
 * süre 5–600 dk, fiyat 1–1.000.000 TL aralığına sıkıştırılır.
 */
export function buildStarterServicePlan(category: string, selections: StarterSelections): StarterServicePlanItem[] {
  return getStarterTemplates(category).flatMap((template) => {
    const choice = selections[template.id];
    if (!choice?.selected) return [];
    const price = Math.round(Number(choice.price));
    const durationMinutes = Math.round(Number(choice.durationMinutes));
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(durationMinutes) || durationMinutes < 5) return [];
    return [{
      templateId: template.id,
      groupName: template.group.name,
      groupIcon: template.group.icon,
      groupColor: template.group.color,
      groupKey: normalizeTemplateKey(template.group.name),
      name: template.name,
      durationMinutes: Math.min(600, durationMinutes),
      price: Math.min(1_000_000, price),
      templateKey: serviceTemplateKey(template.group.name, template.name),
    }];
  });
}

/** Mevcut hizmetlere göre yalnızca eksik olanları döndürür (idempotent yeniden çalıştırma). */
export function missingPlanItems(
  plan: readonly StarterServicePlanItem[],
  existing: ReadonlyArray<{ name: string; templateKey?: string }>,
): StarterServicePlanItem[] {
  const keys = new Set(existing.map((item) => item.templateKey).filter(Boolean));
  const names = new Set(existing.map((item) => normalizeTemplateKey(item.name)));
  return plan.filter((item) => !keys.has(item.templateKey) && !names.has(normalizeTemplateKey(item.name)));
}
