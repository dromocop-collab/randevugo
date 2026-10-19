/**
 * "Randevu karakterin ne?" anketi — sorular, sonuç tipleri ve puanlama.
 * Kimlik/iletişim bilgisi SORULMAZ; yalnızca seçenek kimlikleri kaydedilir.
 * Seçenek veya sonuç kimliği değişirse firestore.rules içindeki surveyResponses kuralı da güncellenmeli.
 */

export const SURVEY_ID = "isletme-anketi-v1";

export type ResultType =
  | "telefon-ninjasi"
  | "mesaj-sampiyonu"
  | "defter-ustasi"
  | "gece-kusu"
  | "takvim-cambazi"
  | "dijital-kasif";

export type QuestionKey = "tur" | "kanal" | "mesaj" | "dert" | "unutan" | "gece" | "saat" | "hayal";

export type SurveyOption = {
  id: string;
  emoji: string;
  label: string;
  hint?: string;
  /** Rovi'nin bu seçime tepkisi. */
  quip: string;
  /** Rovi'nin ruh hali: acı veren cevaplarda düşünceli. */
  mood?: "happy" | "thinking";
  scores?: Partial<Record<ResultType, number>>;
};

export type SurveyQuestion = {
  key: QuestionKey;
  title: string;
  subtitle: string;
  /** Rovi soru ekrana gelince ne der. */
  rovi: string;
  layout: "grid" | "list";
  options: SurveyOption[];
};

export const QUESTIONS: SurveyQuestion[] = [
  {
    key: "tur",
    title: "Hangi işin ustasısın?",
    subtitle: "İşletmeni seç, Rovi ona göre heyecanlansın.",
    rovi: "Önce tanışalım 🤝",
    layout: "grid",
    options: [
      { id: "kuafor", emoji: "✂️", label: "Kuaför", quip: "Saçlar emin ellerde! ✂️" },
      { id: "berber", emoji: "💈", label: "Berber", quip: "Ustam, sakal da dahil mi? 💈" },
      { id: "guzellik", emoji: "💅", label: "Güzellik & Nail", quip: "Işıl ışıl bir takvim geliyor ✨" },
      { id: "spa", emoji: "🧖", label: "Spa & Masaj", quip: "Rovi şimdiden rahatladı 😌" },
      { id: "klinik", emoji: "🩺", label: "Klinik & Sağlık", quip: "Randevular da sağlıklı olsun 🩺" },
      { id: "diyetisyen", emoji: "🥗", label: "Diyetisyen", quip: "Takvim de fit olsun 🥗" },
      { id: "spor", emoji: "🏋️", label: "Spor & PT", quip: "Bir set daha! 💪" },
      { id: "egitim", emoji: "📚", label: "Eğitim & Kurs", quip: "Ders zili çaldı! 📚" },
      { id: "servis", emoji: "🔧", label: "Servis & Tamir", quip: "Takvimi de biz tamir ederiz 🔧" },
      { id: "diger", emoji: "🌟", label: "Başka bir iş", quip: "Her işin randevusu güzel 🌟" },
    ],
  },
  {
    key: "kanal",
    title: "Randevuları şu an nasıl alıyorsun?",
    subtitle: "Dürüst ol, Rovi kimseye söylemez 🤫",
    rovi: "Hmm, merak ettim…",
    layout: "grid",
    options: [
      { id: "telefon", emoji: "📞", label: "Telefonla", quip: "Alo, alo! Kulağın alışmıştır 📞", scores: { "telefon-ninjasi": 3 } },
      { id: "whatsapp", emoji: "💬", label: "WhatsApp'tan", quip: "Mavi tikler seni çağırıyor 💬", scores: { "mesaj-sampiyonu": 3 } },
      { id: "dm", emoji: "📸", label: "Instagram DM", quip: "DM kutusu = randevu defteri 😅", scores: { "mesaj-sampiyonu": 2, "gece-kusu": 1 } },
      { id: "defter", emoji: "📒", label: "Defter & kalem", quip: "Klasik! Kalemin hiç bitmesin 📒", scores: { "defter-ustasi": 3 } },
      { id: "uygulama", emoji: "📱", label: "Bir uygulama", quip: "Ooo, teknoloji dostu! 🚀", scores: { "dijital-kasif": 4 } },
      { id: "karisik", emoji: "🌀", label: "Hepsi birden", quip: "Tam bir cambazsın 🤹", scores: { "takvim-cambazi": 3 } },
    ],
  },
  {
    key: "mesaj",
    title: "Günde kaç telefon / mesaj sadece randevu için geliyor?",
    subtitle: "“Yarın müsait misin?” dahil 😄",
    rovi: "Say bakalım…",
    layout: "list",
    options: [
      { id: "az", emoji: "🐢", label: "0 – 5", hint: "Sakin günler", quip: "Huzurlu bir işletme 🍵", scores: { "dijital-kasif": 1 } },
      { id: "orta", emoji: "🐇", label: "5 – 15", hint: "Tempolu", quip: "Tempo güzel! 🐇", scores: { "telefon-ninjasi": 1, "mesaj-sampiyonu": 1 } },
      { id: "cok", emoji: "🚀", label: "15 – 30", hint: "Telefon hiç susmuyor", quip: "Burası çağrı merkezi mi? 😄", scores: { "telefon-ninjasi": 2, "takvim-cambazi": 1 } },
      { id: "asiri", emoji: "🌋", label: "30+", hint: "Kendi santralim var", quip: "Rovi'nin başı döndü 😵‍💫", mood: "thinking", scores: { "telefon-ninjasi": 2, "takvim-cambazi": 2 } },
    ],
  },
  {
    key: "dert",
    title: "Seni en çok ne sinir eder?",
    subtitle: "Bir tane seç; hepsi diyorsan en büyüğünü 😅",
    rovi: "Derdini anlat…",
    layout: "grid",
    options: [
      { id: "gelmeyen", emoji: "👻", label: "Gelmeyen müşteri", quip: "Hayalet müşteriler… 👻", mood: "thinking", scores: { "defter-ustasi": 1, "mesaj-sampiyonu": 1 } },
      { id: "gece", emoji: "🌙", label: "Gece gelen mesajlar", quip: "23:47 — “Yarına yer var mı?” 🌙", mood: "thinking", scores: { "gece-kusu": 3 } },
      { id: "cakisma", emoji: "💥", label: "Çakışan saatler", quip: "İki müşteri, tek koltuk… 💥", mood: "thinking", scores: { "takvim-cambazi": 2, "defter-ustasi": 1 } },
      { id: "soru", emoji: "🔁", label: "Bitmeyen “müsait misin?”", quip: "“3?” Dolu. “4?” Dolu. 😮‍💨", mood: "thinking", scores: { "telefon-ninjasi": 2, "mesaj-sampiyonu": 1 } },
    ],
  },
  {
    key: "unutan",
    title: "10 müşteriden kaçı randevuyu unutur ya da gelmez?",
    subtitle: "Haber vermeden boş kalan koltuklar…",
    rovi: "Bu biraz acıtabilir 🫣",
    layout: "list",
    options: [
      { id: "sifir", emoji: "😇", label: "Hiçbiri", hint: "Müşterilerim melek", quip: "Müşterilerin altın gibi 😇", scores: { "dijital-kasif": 1 } },
      { id: "bir", emoji: "🙂", label: "1 kişi", hint: "Arada bir oluyor", quip: "Fena değil, idare eder 🙂" },
      { id: "ikiuc", emoji: "😬", label: "2 – 3 kişi", hint: "Can sıkıyor", quip: "Boş koltuk, boş kasa 😬", mood: "thinking", scores: { "defter-ustasi": 1 } },
      { id: "dortplus", emoji: "🫠", label: "4 ve üstü", hint: "Artık alıştım", quip: "Ah be… buna bir çare bulacağız 🫠", mood: "thinking", scores: { "defter-ustasi": 2 } },
    ],
  },
  {
    key: "gece",
    title: "Gece 23:00. “Yarın müsait misin?” mesajı geldi. Ne yaparsın?",
    subtitle: "İlk aklına geleni seç.",
    rovi: "Dıt dıt! 📩",
    layout: "list",
    options: [
      { id: "hemen", emoji: "⚡", label: "Anında cevaplarım", hint: "Müşteri kaçmasın!", quip: "Gece kuşu tespit edildi 🦉", scores: { "gece-kusu": 3 } },
      { id: "sabah", emoji: "☀️", label: "Sabahı beklerim", hint: "Gece benim vaktim", quip: "Sağlıklı sınırlar! ☀️", scores: { "dijital-kasif": 1 } },
      { id: "unutur", emoji: "🙈", label: "Cevaplamayı unuturum", hint: "Sonra hatırlarım… belki", quip: "O müşteri başka yere gitti bile 🙈", mood: "thinking", scores: { "defter-ustasi": 1, "mesaj-sampiyonu": 1 } },
      { id: "kapali", emoji: "📵", label: "Telefon gece kapalı", hint: "Zen modu", quip: "Zen modu açık 🧘", scores: { "dijital-kasif": 1 } },
    ],
  },
  {
    key: "saat",
    title: "Haftada kaç saatin randevu ayarlamaya gidiyor?",
    subtitle: "Cevap yazmak, aramak, deftere geçirmek, saat kaydırmak…",
    rovi: "Hesap makinemi hazırlıyorum 🧮",
    layout: "list",
    options: [
      { id: "s1", emoji: "⏱️", label: "1 saatten az", quip: "Verimlilik canavarı! ⏱️", scores: { "dijital-kasif": 2 } },
      { id: "s3", emoji: "⌛", label: "1 – 3 saat", quip: "Bir film süresi kadar ⌛" },
      { id: "s6", emoji: "🕰️", label: "3 – 6 saat", quip: "Neredeyse bir iş günü! 🕰️", mood: "thinking", scores: { "takvim-cambazi": 1, "telefon-ninjasi": 1 } },
      { id: "s10", emoji: "🫣", label: "6 saatten fazla", quip: "Bu bir yarı zamanlı iş! 🫣", mood: "thinking", scores: { "takvim-cambazi": 2, "telefon-ninjasi": 1 } },
    ],
  },
  {
    key: "hayal",
    title: "Kazandığın vakitle ne yapardın?",
    subtitle: "Son soru! Hayal kurmak serbest ✨",
    rovi: "En sevdiğim soru 😍",
    layout: "grid",
    options: [
      { id: "musteri", emoji: "💼", label: "Daha çok müşteri", quip: "Kasa şenlensin! 💸" },
      { id: "aile", emoji: "❤️", label: "Aileme vakit", quip: "En güzel yatırım ❤️" },
      { id: "tatil", emoji: "🏖️", label: "Tatil!", quip: "Rovi de geliyor 🏖️" },
      { id: "uyku", emoji: "😴", label: "Uyku, bol uyku", quip: "Sonuna kadar hak ettin 😴" },
    ],
  },
];

export type SurveyResult = {
  type: ResultType;
  emoji: string;
  title: string;
  tagline: string;
  description: string;
  /** Sonuç kartının vurgu gradyanı. */
  accent: [string, string];
};

export const RESULTS: Record<ResultType, SurveyResult> = {
  "telefon-ninjasi": {
    type: "telefon-ninjasi",
    emoji: "🥷",
    title: "Telefon Ninjası",
    tagline: "Bir elde makas, bir elde telefon.",
    description: "Refleksin efsane: hiçbir çağrı kaçmıyor. Ama kulağın da artık tatil istiyor. Müşterilerin saatini kendisi seçsin, telefon sadece sohbet için çalsın.",
    accent: ["#d7ff70", "#5eead4"],
  },
  "mesaj-sampiyonu": {
    type: "mesaj-sampiyonu",
    emoji: "💬",
    title: "Mesaj Şampiyonu",
    tagline: "Mavi tikler senin sahnen.",
    description: "WhatsApp'ta, DM'de, her yerde yetişiyorsun. Ama aynı “hangi saat boş?” sorusunu günde 20 kez cevaplamak şampiyonu bile yorar. Tek link at, gerisini takvim halletsin.",
    accent: ["#86efac", "#38bdf8"],
  },
  "defter-ustasi": {
    type: "defter-ustasi",
    emoji: "📒",
    title: "Defter Ustası",
    tagline: "Kalemin keskin, defterin kutsal.",
    description: "Her şey kontrol altında… o defter kaybolana ya da üstüne çay dökülene kadar 😱 Takvimini buluta taşı, hatırlatmaları SMS ve bildirim yapsın.",
    accent: ["#fde68a", "#d7ff70"],
  },
  "gece-kusu": {
    type: "gece-kusu",
    emoji: "🦉",
    title: "Gece Kuşu",
    tagline: "Gece yarısı bile randevu veriyorsun.",
    description: "Müşterilerin sana bayılıyor, uykun ise küsmüş durumda. Gece gelen randevu isteklerini sen değil, 7/24 açık online takvimin karşılasın.",
    accent: ["#c4b5fd", "#d7ff70"],
  },
  "takvim-cambazi": {
    type: "takvim-cambazi",
    emoji: "🤹",
    title: "Takvim Cambazı",
    tagline: "Telefon, WhatsApp, DM… hepsi aynı anda havada.",
    description: "Etkileyici bir denge şovu! Ama tek bir yanlış adım = çakışan iki randevu. Tüm kanalları tek takvimde topla; dolu saat zaten seçilemesin.",
    accent: ["#fda4af", "#fde68a"],
  },
  "dijital-kasif": {
    type: "dijital-kasif",
    emoji: "🚀",
    title: "Dijital Kaşif",
    tagline: "Geleceğe bir ayağını çoktan atmışsın.",
    description: "Düzenlisin, teknolojiyle aran iyi. Şimdi diğer ayağı da at: 7/24 online randevu, otomatik hatırlatma, ekip ve müşteriler tek panelde.",
    accent: ["#d7ff70", "#86efac"],
  },
};

/** Beraberlikte öncelik sırası (daha “eğlenceli” tipler önde). */
const RESULT_PRIORITY: ResultType[] = ["gece-kusu", "takvim-cambazi", "telefon-ninjasi", "mesaj-sampiyonu", "defter-ustasi", "dijital-kasif"];

export type Answers = Partial<Record<QuestionKey, string>>;

function findOption(key: QuestionKey, id: string | undefined) {
  return QUESTIONS.find((question) => question.key === key)?.options.find((option) => option.id === id);
}

export function computeResultType(answers: Answers): ResultType {
  const totals = new Map<ResultType, number>(RESULT_PRIORITY.map((type) => [type, 0]));
  for (const question of QUESTIONS) {
    const option = findOption(question.key, answers[question.key]);
    for (const [type, value] of Object.entries(option?.scores ?? {}) as [ResultType, number][]) {
      totals.set(type, (totals.get(type) ?? 0) + value);
    }
  }
  let best: ResultType = "dijital-kasif";
  let bestScore = 0;
  for (const type of RESULT_PRIORITY) {
    const score = totals.get(type) ?? 0;
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return best;
}

const WEEKLY_HOURS: Record<string, number> = { s1: 0.75, s3: 2, s6: 4.5, s10: 7.5 };
const MESSAGE_BONUS: Record<string, number> = { az: 0, orta: 0.5, cok: 1, asiri: 2 };
const NO_SHOW_BONUS: Record<string, number> = { sifir: 0, bir: 0.3, ikiuc: 0.8, dortplus: 1.5 };

/** Eğlencesine, cevaplara göre kaba bir “haftada kazanılabilecek saat” tahmini (1–20). */
export function computeHoursSaved(answers: Answers): number {
  const base = (WEEKLY_HOURS[answers.saat ?? ""] ?? 2) * 0.8;
  const raw = base + (MESSAGE_BONUS[answers.mesaj ?? ""] ?? 0.5) + (NO_SHOW_BONUS[answers.unutan ?? ""] ?? 0.3);
  const factor = answers.kanal === "uygulama" ? 0.6 : 1;
  return Math.max(1, Math.min(20, Math.round(raw * factor)));
}

/** Kazanılan zamanın hayale göre eğlenceli karşılığı. */
export function dreamLine(answers: Answers, hours: number): string {
  const yearlyHours = hours * 48;
  const days = Math.max(1, Math.round(yearlyHours / 8));
  switch (answers.hayal) {
    case "musteri":
      return `Bu süre haftada ~${Math.max(1, Math.round(hours * 1.5))} müşteri daha ağırlamaya yeter 💼`;
    case "aile":
      return `Yılda ~${days} gün daha ailenle ❤️`;
    case "tatil":
      return `Bu, yılda ~${days} günlük ekstra tatil demek 🏖️`;
    case "uyku":
      return `Bu, haftada ~${Math.max(1, Math.round(hours / 1.5))} akşam erken yatmak demek. Rovi kıskandı 😴`;
    default:
      return `Yılda ~${days} iş günü sana kalır ✨`;
  }
}

export type BenefitKey = "online" | "reminder" | "night" | "conflict" | "questions" | "panel";

/** Cevaplara göre en alakalı üç SeninRandevun faydası. */
export function pickBenefits(answers: Answers): BenefitKey[] {
  const picks: BenefitKey[] = ["online"];
  const add = (key: BenefitKey, when: boolean) => {
    if (when && !picks.includes(key)) picks.push(key);
  };
  add("reminder", answers.dert === "gelmeyen" || answers.unutan === "ikiuc" || answers.unutan === "dortplus");
  add("night", answers.dert === "gece" || answers.gece === "hemen" || answers.gece === "unutur");
  add("conflict", answers.dert === "cakisma" || answers.kanal === "karisik");
  add("questions", answers.dert === "soru" || answers.kanal === "telefon" || answers.kanal === "whatsapp" || answers.kanal === "dm");
  add("reminder", true);
  add("panel", true);
  return picks.slice(0, 3);
}
