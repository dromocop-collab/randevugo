/**
 * Türkçe SEO metni yardımcıları (saf modül, test edilebilir).
 * Metinler gerçek veriden üretilir; veri yoksa ilgili cümle hiç yazılmaz.
 */

const BACK_VOWELS = "aıou";
const FRONT_VOWELS = "eiöü";
const HARD_CONSONANTS = "fstkçşhp";

function lastVowel(word: string): string | undefined {
  const lower = word.toLocaleLowerCase("tr-TR");
  for (let index = lower.length - 1; index >= 0; index--) {
    const char = lower[index];
    if (BACK_VOWELS.includes(char) || FRONT_VOWELS.includes(char) || "âîû".includes(char)) return char;
  }
  return undefined;
}

/** Bulunma eki: "Muğla" → "Muğla'da", "İzmir" → "İzmir'de", "Uşak" → "Uşak'ta". */
export function locative(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) return trimmed;
  const vowel = lastVowel(trimmed);
  const front = vowel ? FRONT_VOWELS.includes(vowel) || vowel === "î" : false;
  const lastChar = trimmed.toLocaleLowerCase("tr-TR").slice(-1);
  const consonant = HARD_CONSONANTS.includes(lastChar) ? "t" : "d";
  return `${trimmed}'${consonant}${front ? "e" : "a"}`;
}

/** "Muğla" → "Muğla'daki". */
export function locativeAdjective(word: string): string {
  const base = locative(word);
  return base ? `${base}ki` : base;
}

/** Birden çok boşluğu sadeleştirir, en fazla `max` karakterde kelime sınırından keser. */
export function fitDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > max * 0.6 ? slice.slice(0, cut) : slice).replace(/[\s,;:.–-]+$/u, "")}…`;
}

/** Açıklama 140 karakterden kısaysa sırayla ek cümleler ekler, sonra 160'a sığdırır. */
export function composeDescription(parts: (string | false | null | undefined)[], { min = 140, max = 160 } = {}): string {
  const sentences = parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).map((part) => part.trim());
  let text = "";
  for (const sentence of sentences) {
    if (text.length >= min) break;
    const candidate = text ? `${text} ${sentence}` : sentence;
    if (text && candidate.length > max) continue;
    text = candidate;
  }
  return fitDescription(text, max);
}

/** "a", "a ve b", "a, b ve c". */
export function joinTurkish(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} ve ${list[list.length - 1]}`;
}

/** 1250 → "1.250 ₺". */
export function formatTry(amount: number): string {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.round(amount))} ₺`;
}

export function capitalizeTr(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1) : value;
}

/** Tamamı büyük harfle girilmiş yer adlarını düzeltir: "FETHİYE" → "Fethiye". Karışık yazımlara dokunmaz. */
export function displayPlace(value: string | undefined | null): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 2 || text !== text.toLocaleUpperCase("tr-TR") || !/\p{L}/u.test(text)) return text;
  return text.toLocaleLowerCase("tr-TR").split(" ").map((word) => capitalizeTr(word)).join(" ");
}

/** URL parçası: "Muğla" → "mugla", "Kuşadası Merkez" → "kusadasi-merkez". */
export function seoSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Yorumlarda kişisel veriyi azaltmak için "Ayşe Kaya" → "Ayşe K.". */
export function shortPersonName(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Müşteri";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toLocaleUpperCase("tr-TR")}.`;
}

export type RankedName = { name: string; count: number };

/** Değerleri sayar ve en sık geçenden en aza sıralar (eşitlikte alfabetik). */
export function rankByFrequency(values: (string | undefined | null)[]): RankedName[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));
}

export type AreaListingFacts = {
  /** Şehir veya ilçe adı. */
  place: string;
  /** Kategori cümle içi adı (ör. "kuaför"); kategori yoksa genel sayfa. */
  noun?: string;
  /** Kategori çoğul adı (ör. "Kuaförler"). */
  plural?: string;
  businessCount: number;
  districts: RankedName[];
  topRated?: { name: string; rating: number; reviewCount: number };
  reviewedCount?: number;
  verifiedCount?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  popularServices?: string[];
  categories?: { label: string; count: number }[];
};

/** Şehir/kategori sayfası için gerçek veriden üretilen giriş paragrafları. */
export function buildAreaIntro(facts: AreaListingFacts): string[] {
  const place = facts.place;
  const subject = facts.noun ? `${facts.noun} işletmesi` : "işletme";
  const paragraphs: string[] = [];
  const first: string[] = [];
  first.push(`${locative(place)} SeninRandevun üzerinden online randevu alabileceğin ${facts.businessCount} ${subject} yayında.`);
  if (facts.districts.length > 1) {
    const top = facts.districts.slice(0, 4).map((item) => `${item.name} (${item.count})`);
    first.push(`İşletmeler ${joinTurkish(top)} başta olmak üzere ${facts.districts.length} farklı ilçede hizmet veriyor.`);
  } else if (facts.districts.length === 1) {
    first.push(`Listelenen işletmelerin tamamı ${facts.districts[0].name} ilçesinde.`);
  }
  if (facts.categories && facts.categories.length > 0) {
    const cats = facts.categories.slice(0, 4).map((item) => `${item.label.toLocaleLowerCase("tr-TR")} (${item.count})`);
    first.push(`En çok işletme bulunan kategoriler: ${joinTurkish(cats)}.`);
  }
  paragraphs.push(first.join(" "));

  const second: string[] = [];
  if (facts.minPrice != null && facts.maxPrice != null && facts.maxPrice > 0) {
    second.push(facts.minPrice === facts.maxPrice
      ? `Yayınlanan hizmet fiyatları ${formatTry(facts.minPrice)} seviyesinde.`
      : `Yayınlanan hizmet fiyatları ${formatTry(facts.minPrice)} ile ${formatTry(facts.maxPrice)} arasında değişiyor.`);
  }
  if (facts.popularServices && facts.popularServices.length > 0) {
    second.push(`Sık sunulan hizmetler arasında ${joinTurkish(facts.popularServices.slice(0, 5).map((item) => item.toLocaleLowerCase("tr-TR")))} yer alıyor.`);
  }
  if (facts.topRated && facts.topRated.reviewCount > 0) {
    second.push(`Müşteri puanı en yüksek işletme ${facts.topRated.reviewCount} değerlendirmeyle 5 üzerinden ${facts.topRated.rating.toFixed(1)} puan alan ${facts.topRated.name}.`);
  }
  if (facts.verifiedCount && facts.verifiedCount > 0) {
    second.push(`${facts.verifiedCount} işletmenin profili SeninRandevun tarafından doğrulandı.`);
  }
  if (second.length > 0) paragraphs.push(second.join(" "));
  return paragraphs;
}

export type FaqEntry = { question: string; answer: string };

/** Sorular yalnızca cevabı veriyle desteklenebiliyorsa eklenir. */
export function buildAreaFaq(facts: AreaListingFacts): FaqEntry[] {
  const place = facts.place;
  const noun = facts.noun ?? "işletme";
  const faq: FaqEntry[] = [];
  faq.push({
    question: `${locative(place)} kaç ${noun} online randevu alıyor?`,
    answer: `Şu anda ${locative(place)} SeninRandevun üzerinden online randevu alan ${facts.businessCount} ${facts.noun ? `${facts.noun} işletmesi` : "işletme"} listeleniyor. Liste, yeni işletmeler yayına girdikçe otomatik güncellenir.`,
  });
  if (facts.minPrice != null && facts.maxPrice != null && facts.maxPrice > 0) {
    faq.push({
      question: `${locativeAdjective(place)} ${noun} fiyatları ne kadar?`,
      answer: facts.minPrice === facts.maxPrice
        ? `İşletmelerin yayınladığı hizmet fiyatları ${formatTry(facts.minPrice)} seviyesinde. Güncel fiyat ve süreyi her işletmenin sayfasında hizmet bazında görebilirsin.`
        : `İşletmelerin yayınladığı hizmet fiyatları ${formatTry(facts.minPrice)} ile ${formatTry(facts.maxPrice)} arasında. Güncel fiyat ve süreyi her işletmenin sayfasında hizmet bazında görebilirsin.`,
    });
  }
  if (facts.topRated && facts.topRated.reviewCount > 0) {
    faq.push({
      question: `${locative(place)} en yüksek puanlı ${noun} hangisi?`,
      answer: `Gerçek müşteri değerlendirmelerine göre ${facts.topRated.name}, ${facts.topRated.reviewCount} değerlendirmeyle 5 üzerinden ${facts.topRated.rating.toFixed(1)} puana sahip. Puanlar yalnızca randevusunu tamamlayan müşterilerin yorumlarından oluşur.`,
    });
  }
  if (facts.districts.length > 0) {
    faq.push({
      question: `${locative(place)} hangi ilçelerde ${noun} bulunuyor?`,
      answer: `Listelenen işletmeler ${joinTurkish(facts.districts.slice(0, 8).map((item) => item.name))} ${facts.districts.length > 1 ? "ilçelerinde" : "ilçesinde"} hizmet veriyor.`,
    });
  }
  faq.push({
    question: "Online randevu almak ücretli mi?",
    answer: "Hayır. SeninRandevun üzerinden işletmeleri incelemek ve randevu oluşturmak müşteriler için ücretsizdir; hizmet ücretini işletmeye ödersin.",
  });
  return faq;
}
