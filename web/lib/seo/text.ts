/**
 * SEO metni yardımcıları (saf modül, test edilebilir).
 * Metinler gerçek veriden üretilir; veri yoksa ilgili cümle hiç yazılmaz.
 * Türkçe cümleler ek (bulunma eki vb.) kurallarıyla, diğer diller (şimdilik İngilizce) kendi
 * cümle kurucularıyla yazılır: İngilizceye Türkçe ek mantığı uygulanmaz.
 */
import { LOCALE_LABELS, type Locale } from "../../i18n/config.ts";

const BACK_VOWELS = "aıou"; // i18n-ignore
const FRONT_VOWELS = "eiöü"; // i18n-ignore
const HARD_CONSONANTS = "fstkçşhp"; // i18n-ignore

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

/** "a", "a and b", "a, b, and c" (Amerikan yazımı, Oxford virgülü). */
export function joinEnglish(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

/** Dile göre liste birleştirme: Türkçe "a, b ve c", İngilizce "a, b, and c". */
export function joinList(items: string[], locale: Locale = "tr"): string {
  return locale === "tr" ? joinTurkish(items) : joinEnglish(items);
}

/**
 * Cümle şablonları için yer adı biçimleri. Türkçede ekli halleri ("Muğla'da", "Muğla'daki"),
 * diğer dillerde yalın adı verir; edat şablonun içindedir (ör. "in {inPlace}").
 */
export function placeVars(place: string, locale: Locale = "tr"): { place: string; inPlace: string; placeAdj: string } {
  if (locale === "tr") return { place, inPlace: locative(place), placeAdj: locativeAdjective(place) };
  return { place, inPlace: place, placeAdj: place };
}

/** 1250 → "1.250 ₺" (İngilizce: "1,250 ₺"). */
export function formatTry(amount: number, locale: Locale = "tr"): string {
  return `${new Intl.NumberFormat(LOCALE_LABELS[locale].intl, { maximumFractionDigits: 0 }).format(Math.round(amount))} ₺`;
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
    .replaceAll("ı", "i") // i18n-ignore
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Yorumlarda kişisel veriyi azaltmak için "Ayşe Kaya" → "Ayşe K.". */
export function shortPersonName(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Müşteri"; // i18n-ignore — JSON-LD yazar adı yedeği
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
export function buildAreaIntro(facts: AreaListingFacts, locale: Locale = "tr"): string[] {
  if (locale !== "tr") return buildAreaIntroEnglish(facts, locale);
  const place = facts.place;
  const subject = facts.noun ? `${facts.noun} işletmesi` : "işletme"; // i18n-ignore
  const paragraphs: string[] = [];
  const first: string[] = [];
  first.push(`${locative(place)} SeninRandevun üzerinden online randevu alabileceğin ${facts.businessCount} ${subject} yayında.`); // i18n-ignore
  if (facts.districts.length > 1) {
    const top = facts.districts.slice(0, 4).map((item) => `${item.name} (${item.count})`);
    first.push(`İşletmeler ${joinTurkish(top)} başta olmak üzere ${facts.districts.length} farklı ilçede hizmet veriyor.`); // i18n-ignore
  } else if (facts.districts.length === 1) {
    first.push(`Listelenen işletmelerin tamamı ${facts.districts[0].name} ilçesinde.`); // i18n-ignore
  }
  if (facts.categories && facts.categories.length > 0) {
    const cats = facts.categories.slice(0, 4).map((item) => `${item.label.toLocaleLowerCase("tr-TR")} (${item.count})`);
    first.push(`En çok işletme bulunan kategoriler: ${joinTurkish(cats)}.`); // i18n-ignore
  }
  paragraphs.push(first.join(" "));

  const second: string[] = [];
  if (facts.minPrice != null && facts.maxPrice != null && facts.maxPrice > 0) {
    second.push(facts.minPrice === facts.maxPrice
      ? `Yayınlanan hizmet fiyatları ${formatTry(facts.minPrice)} seviyesinde.` // i18n-ignore
      : `Yayınlanan hizmet fiyatları ${formatTry(facts.minPrice)} ile ${formatTry(facts.maxPrice)} arasında değişiyor.`); // i18n-ignore
  }
  if (facts.popularServices && facts.popularServices.length > 0) {
    second.push(`Sık sunulan hizmetler arasında ${joinTurkish(facts.popularServices.slice(0, 5).map((item) => item.toLocaleLowerCase("tr-TR")))} yer alıyor.`); // i18n-ignore
  }
  if (facts.topRated && facts.topRated.reviewCount > 0) {
    second.push(`Müşteri puanı en yüksek işletme ${facts.topRated.reviewCount} değerlendirmeyle 5 üzerinden ${facts.topRated.rating.toFixed(1)} puan alan ${facts.topRated.name}.`); // i18n-ignore
  }
  if (facts.verifiedCount && facts.verifiedCount > 0) {
    second.push(`${facts.verifiedCount} işletmenin profili SeninRandevun tarafından doğrulandı.`); // i18n-ignore
  }
  if (second.length > 0) paragraphs.push(second.join(" "));
  return paragraphs;
}

export type FaqEntry = { question: string; answer: string };

/** Sorular yalnızca cevabı veriyle desteklenebiliyorsa eklenir. */
export function buildAreaFaq(facts: AreaListingFacts, locale: Locale = "tr"): FaqEntry[] {
  if (locale !== "tr") return buildAreaFaqEnglish(facts, locale);
  const place = facts.place;
  const noun = facts.noun ?? "işletme"; // i18n-ignore
  const faq: FaqEntry[] = [];
  faq.push({
    question: `${locative(place)} kaç ${noun} online randevu alıyor?`, // i18n-ignore
    answer: `Şu anda ${locative(place)} SeninRandevun üzerinden online randevu alan ${facts.businessCount} ${facts.noun ? `${facts.noun} işletmesi` : "işletme"} listeleniyor. Liste, yeni işletmeler yayına girdikçe otomatik güncellenir.`, // i18n-ignore
  });
  if (facts.minPrice != null && facts.maxPrice != null && facts.maxPrice > 0) {
    faq.push({
      question: `${locativeAdjective(place)} ${noun} fiyatları ne kadar?`, // i18n-ignore
      answer: facts.minPrice === facts.maxPrice
        ? `İşletmelerin yayınladığı hizmet fiyatları ${formatTry(facts.minPrice)} seviyesinde. Güncel fiyat ve süreyi her işletmenin sayfasında hizmet bazında görebilirsin.` // i18n-ignore
        : `İşletmelerin yayınladığı hizmet fiyatları ${formatTry(facts.minPrice)} ile ${formatTry(facts.maxPrice)} arasında. Güncel fiyat ve süreyi her işletmenin sayfasında hizmet bazında görebilirsin.`, // i18n-ignore
    });
  }
  if (facts.topRated && facts.topRated.reviewCount > 0) {
    faq.push({
      question: `${locative(place)} en yüksek puanlı ${noun} hangisi?`, // i18n-ignore
      answer: `Gerçek müşteri değerlendirmelerine göre ${facts.topRated.name}, ${facts.topRated.reviewCount} değerlendirmeyle 5 üzerinden ${facts.topRated.rating.toFixed(1)} puana sahip. Puanlar yalnızca randevusunu tamamlayan müşterilerin yorumlarından oluşur.`, // i18n-ignore
    });
  }
  if (facts.districts.length > 0) {
    faq.push({
      question: `${locative(place)} hangi ilçelerde ${noun} bulunuyor?`, // i18n-ignore
      answer: `Listelenen işletmeler ${joinTurkish(facts.districts.slice(0, 8).map((item) => item.name))} ${facts.districts.length > 1 ? "ilçelerinde" : "ilçesinde"} hizmet veriyor.`, // i18n-ignore
    });
  }
  faq.push({
    question: "Online randevu almak ücretli mi?", // i18n-ignore
    answer: "Hayır. SeninRandevun üzerinden işletmeleri incelemek ve randevu oluşturmak müşteriler için ücretsizdir; hizmet ücretini işletmeye ödersin.", // i18n-ignore
  });
  return faq;
}

/* ───────────── İngilizce cümle kurucuları ─────────────
 * facts.noun / facts.plural çağıran tarafından o dile çevrilmiş olarak verilir
 * (ör. "hair salon" / "Hair Salons"). Yer ve işletme adları çevrilmez. */

function countOf(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function englishNouns(facts: AreaListingFacts): { singular: string; plural: string } {
  if (!facts.noun) return { singular: "business", plural: "businesses" };
  const plural = facts.plural ? facts.plural.toLowerCase() : `${facts.noun}s`;
  return { singular: facts.noun, plural };
}

function buildAreaIntroEnglish(facts: AreaListingFacts, locale: Locale): string[] {
  const place = facts.place;
  const nouns = englishNouns(facts);
  const paragraphs: string[] = [];
  const first: string[] = [];
  first.push(`SeninRandevun lists ${countOf(facts.businessCount, nouns.singular, nouns.plural)} in ${place} that you can book online.`);
  if (facts.districts.length > 1) {
    const top = facts.districts.slice(0, 4).map((item) => `${item.name} (${item.count})`);
    first.push(`They serve ${facts.districts.length} different districts, led by ${joinEnglish(top)}.`);
  } else if (facts.districts.length === 1) {
    first.push(`All listed businesses are in ${facts.districts[0].name}.`);
  }
  if (facts.categories && facts.categories.length > 0) {
    const cats = facts.categories.slice(0, 4).map((item) => `${item.label.toLowerCase()} (${item.count})`);
    first.push(`Categories with the most businesses: ${joinEnglish(cats)}.`);
  }
  paragraphs.push(first.join(" "));

  const second: string[] = [];
  if (facts.minPrice != null && facts.maxPrice != null && facts.maxPrice > 0) {
    second.push(facts.minPrice === facts.maxPrice
      ? `Published service prices are around ${formatTry(facts.minPrice, locale)}.`
      : `Published service prices range from ${formatTry(facts.minPrice, locale)} to ${formatTry(facts.maxPrice, locale)}.`);
  }
  if (facts.popularServices && facts.popularServices.length > 0) {
    // Hizmet adları işletmelerin girdiği veridir; çevrilmez.
    second.push(`Commonly offered services include ${joinEnglish(facts.popularServices.slice(0, 5).map((item) => item.toLocaleLowerCase("tr-TR")))}.`);
  }
  if (facts.topRated && facts.topRated.reviewCount > 0) {
    second.push(`The highest-rated business is ${facts.topRated.name}, scoring ${facts.topRated.rating.toFixed(1)} out of 5 across ${countOf(facts.topRated.reviewCount, "review", "reviews")}.`);
  }
  if (facts.verifiedCount && facts.verifiedCount > 0) {
    second.push(`${countOf(facts.verifiedCount, "business profile has", "business profiles have")} been verified by SeninRandevun.`);
  }
  if (second.length > 0) paragraphs.push(second.join(" "));
  return paragraphs;
}

function buildAreaFaqEnglish(facts: AreaListingFacts, locale: Locale): FaqEntry[] {
  const place = facts.place;
  const nouns = englishNouns(facts);
  const faq: FaqEntry[] = [];
  faq.push({
    question: `How many ${nouns.plural} in ${place} take online bookings?`,
    answer: `SeninRandevun currently lists ${countOf(facts.businessCount, nouns.singular, nouns.plural)} in ${place} that ${facts.businessCount === 1 ? "takes" : "take"} online bookings. The list updates automatically as new businesses go live.`,
  });
  if (facts.minPrice != null && facts.maxPrice != null && facts.maxPrice > 0) {
    faq.push({
      question: `How much do ${nouns.plural} in ${place} charge?`,
      answer: facts.minPrice === facts.maxPrice
        ? `Service prices published by businesses are around ${formatTry(facts.minPrice, locale)}. You can see the current price and duration of each service on every business's page.`
        : `Service prices published by businesses range from ${formatTry(facts.minPrice, locale)} to ${formatTry(facts.maxPrice, locale)}. You can see the current price and duration of each service on every business's page.`,
    });
  }
  if (facts.topRated && facts.topRated.reviewCount > 0) {
    faq.push({
      question: `What is the highest-rated ${nouns.singular} in ${place}?`,
      answer: `Based on real customer reviews, ${facts.topRated.name} has a rating of ${facts.topRated.rating.toFixed(1)} out of 5 from ${countOf(facts.topRated.reviewCount, "review", "reviews")}. Ratings come only from customers who completed their appointments.`,
    });
  }
  if (facts.districts.length > 0) {
    faq.push({
      question: `Which districts of ${place} have ${nouns.plural}?`,
      answer: `Listed businesses are located in ${joinEnglish(facts.districts.slice(0, 8).map((item) => item.name))}.`,
    });
  }
  faq.push({
    question: "Is online booking free?",
    answer: "Yes. Browsing businesses and booking appointments on SeninRandevun is free for customers; you pay the business for the service.",
  });
  return faq;
}
