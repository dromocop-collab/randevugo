// WhatsApp'tan işletme kaydı (sohbet botu) — saf mantık. Test: whatsapp-signup-domain.test.mjs
//
// Akış: ad → kategori (liste) → il/ilçe → açık adres (atlanabilir) → yetkili adı → e-posta → özet/onay → hesap + mağaza.
// Durum whatsappSignups/{konuşmaKimliği} belgesinde tutulur; her gelen mesaj advanceSignup ile bir adım ilerletir.
// Telefon numarası WhatsApp'ın kendisinden gelir (doğrulanmış sayılır); şifre, e-postaya değil WhatsApp'a gönderilen
// "şifreni belirle" bağlantısıyla oluşturulur.

export type SignupStep = "name" | "category" | "location" | "district" | "address" | "owner" | "email" | "confirm";
export type SignupData = {
  name?: string; category?: string; categoryLabel?: string; city?: string; district?: string; address?: string;
  addressSkipped?: boolean; ownerName?: string; email?: string;
};
export type SignupState = { step: SignupStep; data: SignupData };
export type Button = { id: string; title: string };
export type ListRow = { id: string; title: string; description?: string };
export type Outgoing =
  | { kind: "text"; text: string }
  | { kind: "buttons"; text: string; buttons: Button[] }
  | { kind: "list"; text: string; button: string; rows: ListRow[] }
  | { kind: "cta"; text: string; button: string; url: string };
export type Transition = { state: SignupState | null; messages: Outgoing[]; action?: "create" | "cancel" | "check_email" };
export type SignupInput = { text: string | null; replyId: string | null };
export type SignupContext = { profileName: string | null; nameAllowed: (name: string) => boolean };

/** Oturum bu kadar süre sessiz kalırsa yeniden başlar. */
export const SIGNUP_IDLE_MS = 24 * 3_600_000;

/** Liste mesajı en fazla 10 satır alır: en çok kullanılan 9 kategori + "Diğer". Slug'lar web kataloğuyla aynı. */
export const SIGNUP_CATEGORIES: ReadonlyArray<{ slug: string; label: string; emoji: string; description: string; aliases: string[] }> = [
  { slug: "kuafor", label: "Kuaför", emoji: "💇", description: "Kesim, renklendirme, saç bakımı", aliases: ["kuafor", "kuaför", "bayan kuaför", "sac", "saç"] },
  { slug: "berber", label: "Berber", emoji: "💈", description: "Saç, sakal, erkek bakımı", aliases: ["berber", "erkek kuaför", "barber", "sakal"] },
  { slug: "guzellik", label: "Güzellik Merkezi", emoji: "💅", description: "Cilt bakımı, lazer, kaş-kirpik", aliases: ["guzellik", "güzellik", "guzellik merkezi", "güzellik salonu", "estetik", "lazer", "cilt"] },
  { slug: "nail", label: "Nail Studio", emoji: "💎", description: "Manikür, pedikür, nail art", aliases: ["nail", "tirnak", "tırnak", "manikur", "manikür", "protez tırnak"] },
  { slug: "spa", label: "Spa & Masaj", emoji: "🧖", description: "Masaj, hamam, vücut bakımı", aliases: ["spa", "masaj", "hamam"] },
  { slug: "saglik", label: "Sağlık", emoji: "🩺", description: "Klinik, fizyoterapi, diyetisyen", aliases: ["saglik", "sağlık", "klinik", "doktor", "fizyoterapi", "diyetisyen", "dis", "diş"] },
  { slug: "spor", label: "Spor & PT", emoji: "🏋️", description: "Pilates, fitness, kişisel antrenman", aliases: ["spor", "pilates", "fitness", "yoga", "pt", "antrenor", "antrenör"] },
  { slug: "danismanlik", label: "Danışmanlık", emoji: "📋", description: "Terapi, koçluk, uzman görüşmesi", aliases: ["danismanlik", "danışmanlık", "psikolog", "terapi", "koc", "koç", "avukat"] },
  { slug: "veteriner", label: "Veteriner", emoji: "🐾", description: "Veteriner, pet kuaför", aliases: ["veteriner", "pet", "pet kuafor", "pet kuaför"] },
  { slug: "diger", label: "Diğer", emoji: "📂", description: "Eğitim, servis, başka bir alan", aliases: ["diger", "diğer", "başka", "baska", "egitim", "eğitim", "kurs", "servis"] },
];

/** Türkiye'nin 81 ili (gösterim biçiminde). */
export const PROVINCES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl",
  "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir",
  "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş",
  "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ",
  "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale",
  "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce",
] as const;
const PROVINCE_ALIASES: Record<string, string> = { "afyon": "Afyonkarahisar", "maraş": "Kahramanmaraş", "maras": "Kahramanmaraş", "urfa": "Şanlıurfa", "antep": "Gaziantep", "içel": "Mersin", "icel": "Mersin", "izmit": "Kocaeli", "adapazarı": "Sakarya", "adapazari": "Sakarya" };

/** Karşılaştırma anahtarı: Türkçe küçük harf + harf sadeleştirme (muğla = mugla). */
export function fold(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** "Fethiye" → "Fethiye", "SEYDİKEMER" → "Seydikemer" (Türkçe büyük/küçük harf). */
export function titleCaseTr(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR").split(" ")
    .map((word) => word ? word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1) : word).join(" ");
}

const FILLER = new Set(["da", "de", "ta", "te", "il", "ili", "ilce", "ilcesi", "sehir", "sehri"]);

/** "Muğla Fethiye", "fethiye/mugla", "Fethiye, Muğla" → { city: "Muğla", district: "Fethiye" }. İl yoksa null. */
export function parseLocation(text: string): { city: string; district: string | null } | null {
  const words = fold(text).split(" ").filter(Boolean);
  const original = text.replace(/[^\p{L}\p{N}\s]+/gu, " ").trim().split(/\s+/).filter(Boolean);
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const city = PROVINCES.find((province) => fold(province) === word) ?? (PROVINCE_ALIASES[word] ? PROVINCE_ALIASES[word] : null);
    if (!city) continue;
    // "Muğla'da Ortaca", "Fethiye ilçesi" gibi eklerden arındır.
    const rest = original.filter((token, position) => position !== index && !FILLER.has(fold(token))).join(" ").trim();
    // "İstanbul Kadıköy" → Kadıköy; ilçe il adıyla aynıysa (Muğla Muğla) "Merkez".
    const district = rest && fold(rest) !== word ? titleCaseTr(rest).slice(0, 60) : null;
    return { city, district };
  }
  return null;
}

/** Bir sohbeti kayıt botuna sokan ifadeler (reklam/tanıtım sayfasındaki hazır mesaj dahil). */
export function isSignupIntent(text: string | null, fromAd: boolean): boolean {
  if (fromAd) return true;
  if (!text) return false;
  const value = fold(text);
  return /\b(kayit ol|kaydol|kaydolmak|kayit olmak|kaydet|kaydetmek|uye ol|ucretsiz basla|isletmemi|isletme ac|magaza ac|magazami|hesap ac|denemek istiyorum|deneme surumu)\b/.test(value);
}

export function cancelCommand(text: string | null): boolean {
  return Boolean(text && /^(iptal|vazgec|vazgectim|cikis|kayit iptal)$/.test(fold(text)));
}

function backCommand(text: string | null): boolean {
  return Boolean(text && /^(geri|onceki|duzelt)$/.test(fold(text)));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const short = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

function askName(): Outgoing { return { kind: "text", text: "İşletmenin adı ne? ✍️\n(ör. Elif Güzellik Salonu)" }; }
function askCategory(): Outgoing {
  return {
    kind: "list", text: "Hangi alanda hizmet veriyorsun? Aşağıdan seç 👇", button: "Kategori seç",
    rows: SIGNUP_CATEGORIES.map((item) => ({ id: `cat_${item.slug}`, title: short(`${item.emoji} ${item.label}`, 24), description: short(item.description, 72) })),
  };
}
function askLocation(): Outgoing { return { kind: "text", text: "Hangi il ve ilçedesin? 📍\n(ör. Muğla Fethiye)" }; }
function askDistrict(city: string): Outgoing { return { kind: "text", text: `${city} içinde hangi ilçe? (ör. Merkez)` }; }
function askAddress(): Outgoing {
  return { kind: "buttons", text: "Açık adresini yazar mısın? (mahalle, cadde, no)\nMüşterilerin yol tarifini buradan alır. İstersen sonra panelden de ekleyebilirsin.", buttons: [{ id: "address_skip", title: "Sonra eklerim" }] };
}
function askOwner(profileName: string | null): Outgoing {
  const text = "Son iki soru 🙌 Adın soyadın ne?";
  return profileName && profileName.trim().length >= 2
    ? { kind: "buttons", text, buttons: [{ id: "owner_profile", title: short(profileName.trim(), 20) }] }
    : { kind: "text", text };
}
function askEmail(): Outgoing { return { kind: "text", text: "E-posta adresin? 📧\nPanele girişin ve faturaların için kullanılacak." }; }

export function summaryText(data: SignupData): string {
  return [
    "Her şey hazır, kontrol eder misin? 👇",
    "",
    `🏪 *${data.name}*`,
    `🏷️ ${data.categoryLabel ?? "Diğer"}`,
    `📍 ${[data.district, data.city].filter(Boolean).join(", ")}`,
    `🏠 ${data.addressSkipped ? "Adres sonra eklenecek" : data.address}`,
    `👤 ${data.ownerName}`,
    `📧 ${data.email}`,
    "",
    "İlk ay ücretsiz, kredi kartı gerekmez.",
  ].join("\n");
}
function askConfirm(data: SignupData): Outgoing {
  return { kind: "buttons", text: summaryText(data), buttons: [{ id: "confirm_yes", title: "✅ Mağazamı aç" }, { id: "confirm_restart", title: "✏️ Baştan yaz" }] };
}

/** Kayıt sohbetini başlatır. */
export function startSignup(): Transition {
  return {
    state: { step: "name", data: {} },
    messages: [
      { kind: "text", text: "Merhaba! 👋 Senin Randevun'a hoş geldin.\nBirkaç kısa soruyla işletmeni 2 dakikada buradan açalım. İlk ay ücretsiz, kredi kartı gerekmez.\n\nİstediğin an *iptal* yazarak çıkabilir, *geri* yazarak bir önceki soruya dönebilirsin." },
      askName(),
    ],
  };
}

const PREVIOUS: Record<SignupStep, SignupStep | null> = {
  name: null, category: "name", location: "category", district: "location", address: "location", owner: "address", email: "owner", confirm: "email",
};

function promptFor(step: SignupStep, data: SignupData, context: SignupContext): Outgoing {
  switch (step) {
    case "name": return askName();
    case "category": return askCategory();
    case "location": return askLocation();
    case "district": return askDistrict(data.city ?? "");
    case "address": return askAddress();
    case "owner": return askOwner(context.profileName);
    case "email": return askEmail();
    case "confirm": return askConfirm(data);
  }
}

function categoryFrom(input: SignupInput): (typeof SIGNUP_CATEGORIES)[number] | null {
  if (input.replyId?.startsWith("cat_")) return SIGNUP_CATEGORIES.find((item) => `cat_${item.slug}` === input.replyId) ?? null;
  if (!input.text) return null;
  const value = fold(input.text.replace(/^\p{Extended_Pictographic}\s*/u, ""));
  return SIGNUP_CATEGORIES.find((item) => fold(item.label) === value || item.aliases.some((alias) => fold(alias) === value))
    ?? SIGNUP_CATEGORIES.find((item) => item.aliases.some((alias) => fold(alias).length >= 4 && value.includes(fold(alias)))) ?? null;
}

/** Bir gelen mesajla sohbeti bir adım ilerletir. Yanıt mesajları ve (gerekirse) yapılacak iş döner. */
export function advanceSignup(state: SignupState, input: SignupInput, context: SignupContext): Transition {
  const text = input.text?.trim() ?? "";
  if (cancelCommand(text)) {
    return { state: null, action: "cancel", messages: [{ kind: "text", text: "Tamam, kaydı iptal ettim. İstediğin zaman *kaydol* yazarak yeniden başlayabilirsin. 👋" }] };
  }
  if (backCommand(text) && PREVIOUS[state.step]) {
    const step = PREVIOUS[state.step]!;
    return { state: { step, data: state.data }, messages: [promptFor(step, state.data, context)] };
  }
  const data = { ...state.data };
  const retry = (message: string): Transition => ({ state, messages: [{ kind: "text", text: message }, promptFor(state.step, data, context)] });

  switch (state.step) {
    case "name": {
      const name = text.replace(/\s+/g, " ").slice(0, 100);
      if (name.length < 2 || !/\p{L}/u.test(name)) return retry("İşletme adı en az 2 harf olmalı.");
      if (!context.nameAllowed(name)) return retry("Bu adı kabul edemiyoruz. Lütfen işletmenin gerçek adını yaz.");
      data.name = name;
      return { state: { step: "category", data }, messages: [askCategory()] };
    }
    case "category": {
      const category = categoryFrom(input);
      if (!category) return { state, messages: [{ kind: "text", text: "Listeden bir kategori seçer misin? Uymuyorsa *Diğer*'i seç." }, askCategory()] };
      data.category = category.slug;
      data.categoryLabel = category.label;
      return { state: { step: "location", data }, messages: [askLocation()] };
    }
    case "location": {
      const location = parseLocation(text);
      if (!location) return retry("İli tanıyamadım 🤔 İl ve ilçeyi birlikte yazar mısın?");
      data.city = location.city;
      if (!location.district) return { state: { step: "district", data }, messages: [askDistrict(location.city)] };
      data.district = location.district;
      return { state: { step: "address", data }, messages: [askAddress()] };
    }
    case "district": {
      const district = text.replace(/\s+/g, " ");
      if (district.length < 2 || district.length > 60 || !/\p{L}/u.test(district)) return retry("İlçe adını yazar mısın?");
      data.district = titleCaseTr(district);
      return { state: { step: "address", data }, messages: [askAddress()] };
    }
    case "address": {
      const skip = input.replyId === "address_skip" || /^(gec|sonra|sonra eklerim|yok|atla)$/.test(fold(text));
      if (skip) {
        data.address = undefined;
        data.addressSkipped = true;
      } else {
        const address = text.replace(/\s+/g, " ").slice(0, 300);
        if (address.length < 5) return retry("Adres biraz kısa kaldı. Mahalle ve caddeyi yazar mısın? İstersen *Sonra eklerim*'e bas.");
        data.address = address;
        data.addressSkipped = false;
      }
      return { state: { step: "owner", data }, messages: [askOwner(context.profileName)] };
    }
    case "owner": {
      const owner = (input.replyId === "owner_profile" && context.profileName ? context.profileName : text).replace(/\s+/g, " ").trim().slice(0, 80);
      if (owner.length < 2 || !/\p{L}/u.test(owner)) return retry("Adını yazar mısın?");
      data.ownerName = titleCaseTr(owner);
      return { state: { step: "email", data }, messages: [askEmail()] };
    }
    case "email": {
      const email = text.replace(/\s+/g, "").toLowerCase().slice(0, 160);
      if (!EMAIL.test(email)) return retry("Bu e-posta adresi geçersiz görünüyor. Tekrar yazar mısın? (ör. ad@gmail.com)");
      data.email = email;
      // Hesap var mı denetimi sunucuda (Firebase Auth); temizse özet gösterilir.
      return { state: { step: "confirm", data }, action: "check_email", messages: [askConfirm(data)] };
    }
    case "confirm": {
      if (input.replyId === "confirm_restart" || /^(bastan|bastan yaz|yeniden)$/.test(fold(text))) {
        return { state: { step: "name", data: {} }, messages: [{ kind: "text", text: "Tamam, baştan alalım. ✏️" }, askName()] };
      }
      if (input.replyId === "confirm_yes" || /^(evet|onayla|onayliyorum|tamam|ac|magazami ac)$/.test(fold(text))) {
        return { state, action: "create", messages: [{ kind: "text", text: "Harika! Mağazanı hazırlıyorum, birkaç saniye… ⏳" }] };
      }
      return { state, messages: [{ kind: "text", text: "Onaylamak için *Mağazamı aç*'a, değiştirmek için *Baştan yaz*'a bas." }, askConfirm(data)] };
    }
  }
}

/** Mağaza adresi: ad → URL güvenli kısa ad (Türkçe harfler sadeleşir). */
export function slugFromName(name: string): string {
  const slug = fold(name).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50).replace(/-$/, "");
  return slug.length >= 3 ? slug : `isletme-${slug || "yeni"}`.slice(0, 50);
}

/** Varsayılan çalışma saatleri (web sihirbazıyla aynı: Pazartesi–Cumartesi 09:00–19:00, Pazar kapalı). */
export function defaultWorkingHours() {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, isOpen: day !== 0, start: "09:00", end: "19:00" }));
}

/** Meta liste/düğme mesajı gövdeleri (Cloud API). */
export function buildInteractivePayload(to: string, message: Outgoing): Record<string, unknown> {
  if (message.kind === "text") return { messaging_product: "whatsapp", to, type: "text", text: { body: message.text.slice(0, 4096), preview_url: false } };
  if (message.kind === "cta") {
    return {
      messaging_product: "whatsapp", to, type: "interactive",
      interactive: { type: "cta_url", body: { text: message.text.slice(0, 1024) }, action: { name: "cta_url", parameters: { display_text: short(message.button, 20), url: message.url } } },
    };
  }
  if (message.kind === "buttons") {
    return {
      messaging_product: "whatsapp", to, type: "interactive",
      interactive: { type: "button", body: { text: message.text.slice(0, 1024) }, action: { buttons: message.buttons.slice(0, 3).map((button) => ({ type: "reply", reply: { id: button.id.slice(0, 256), title: short(button.title, 20) } })) } },
    };
  }
  return {
    messaging_product: "whatsapp", to, type: "interactive",
    interactive: {
      type: "list", body: { text: message.text.slice(0, 1024) },
      action: { button: short(message.button, 20), sections: [{ title: "Seçenekler", rows: message.rows.slice(0, 10).map((row) => ({ id: row.id.slice(0, 200), title: short(row.title, 24), ...(row.description ? { description: short(row.description, 72) } : {}) })) }] },
    },
  };
}

/** Gelen kutusunda giden mesajın tek satırlık görünümü. */
export function outgoingPreview(message: Outgoing): string {
  if (message.kind === "text") return message.text;
  if (message.kind === "buttons") return `${message.text}\n[${message.buttons.map((button) => button.title).join("] [")}]`;
  if (message.kind === "cta") return `${message.text}\n[${message.button}]`;
  return `${message.text}\n[${message.button}]`;
}
