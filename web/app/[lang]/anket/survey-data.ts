/**
 * "Randevu karakterin ne?" anketi — sorular, sonuç tipleri ve puanlama.
 * Kimlik/iletişim bilgisi SORULMAZ; yalnızca seçenek kimlikleri kaydedilir.
 * Seçenek veya sonuç kimliği değişirse firestore.rules içindeki surveyResponses kuralı da güncellenmeli.
 */

import { tk, type TFunction } from "@/i18n/config";

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
    title: tk("Hangi işin ustasısın?"),
    subtitle: tk("İşletmeni seç, Rovi ona göre heyecanlansın."),
    rovi: tk("Önce tanışalım 🤝"),
    layout: "grid",
    options: [
      { id: "kuafor", emoji: "✂️", label: tk("Kuaför"), quip: tk("Saçlar emin ellerde! ✂️") },
      { id: "berber", emoji: "💈", label: tk("Berber"), quip: tk("Ustam, sakal da dahil mi? 💈") },
      { id: "guzellik", emoji: "💅", label: tk("Güzellik & Nail"), quip: tk("Işıl ışıl bir takvim geliyor ✨") },
      { id: "spa", emoji: "🧖", label: tk("Spa & Masaj"), quip: tk("Rovi şimdiden rahatladı 😌") },
      { id: "klinik", emoji: "🩺", label: tk("Klinik & Sağlık"), quip: tk("Randevular da sağlıklı olsun 🩺") },
      { id: "diyetisyen", emoji: "🥗", label: tk("Diyetisyen"), quip: tk("Takvim de fit olsun 🥗") },
      { id: "spor", emoji: "🏋️", label: tk("Spor & PT"), quip: tk("Bir set daha! 💪") },
      { id: "egitim", emoji: "📚", label: tk("Eğitim & Kurs"), quip: tk("Ders zili çaldı! 📚") },
      { id: "servis", emoji: "🔧", label: tk("Servis & Tamir"), quip: tk("Takvimi de biz tamir ederiz 🔧") },
      { id: "diger", emoji: "🌟", label: tk("Başka bir iş"), quip: tk("Her işin randevusu güzel 🌟") },
    ],
  },
  {
    key: "kanal",
    title: tk("Randevuları şu an nasıl alıyorsun?"),
    subtitle: tk("Dürüst ol, Rovi kimseye söylemez 🤫"),
    rovi: tk("Hmm, merak ettim…"),
    layout: "grid",
    options: [
      { id: "telefon", emoji: "📞", label: tk("Telefonla"), quip: tk("Alo, alo! Kulağın alışmıştır 📞"), scores: { "telefon-ninjasi": 3 } },
      { id: "whatsapp", emoji: "💬", label: tk("WhatsApp'tan"), quip: tk("Mavi tikler seni çağırıyor 💬"), scores: { "mesaj-sampiyonu": 3 } },
      { id: "dm", emoji: "📸", label: tk("Instagram DM"), quip: tk("DM kutusu = randevu defteri 😅"), scores: { "mesaj-sampiyonu": 2, "gece-kusu": 1 } },
      { id: "defter", emoji: "📒", label: tk("Defter & kalem"), quip: tk("Klasik! Kalemin hiç bitmesin 📒"), scores: { "defter-ustasi": 3 } },
      { id: "uygulama", emoji: "📱", label: tk("Bir uygulama"), quip: tk("Ooo, teknoloji dostu! 🚀"), scores: { "dijital-kasif": 4 } },
      { id: "karisik", emoji: "🌀", label: tk("Hepsi birden"), quip: tk("Tam bir cambazsın 🤹"), scores: { "takvim-cambazi": 3 } },
    ],
  },
  {
    key: "mesaj",
    title: tk("Günde kaç telefon / mesaj sadece randevu için geliyor?"),
    subtitle: tk("“Yarın müsait misin?” dahil 😄"),
    rovi: tk("Say bakalım…"),
    layout: "list",
    options: [
      { id: "az", emoji: "🐢", label: tk("0 – 5"), hint: tk("Sakin günler"), quip: tk("Huzurlu bir işletme 🍵"), scores: { "dijital-kasif": 1 } },
      { id: "orta", emoji: "🐇", label: tk("5 – 15"), hint: tk("Tempolu"), quip: tk("Tempo güzel! 🐇"), scores: { "telefon-ninjasi": 1, "mesaj-sampiyonu": 1 } },
      { id: "cok", emoji: "🚀", label: tk("15 – 30"), hint: tk("Telefon hiç susmuyor"), quip: tk("Burası çağrı merkezi mi? 😄"), scores: { "telefon-ninjasi": 2, "takvim-cambazi": 1 } },
      { id: "asiri", emoji: "🌋", label: tk("30+"), hint: tk("Kendi santralim var"), quip: tk("Rovi'nin başı döndü 😵‍💫"), mood: "thinking", scores: { "telefon-ninjasi": 2, "takvim-cambazi": 2 } },
    ],
  },
  {
    key: "dert",
    title: tk("Seni en çok ne sinir eder?"),
    subtitle: tk("Bir tane seç; hepsi diyorsan en büyüğünü 😅"),
    rovi: tk("Derdini anlat…"),
    layout: "grid",
    options: [
      { id: "gelmeyen", emoji: "👻", label: tk("Gelmeyen müşteri"), quip: tk("Hayalet müşteriler… 👻"), mood: "thinking", scores: { "defter-ustasi": 1, "mesaj-sampiyonu": 1 } },
      { id: "gece", emoji: "🌙", label: tk("Gece gelen mesajlar"), quip: tk("23:47 — “Yarına yer var mı?” 🌙"), mood: "thinking", scores: { "gece-kusu": 3 } },
      { id: "cakisma", emoji: "💥", label: tk("Çakışan saatler"), quip: tk("İki müşteri, tek koltuk… 💥"), mood: "thinking", scores: { "takvim-cambazi": 2, "defter-ustasi": 1 } },
      { id: "soru", emoji: "🔁", label: tk("Bitmeyen “müsait misin?”"), quip: tk("“3?” Dolu. “4?” Dolu. 😮‍💨"), mood: "thinking", scores: { "telefon-ninjasi": 2, "mesaj-sampiyonu": 1 } },
    ],
  },
  {
    key: "unutan",
    title: tk("10 müşteriden kaçı randevuyu unutur ya da gelmez?"),
    subtitle: tk("Haber vermeden boş kalan koltuklar…"),
    rovi: tk("Bu biraz acıtabilir 🫣"),
    layout: "list",
    options: [
      { id: "sifir", emoji: "😇", label: tk("Hiçbiri"), hint: tk("Müşterilerim melek"), quip: tk("Müşterilerin altın gibi 😇"), scores: { "dijital-kasif": 1 } },
      { id: "bir", emoji: "🙂", label: tk("1 kişi"), hint: tk("Arada bir oluyor"), quip: tk("Fena değil, idare eder 🙂") },
      { id: "ikiuc", emoji: "😬", label: tk("2 – 3 kişi"), hint: tk("Can sıkıyor"), quip: tk("Boş koltuk, boş kasa 😬"), mood: "thinking", scores: { "defter-ustasi": 1 } },
      { id: "dortplus", emoji: "🫠", label: tk("4 ve üstü"), hint: tk("Artık alıştım"), quip: tk("Ah be… buna bir çare bulacağız 🫠"), mood: "thinking", scores: { "defter-ustasi": 2 } },
    ],
  },
  {
    key: "gece",
    title: tk("Gece 23:00. “Yarın müsait misin?” mesajı geldi. Ne yaparsın?"),
    subtitle: tk("İlk aklına geleni seç."),
    rovi: tk("Dıt dıt! 📩"),
    layout: "list",
    options: [
      { id: "hemen", emoji: "⚡", label: tk("Anında cevaplarım"), hint: tk("Müşteri kaçmasın!"), quip: tk("Gece kuşu tespit edildi 🦉"), scores: { "gece-kusu": 3 } },
      { id: "sabah", emoji: "☀️", label: tk("Sabahı beklerim"), hint: tk("Gece benim vaktim"), quip: tk("Sağlıklı sınırlar! ☀️"), scores: { "dijital-kasif": 1 } },
      { id: "unutur", emoji: "🙈", label: tk("Cevaplamayı unuturum"), hint: tk("Sonra hatırlarım… belki"), quip: tk("O müşteri başka yere gitti bile 🙈"), mood: "thinking", scores: { "defter-ustasi": 1, "mesaj-sampiyonu": 1 } },
      { id: "kapali", emoji: "📵", label: tk("Telefon gece kapalı"), hint: tk("Zen modu"), quip: tk("Zen modu açık 🧘"), scores: { "dijital-kasif": 1 } },
    ],
  },
  {
    key: "saat",
    title: tk("Haftada kaç saatin randevu ayarlamaya gidiyor?"),
    subtitle: tk("Cevap yazmak, aramak, deftere geçirmek, saat kaydırmak…"),
    rovi: tk("Hesap makinemi hazırlıyorum 🧮"),
    layout: "list",
    options: [
      { id: "s1", emoji: "⏱️", label: tk("1 saatten az"), quip: tk("Verimlilik canavarı! ⏱️"), scores: { "dijital-kasif": 2 } },
      { id: "s3", emoji: "⌛", label: tk("1 – 3 saat"), quip: tk("Bir film süresi kadar ⌛") },
      { id: "s6", emoji: "🕰️", label: tk("3 – 6 saat"), quip: tk("Neredeyse bir iş günü! 🕰️"), mood: "thinking", scores: { "takvim-cambazi": 1, "telefon-ninjasi": 1 } },
      { id: "s10", emoji: "🫣", label: tk("6 saatten fazla"), quip: tk("Bu bir yarı zamanlı iş! 🫣"), mood: "thinking", scores: { "takvim-cambazi": 2, "telefon-ninjasi": 1 } },
    ],
  },
  {
    key: "hayal",
    title: tk("Kazandığın vakitle ne yapardın?"),
    subtitle: tk("Son soru! Hayal kurmak serbest ✨"),
    rovi: tk("En sevdiğim soru 😍"),
    layout: "grid",
    options: [
      { id: "musteri", emoji: "💼", label: tk("Daha çok müşteri"), quip: tk("Kasa şenlensin! 💸") },
      { id: "aile", emoji: "❤️", label: tk("Aileme vakit"), quip: tk("En güzel yatırım ❤️") },
      { id: "tatil", emoji: "🏖️", label: tk("Tatil!"), quip: tk("Rovi de geliyor 🏖️") },
      { id: "uyku", emoji: "😴", label: tk("Uyku, bol uyku"), quip: tk("Sonuna kadar hak ettin 😴") },
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
    title: tk("Telefon Ninjası"),
    tagline: tk("Bir elde makas, bir elde telefon."),
    description: tk("Refleksin efsane: hiçbir çağrı kaçmıyor. Ama kulağın da artık tatil istiyor. Müşterilerin saatini kendisi seçsin, telefon sadece sohbet için çalsın."),
    accent: ["#d7ff70", "#5eead4"],
  },
  "mesaj-sampiyonu": {
    type: "mesaj-sampiyonu",
    emoji: "💬",
    title: tk("Mesaj Şampiyonu"),
    tagline: tk("Mavi tikler senin sahnen."),
    description: tk("WhatsApp'ta, DM'de, her yerde yetişiyorsun. Ama aynı “hangi saat boş?” sorusunu günde 20 kez cevaplamak şampiyonu bile yorar. Tek link at, gerisini takvim halletsin."),
    accent: ["#86efac", "#38bdf8"],
  },
  "defter-ustasi": {
    type: "defter-ustasi",
    emoji: "📒",
    title: tk("Defter Ustası"),
    tagline: tk("Kalemin keskin, defterin kutsal."),
    description: tk("Her şey kontrol altında… o defter kaybolana ya da üstüne çay dökülene kadar 😱 Takvimini buluta taşı, hatırlatmaları SMS ve bildirim yapsın."),
    accent: ["#fde68a", "#d7ff70"],
  },
  "gece-kusu": {
    type: "gece-kusu",
    emoji: "🦉",
    title: tk("Gece Kuşu"),
    tagline: tk("Gece yarısı bile randevu veriyorsun."),
    description: tk("Müşterilerin sana bayılıyor, uykun ise küsmüş durumda. Gece gelen randevu isteklerini sen değil, 7/24 açık online takvimin karşılasın."),
    accent: ["#c4b5fd", "#d7ff70"],
  },
  "takvim-cambazi": {
    type: "takvim-cambazi",
    emoji: "🤹",
    title: tk("Takvim Cambazı"),
    tagline: tk("Telefon, WhatsApp, DM… hepsi aynı anda havada."),
    description: tk("Etkileyici bir denge şovu! Ama tek bir yanlış adım = çakışan iki randevu. Tüm kanalları tek takvimde topla; dolu saat zaten seçilemesin."),
    accent: ["#fda4af", "#fde68a"],
  },
  "dijital-kasif": {
    type: "dijital-kasif",
    emoji: "🚀",
    title: tk("Dijital Kaşif"),
    tagline: tk("Geleceğe bir ayağını çoktan atmışsın."),
    description: tk("Düzenlisin, teknolojiyle aran iyi. Şimdi diğer ayağı da at: 7/24 online randevu, otomatik hatırlatma, ekip ve müşteriler tek panelde."),
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
export function dreamLine(answers: Answers, hours: number, t: TFunction): string {
  const yearlyHours = hours * 48;
  const days = Math.max(1, Math.round(yearlyHours / 8));
  switch (answers.hayal) {
    case "musteri":
      return t("Bu süre haftada ~{count} müşteri daha ağırlamaya yeter 💼", { count: Math.max(1, Math.round(hours * 1.5)) });
    case "aile":
      return t("Yılda ~{count} gün daha ailenle ❤️", { count: days });
    case "tatil":
      return t("Bu, yılda ~{count} günlük ekstra tatil demek 🏖️", { count: days });
    case "uyku":
      return t("Bu, haftada ~{count} akşam erken yatmak demek. Rovi kıskandı 😴", { count: Math.max(1, Math.round(hours / 1.5)) });
    default:
      return t("Yılda ~{count} iş günü sana kalır ✨", { count: days });
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
