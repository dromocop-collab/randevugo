// İşletme içeriği için küfür/uygunsuz ifade denetimi (otomatik onay). Saf mantık; test: content-moderation-domain.test.mjs
//
// Yaklaşım: metin kelimelere ayrılır, her kelime normalize edilir (Türkçe küçük harf, leetspeak, tekrar harf,
// kelime içi nokta/yıldız). Kelime; (1) tam eşleşme listesinde ya da (2) kök listesinden biriyle başlıyor ve
// istisna listesinde değilse işaretlenir. Ayrıca "a m k" gibi harf harf ayrılmış yazımlar birleştirilip denenir.
// Ş/Ç/Ğ/I harfleri SADELEŞTİRİLMEZ: "şikayet", "sıkıntı" gibi masum kelimeler "sik" köküne düşmesin diye.
// Amaç kesin sansür değil, şüpheliyi insan onayına bırakmak: belirsizse işaretle (yanlış pozitif = sadece elle onay).

/** Tam kelime olarak geçerse uygunsuz. */
const EXACT_WORDS = [
  "am", "amk", "amq", "aq", "awk", "mk", "mq", "oç", "oc", "sg", "siktir", "sikik", "sikis", "sikiş", "sikim", "sikin", "sikti",
  "piç", "pic", "göt", "got", "götü", "götün", "yarak", "yarrak", "taşak", "tasak", "taşşak", "puşt", "pust", "ibne", "gavat",
  "kahpe", "kaltak", "yavşak", "yavsak", "fahişe", "fahise", "kevaşe", "kevase", "pezevenk", "orospu", "orosbu", "dalyarak",
  "amcık", "amcik", "amına", "amina", "amını", "amini", "ananı", "anani", "sikerim", "sokarım", "sokarim", "şerefsiz", "serefsiz",
  "gerizekalı", "gerizekali", "salak", "aptal", "dangalak", "mal", "hıyar", "angut", "embesil", "it", "köpek",
  "fuck", "fucking", "fucker", "shit", "bitch", "dick", "pussy", "cunt", "asshole", "bastard", "motherfucker", "porn", "porno",
  "sex", "seks", "escort", "eskort", "xxx", "nude", "çıplak",
];

/** Bu köklerle başlayan kelime uygunsuz (istisnalar hariç). */
const STEMS = [
  "siktir", "sikerim", "sikeyim", "sikik", "sikiş", "sikis", "sikti", "siken", "amına", "amina", "amcık", "amcik",
  "orospu", "orosbu", "yarrak", "yarağ", "yarak", "taşşak", "pezevenk", "kahpe", "kaltak", "yavşak", "fahişe", "kevaşe",
  "götveren", "gotveren", "götlek", "ibnelik", "puşt", "dalyarak", "şerefsiz", "serefsiz", "gerizekal", "anasını", "ananı",
  "motherfuck", "fuck", "bitch", "porno", "escort", "eskort",
];

/** Kök eşleşse de masum olan kelimeler (Türkçe yer adı, gündelik kelime). */
const SAFE_WORDS = [
  "sikke", "sikkeler", "siklet", "sikletler", "siklon", "siklamen", "amasya", "amatör", "amator", "amaç", "amac",
  "yarakçı", "kahpeci", "malzeme", "malikane", "malatya", "itiraz", "götürü", "götürmek", "götür", "fuchsia",
];

/** Bu kelimeler küfür değil ama tek başına geçince yanlış pozitif yaratır; yalnız başka uygunsuz bağlamla sayılır. */
const WEAK_EXACT = new Set(["mal", "it", "köpek", "salak", "aptal", "got", "am", "oc", "sg", "mk", "hıyar"]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "€": "e", "!": "i" };

export type ModerationMatch = { field: string; word: string; term: string };
export type ModerationResult = { clean: boolean; matches: ModerationMatch[] };
export type ModerationOptions = { extraWords?: readonly string[]; allowedWords?: readonly string[] };

/** Tek kelimeyi karşılaştırılabilir biçime getirir: küçük harf, leetspeak, kelime içi işaret, 3+ tekrar harf. */
export function normalizeWord(word: string): string {
  return word
    .toLocaleLowerCase("tr-TR")
    .replace(/[0-9@$€!]/g, (char) => LEET[char] ?? char)
    .replace(/[.*_\-'’`´^~]/g, "")
    .replace(/(\p{L})\1{2,}/gu, "$1$1")
    .normalize("NFC");
}

/** Metni kelimelere ayırır (harf/rakam ve kelime içi işaretler korunur). */
export function tokenize(text: string): string[] {
  return (text.match(/[\p{L}\p{N}@$€!*._\-'’]+/gu) ?? []).map(normalizeWord).filter(Boolean);
}

/** Admin listesinden gelen kelimeyi temizler (boş/çok uzun atılır). */
export function cleanWordList(value: unknown, max = 300): string[] {
  if (!Array.isArray(value)) return [];
  const words = value.map((item) => (typeof item === "string" ? normalizeWord(item.trim()) : "")).filter((word) => word.length >= 2 && word.length <= 40);
  return [...new Set(words)].slice(0, max);
}

function matchTerm(token: string, extra: ReadonlySet<string>, allowed: ReadonlySet<string>): string | null {
  if (allowed.has(token) || SAFE_WORDS.includes(token)) return null;
  if (extra.has(token)) return token;
  for (const word of extra) if (word.length >= 4 && token.startsWith(word)) return word;
  if (EXACT_WORDS.includes(token)) return token;
  for (const stem of STEMS) if (token.startsWith(stem)) return stem;
  return null;
}

/**
 * Alanları denetler. Zayıf kelimeler ("mal", "it", "aptal"…) tek başına işaretlenmez — "Mal Kuaför"
 * gibi masum adlar takılmasın; aynı içerikte başka bir uygunsuz ifade varsa onlar da listelenir.
 */
export function moderateFields(fields: Record<string, unknown>, options: ModerationOptions = {}): ModerationResult {
  const extra = new Set(cleanWordList(options.extraWords ?? []));
  const allowed = new Set(cleanWordList(options.allowedWords ?? []));
  const strong: ModerationMatch[] = [];
  const weak: ModerationMatch[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim()) continue;
    const tokens = tokenize(value);
    // "a m k", "s i k t i r" gibi harf harf yazımlar: ardışık tek harfleri birleştirip ayrıca dene.
    const joined: string[] = [];
    let run = "";
    for (const token of [...tokens, ""]) {
      if (token.length === 1) { run += token; continue; }
      if (run.length >= 2) joined.push(run);
      run = "";
    }
    for (const token of [...tokens, ...joined]) {
      const term = matchTerm(token, extra, allowed);
      if (!term) continue;
      const match = { field, word: token, term };
      (WEAK_EXACT.has(term) && !extra.has(term) ? weak : strong).push(match);
    }
  }
  const matches = strong.length ? [...strong, ...weak] : [];
  const unique = matches.filter((item, index) => matches.findIndex((other) => other.field === item.field && other.word === item.word) === index);
  return { clean: unique.length === 0, matches: unique.slice(0, 20) };
}

/** platformPrivateSettings/businessApproval — süper admin › İşletmeler › Otomatik onay. Varsayılan: kapalı. */
export type ApprovalSettings = {
  /** Yeni mağaza/şube: içerik temizse otomatik onayla. */
  autoApproveStores: boolean;
  /** Profil metin değişiklikleri (ad, açıklama, adres…): temizse ve görsel değişmiyorsa otomatik uygula. */
  autoApproveProfileText: boolean;
  extraWords: string[];
  allowedWords: string[];
};

export function parseApprovalSettings(raw: unknown): ApprovalSettings {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    autoApproveStores: data.autoApproveStores === true,
    autoApproveProfileText: data.autoApproveProfileText === true,
    extraWords: cleanWordList(data.extraWords),
    allowedWords: cleanWordList(data.allowedWords),
  };
}

/** Mağaza kaydında denetlenen metin alanları (görseller metinle denetlenemez). */
export const MODERATED_TEXT_FIELDS = ["name", "description", "address", "district", "city", "organizationName", "website"] as const;
