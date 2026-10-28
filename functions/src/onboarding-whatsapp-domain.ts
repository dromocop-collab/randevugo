// Yeni işletme sahibine WhatsApp karşılama akışı — saf yardımcılar. Test: onboarding-whatsapp-domain.test.mjs
// İş: whatsappOnboarding/{businessId} (createBusiness ilk mağazada açar, sendAppointmentSmsJobs zamanlayıcısı işler).
// Ayar: platformPrivateSettings/whatsapp.onboarding { enabled, steps: { <adım>: boolean } } — varsayılan KAPALI
// (şablonlar Meta'da onaylanınca süper admin › WhatsApp › Karşılama'dan açılır).

export type OnboardingStepKey = "welcome" | "setup" | "first_booking" | "trial_ending";

export type OnboardingStep = {
  key: OnboardingStepKey;
  label: string;
  template: string;
  /** Kayıttan sonra ne zaman (deneme bitişine göre olan adımda dueAt ayrıca hesaplanır). */
  delayMs: number;
  /** Bu kadar gecikmiş adım gönderilmez (ör. kanal sonradan açıldıysa eski kayıtlara "hoş geldin" gitmesin). */
  maxLateMs: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: "welcome", label: "Hoş geldin", template: "sr_hosgeldin", delayMs: 2 * MINUTE, maxLateMs: 2 * DAY },
  { key: "setup", label: "Kurulum hatırlatma", template: "sr_kurulum_hatirlatma", delayMs: DAY, maxLateMs: 3 * DAY },
  { key: "first_booking", label: "İlk randevu ipucu", template: "sr_ilk_randevu", delayMs: 3 * DAY, maxLateMs: 4 * DAY },
  { key: "trial_ending", label: "Deneme bitiyor", template: "sr_deneme_bitiyor", delayMs: 25 * DAY, maxLateMs: 4 * DAY },
];

export const TRIAL_ENDING_LEAD_MS = 5 * DAY;

export function stepByKey(key: string): OnboardingStep | null {
  return ONBOARDING_STEPS.find((step) => step.key === key) ?? null;
}

export type OnboardingSettings = { enabled: boolean; steps: Record<OnboardingStepKey, boolean> };

export function parseOnboardingSettings(raw: unknown): OnboardingSettings {
  const data = (raw ?? {}) as { enabled?: unknown; steps?: Record<string, unknown> };
  const steps = {} as Record<OnboardingStepKey, boolean>;
  for (const step of ONBOARDING_STEPS) steps[step.key] = data.steps?.[step.key] !== false;
  return { enabled: data.enabled === true, steps };
}

/** Kayıt anında adımların planlanan zamanları. trialEndsAt bilinirse son adım bitişten 5 gün önceye çekilir. */
export function planOnboarding(createdAtMs: number, trialEndsAtMs: number | null): Record<OnboardingStepKey, number> {
  const plan = {} as Record<OnboardingStepKey, number>;
  for (const step of ONBOARDING_STEPS) plan[step.key] = createdAtMs + step.delayMs;
  if (trialEndsAtMs && trialEndsAtMs - TRIAL_ENDING_LEAD_MS > createdAtMs + DAY) plan.trial_ending = trialEndsAtMs - TRIAL_ENDING_LEAD_MS;
  return plan;
}

export type OnboardingState = {
  exists: boolean;
  suspended: boolean;
  isPublished: boolean;
  approvalStatus: string;
  serviceCount: number;
  staffCount: number;
  hasWorkingHours: boolean;
  hasLogo: boolean;
  appointmentCount: number;
  subscriptionStatus: string;
  isLifetime: boolean;
  trialEndsAtMs: number | null;
};

/** Eksik kurulum adımları (insan okunur, sırayla). */
export function missingSetupItems(state: Pick<OnboardingState, "serviceCount" | "staffCount" | "hasWorkingHours" | "hasLogo">): string[] {
  const items: string[] = [];
  if (state.serviceCount === 0) items.push("hizmetlerini eklemek");
  if (!state.hasWorkingHours) items.push("çalışma saatlerini girmek");
  if (state.staffCount === 0) items.push("çalışan eklemek");
  if (!state.hasLogo) items.push("logo yüklemek");
  return items;
}

/** "a", "a ve b", "a, b ve c" */
export function joinTurkish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ve ${items[items.length - 1]}`;
}

export type StepDecision = { send: true } | { send: false; reason: string };

/** Adım gönderilsin mi? Gönderilmeyecekse neden (panelde gösterilir). */
export function decideStep(key: OnboardingStepKey, state: OnboardingState, nowMs: number, dueAtMs: number): StepDecision {
  const step = stepByKey(key);
  if (!step) return { send: false, reason: "unknown_step" };
  if (!state.exists) return { send: false, reason: "business_deleted" };
  if (state.suspended) return { send: false, reason: "suspended" };
  if (nowMs - dueAtMs > step.maxLateMs) return { send: false, reason: "expired" };
  switch (key) {
    case "welcome":
      return { send: true };
    case "setup":
      return missingSetupItems(state).length > 0 ? { send: true } : { send: false, reason: "setup_complete" };
    case "first_booking":
      if (state.appointmentCount > 0) return { send: false, reason: "has_appointments" };
      if (!state.isPublished) return { send: false, reason: "not_published" };
      if (state.serviceCount === 0) return { send: false, reason: "no_services" };
      return { send: true };
    case "trial_ending": {
      if (state.isLifetime || state.subscriptionStatus !== "trialing") return { send: false, reason: "not_trialing" };
      if (!state.trialEndsAtMs || state.trialEndsAtMs <= nowMs) return { send: false, reason: "trial_over" };
      return { send: true };
    }
  }
}

export const SKIP_REASON_LABEL: Record<string, string> = {
  unknown_step: "Bilinmeyen adım",
  business_deleted: "İşletme silinmiş",
  suspended: "İşletme askıda",
  expired: "Süresi geçti",
  setup_complete: "Kurulum zaten tamam",
  has_appointments: "Zaten randevu almış",
  not_published: "Mağaza henüz yayında değil",
  no_services: "Hizmet yok",
  not_trialing: "Denemede değil (paket alınmış)",
  trial_over: "Deneme bitmiş",
  disabled: "Akış kapalı",
  step_disabled: "Adım kapalı",
  opted_out: "Kişi DUR dedi",
  channel_off: "WhatsApp kanalı kapalı",
  invalid_phone: "Cep numarası geçersiz",
};

/** Kişinin adı: "Ahmet Yılmaz" → "Ahmet"; yoksa işletme adı. */
export function greetingName(ownerName: unknown, businessName: string): string {
  const first = String(ownerName ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}'-]{2,30}$/u.test(first) ? first : businessName;
}

export type OnboardingParams = {
  name: string;
  businessName: string;
  slug: string;
  missing: string;
  daysLeft: number;
};

const clean = (value: string, fallback: string) =>
  (value.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || fallback).slice(0, 120);

/** Gönderilecek gövde değişkenleri ve dinamik düğme değerleri (şablon tanımlarıyla aynı sırada). */
export function onboardingTemplateValues(key: OnboardingStepKey, params: OnboardingParams): { body: string[]; urlButton: string | null } {
  const name = clean(params.name, "Merhaba");
  const business = clean(params.businessName, "İşletmen");
  switch (key) {
    case "welcome":
      return { body: [name, business], urlButton: null };
    case "setup":
      return { body: [name, business, clean(params.missing, "birkaç adımı tamamlamak")], urlButton: null };
    case "first_booking":
      return { body: [name, business, `seninrandevun.com/isletme/${params.slug}`], urlButton: params.slug };
    case "trial_ending":
      return { body: [name, business, String(Math.max(1, Math.min(30, Math.round(params.daysLeft))))], urlButton: null };
  }
}

export function buildOnboardingMessage(key: OnboardingStepKey, to: string, params: OnboardingParams, language: string, templateName?: string) {
  const step = stepByKey(key)!;
  const values = onboardingTemplateValues(key, params);
  const components: Array<Record<string, unknown>> = [
    { type: "body", parameters: values.body.map((text) => ({ type: "text", text })) },
  ];
  if (values.urlButton) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: values.urlButton }] });
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: { name: templateName ?? step.template, language: { code: language }, components },
  };
}

/** Gelen kutusunda giden mesajın okunur hâli (şablon metninin doldurulmuş kopyası). */
export function renderOnboardingText(key: OnboardingStepKey, params: OnboardingParams): string {
  const definition = ONBOARDING_TEMPLATE_DEFINITIONS.find((item) => item.step === key)!;
  const values = onboardingTemplateValues(key, params).body;
  return definition.body.replace(/\{\{(\d+)\}\}/g, (_, index: string) => values[Number(index) - 1] ?? "");
}

export type TemplateDefinition = {
  step: OnboardingStepKey;
  name: string;
  category: "UTILITY" | "MARKETING";
  body: string;
  bodyExample: string[];
  buttons: Array<{ type: "URL"; text: string; url: string; example?: string } | { type: "QUICK_REPLY"; text: string }>;
};

/** Meta'ya gönderilen şablon tanımları (süper admin "Şablonları Meta'ya gönder"). Değişken sırası onboardingTemplateValues ile aynı. */
export const ONBOARDING_TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    step: "welcome",
    name: "sr_hosgeldin",
    category: "UTILITY",
    body: "Merhaba {{1}}, Senin Randevun'a hoş geldin! 🎉\n\n*{{2}}* işletme hesabın oluşturuldu. Mağazan kısa bir kontrolden sonra yayına açılacak; bu sırada hizmetlerini ve çalışma saatlerini ekleyerek hazırlığı tamamlayabilirsin.\n\nKurulumda takıldığın her an bu numaraya yazabilirsin, ekibimiz yardımcı olur.",
    bodyExample: ["Ayşe", "Ayşe Güzellik Salonu"],
    buttons: [
      { type: "URL", text: "Panelimi aç", url: "https://seninrandevun.com/dashboard" },
      { type: "QUICK_REPLY", text: "Kurulumda yardım istiyorum" },
    ],
  },
  {
    step: "setup",
    name: "sr_kurulum_hatirlatma",
    category: "UTILITY",
    body: "Merhaba {{1}}, *{{2}}* mağazanın kurulumunda birkaç adım kaldı: {{3}}.\n\nBu adımları tamamlayınca müşterilerin online randevu almaya başlayabilir. Yaklaşık 5 dakika sürer.",
    bodyExample: ["Ayşe", "Ayşe Güzellik Salonu", "hizmetlerini eklemek ve çalışma saatlerini girmek"],
    buttons: [
      { type: "URL", text: "Kurulumu tamamla", url: "https://seninrandevun.com/dashboard" },
      { type: "QUICK_REPLY", text: "Benim yerime kurun" },
    ],
  },
  {
    step: "first_booking",
    name: "sr_ilk_randevu",
    category: "UTILITY",
    body: "Merhaba {{1}}, *{{2}}* randevu almaya hazır! 🚀\n\nİlk randevularını almak için mağaza linkini Instagram biyografine ve WhatsApp durumuna ekle: {{3}}\n\nMüşterilerin bu linkten 7/24 randevu alabilir.",
    bodyExample: ["Ayşe", "Ayşe Güzellik Salonu", "seninrandevun.com/isletme/ayse-guzellik"],
    buttons: [
      { type: "URL", text: "Mağazamı gör", url: "https://seninrandevun.com/isletme/{{1}}", example: "https://seninrandevun.com/isletme/ayse-guzellik" },
    ],
  },
  {
    step: "trial_ending",
    name: "sr_deneme_bitiyor",
    category: "UTILITY",
    body: "Merhaba {{1}}, *{{2}}* için ücretsiz deneme süren {{3}} gün sonra bitiyor. Randevularının kesintisiz devam etmesi için paketini panelden seçebilirsin.\n\nSorun olursa bu numaraya yazman yeterli.",
    bodyExample: ["Ayşe", "Ayşe Güzellik Salonu", "5"],
    buttons: [
      { type: "URL", text: "Paketleri gör", url: "https://seninrandevun.com/dashboard/abonelik" },
    ],
  },
];

/** Meta Graph message_templates POST gövdesi. */
export function templateCreatePayload(definition: TemplateDefinition, language: string) {
  return {
    name: definition.name,
    language,
    category: definition.category,
    allow_category_change: true,
    components: [
      { type: "BODY", text: definition.body, example: { body_text: [definition.bodyExample] } },
      {
        type: "BUTTONS",
        buttons: definition.buttons.map((button) => button.type === "URL"
          ? { type: "URL", text: button.text, url: button.url, ...(button.example ? { example: [button.example] } : {}) }
          : { type: "QUICK_REPLY", text: button.text }),
      },
    ],
  };
}

/** "DUR", "stop", "istemiyorum"… → çıkış; "BAŞLAT"/"start" → yeniden katılım. */
export function optCommand(text: unknown): "out" | "in" | null {
  const normalized = String(text ?? "").trim().toLocaleLowerCase("tr-TR").replace(/[.!\s]+$/g, "");
  if (["dur", "stop", "iptal", "istemiyorum", "mesaj atma", "abonelikten çık", "çık"].includes(normalized)) return "out";
  if (["başlat", "baslat", "start"].includes(normalized)) return "in";
  return null;
}

/** Adım durumlarından bir sonraki bekleyen zaman (yoksa null = akış bitti). */
export function nextDueAt(steps: Record<string, { status?: unknown; dueAt?: unknown }>): number | null {
  const pending = Object.values(steps)
    .filter((step) => step.status === "pending" && typeof step.dueAt === "number")
    .map((step) => step.dueAt as number);
  return pending.length ? Math.min(...pending) : null;
}

/** Senin Randevun iletişim numarası (web/lib/legal/seller.ts ile aynı tutulmalı). */
export const PLATFORM_CONTACT_PHONE = "0530 478 82 98";

/**
 * WhatsApp karşılama iletilemezse (numarada WhatsApp yok / Meta reddetti) bir kez gönderilen karşılama SMS'i.
 * Türkçe karakterli SMS'te ~3 parça; bağlantı ve iletişim numarası ayrı satırda.
 */
export function welcomeSmsText(params: Pick<OnboardingParams, "name" | "businessName">): string {
  const name = clean(params.name, "Merhaba");
  const business = clean(params.businessName, "İşletmen").slice(0, 60);
  return [
    `Merhaba ${name}, Senin Randevun'a hoş geldin!`,
    `${business} hesabın oluşturuldu. Mağazan kısa bir kontrolden sonra yayına açılacak; bu sırada hizmetlerini ve çalışma saatlerini ekleyerek kurulumu tamamlayabilirsin: seninrandevun.com/dashboard`,
    `Takıldığın her an bize ulaş: ${PLATFORM_CONTACT_PHONE} (arama veya WhatsApp)`,
    "Senin Randevun ekibi",
  ].join("\n");
}
