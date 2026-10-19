import { BellRing, CalendarCheck2, CalendarClock, Check, CircleCheckBig, UserX, XCircle, type LucideIcon } from "lucide-react";
import type { AutomationRuleInput, AutomationTrigger } from "@/features/automations/automation-repository";
import { interpolate, tk, type TFunction } from "@/i18n/config";

const identity: TFunction = (source, vars) => interpolate(source, vars);

export type Accent = "ocean" | "rose" | "amber" | "violet" | "mint";

export const TRIGGERS: Record<AutomationTrigger, { label: string; when: string; example: string; icon: LucideIcon; accent: Accent }> = {
  appointment_created: { label: tk("Yeni randevu"), when: tk("Yeni bir randevu alındığında"), example: tk("Müşteri online randevu aldı ya da siz panelden eklediniz."), icon: CalendarCheck2, accent: "ocean" },
  appointment_confirmed: { label: tk("Randevu onaylandı"), when: tk("Bekleyen bir randevu onaylandığında"), example: tk("Onay bekleyen randevuyu “Onayla” ile kabul ettiniz."), icon: CircleCheckBig, accent: "mint" },
  appointment_rescheduled: { label: tk("Saat değişti"), when: tk("Randevunun tarihi veya saati değiştiğinde"), example: tk("Müşteri randevusunu başka bir saate aldı."), icon: CalendarClock, accent: "amber" },
  appointment_cancelled: { label: tk("Randevu iptali"), when: tk("Bir randevu iptal edildiğinde"), example: tk("Müşteri gelemeyeceğini bildirip iptal etti."), icon: XCircle, accent: "rose" },
  appointment_completed: { label: tk("İşlem tamamlandı"), when: tk("Randevu “Tamamlandı” olarak işaretlendiğinde"), example: tk("Hizmet bitti, randevuyu tamamladınız."), icon: Check, accent: "violet" },
  appointment_no_show: { label: tk("Gelmedi"), when: tk("Randevu “Gelmedi” olarak işaretlendiğinde"), example: tk("Müşteri haber vermeden randevuya gelmedi."), icon: UserX, accent: "rose" },
  waitlist_created: { label: tk("Bekleme talebi"), when: tk("Bir müşteri bekleme listesine katıldığında"), example: tk("Dolu güne yer açılırsa haber almak isteyen müşteri."), icon: BellRing, accent: "amber" },
};

export const TRIGGER_ORDER = Object.keys(TRIGGERS) as AutomationTrigger[];

export const VARIABLES: Array<{ key: string; label: string; sample: string; waitlistOnly?: boolean; appointmentOnly?: boolean }> = [
  { key: "customerName", label: tk("Müşteri adı"), sample: "Ayşe Yılmaz" }, // i18n-ignore — örnek kişi adı
  { key: "serviceName", label: tk("Hizmet"), sample: tk("Saç kesimi") },
  { key: "staffName", label: tk("Personel"), sample: "Mehmet", appointmentOnly: true },
  { key: "date", label: tk("Tarih"), sample: tk("18 Ekim Cumartesi"), appointmentOnly: true },
  { key: "time", label: tk("Saat"), sample: "14:30", appointmentOnly: true },
  { key: "price", label: tk("Ücret"), sample: "450 ₺", appointmentOnly: true },
  { key: "preferredDate", label: tk("İstenen gün"), sample: tk("20 Ekim Pazartesi"), waitlistOnly: true },
  { key: "customerPhone", label: tk("Telefon"), sample: "0555 123 45 67" },
  { key: "businessName", label: tk("İşletme adı"), sample: tk("İşletmeniz") },
];

export function variablesFor(trigger: AutomationTrigger) {
  const waitlist = trigger === "waitlist_created";
  return VARIABLES.filter((item) => (waitlist ? !item.appointmentOnly : !item.waitlistOnly));
}

/** Panelde canlı önizleme: sunucudaki renderAutomationText ile aynı kural. */
export function previewText(template: string, businessName?: string, t: TFunction = identity) {
  const samples: Record<string, string> = Object.fromEntries(VARIABLES.map((item) => [item.key, t(item.sample)]));
  if (businessName) samples.businessName = businessName;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => samples[key] ?? "—");
}

export type Recipe = {
  id: string;
  category: "takvim" | "musteri" | "ekip";
  badge?: string;
  name: string;
  why: string;
  rule: Omit<AutomationRuleInput, "enabled">;
};

const empty = { serviceIds: [], staffIds: [], cancelledBy: "any" as const };

export const RECIPE_CATEGORIES: Array<{ id: Recipe["category"]; label: string; note: string }> = [
  { id: "takvim", label: tk("Takvim"), note: tk("Boşlukları ve değişiklikleri kaçırmayın") },
  { id: "musteri", label: tk("Müşteri deneyimi"), note: tk("Müşterinize kendiliğinden ulaşın") },
  { id: "ekip", label: tk("Ekip"), note: tk("Ekibiniz aynı anda haberdar olsun") },
];

export const RECIPES: Recipe[] = [
  {
    id: "cancel-gap", category: "takvim", badge: tk("En çok kullanılan"), name: tk("İptal alarmı"),
    why: tk("Müşteri iptal edince ekibe anında bildirim gider; boşalan saati bekleme listesiyle doldurabilirsiniz."),
    rule: { name: tk("İptal alarmı"), trigger: "appointment_cancelled", title: tk("Takvimde boşluk oluştu"), message: tk("{{customerName}} {{date}} {{time}} saatindeki {{serviceName}} randevusunu iptal etti. Bekleme listesine göz atın."), customerTitle: "", customerMessage: "", conditions: { ...empty, cancelledBy: "customer" }, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "waitlist", category: "takvim", name: tk("Bekleme listesi radarı"),
    why: tk("Dolu bir gün için bekleyen müşteriyi anında görün; yer açılınca ilk onu arayın."),
    rule: { name: tk("Bekleme listesi radarı"), trigger: "waitlist_created", title: tk("Yeni bekleme talebi"), message: tk("{{customerName}}, {{serviceName}} için {{preferredDate}} gününde yer bekliyor. Tel: {{customerPhone}}"), customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "reschedule", category: "takvim", name: tk("Saat değişikliği takibi"),
    why: tk("Randevusunu kaydıran müşterileri tek yerden izleyin, personeliniz yeni saati kaçırmasın."),
    rule: { name: tk("Saat değişikliği takibi"), trigger: "appointment_rescheduled", title: tk("Randevu saati değişti"), message: tk("{{customerName}} · {{serviceName}} randevusu {{date}} {{time}} olarak güncellendi ({{staffName}})."), customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "thanks", category: "musteri", badge: tk("Yorum getirir"), name: tk("Teşekkür ve yorum daveti"),
    why: tk("Hizmet bitince müşterinize uygulamadan teşekkür mesajı gider; memnun müşteri yorum bırakır."),
    rule: { name: tk("Teşekkür ve yorum daveti"), trigger: "appointment_completed", title: tk("Hizmet tamamlandı"), message: tk("{{customerName}} için {{serviceName}} tamamlandı. Teşekkür mesajı gönderildi."), customerTitle: tk("Bizi tercih ettiğiniz için teşekkürler"), customerMessage: tk("{{customerName}}, {{businessName}} ailesi olarak teşekkür ederiz! Deneyiminizi uygulamada değerlendirirseniz çok seviniriz."), conditions: empty, channels: { teamPush: false, customerPush: true } },
  },
  {
    id: "confirmed", category: "musteri", name: tk("Onay sonrası hoş geldin"),
    why: tk("Randevu onaylanınca müşteriye sıcak bir “sizi bekliyoruz” mesajı gider."),
    rule: { name: tk("Onay sonrası hoş geldin"), trigger: "appointment_confirmed", title: tk("Randevu onaylandı"), message: tk("{{customerName}} · {{serviceName}} · {{date}} {{time}} onaylandı."), customerTitle: tk("Sizi bekliyoruz"), customerMessage: tk("{{date}} saat {{time}} için {{serviceName}} randevunuz hazır. Görüşmek üzere!"), conditions: empty, channels: { teamPush: false, customerPush: true } },
  },
  {
    id: "no-show", category: "musteri", name: tk("Gelmeyen müşteri takibi"),
    why: tk("Haber vermeden gelmeyenleri kayda geçirin; tekrar edenleri müşteri sayfasından izleyin."),
    rule: { name: tk("Gelmeyen müşteri takibi"), trigger: "appointment_no_show", title: tk("Müşteri gelmedi"), message: tk("{{customerName}} ({{customerPhone}}) {{date}} {{time}} randevusuna gelmedi. Arayıp yeni saat önerebilirsiniz."), customerTitle: tk("Sizi özledik"), customerMessage: tk("{{customerName}}, bugünkü randevunuza gelemediniz. Size uygun yeni bir saat için uygulamadan randevu alabilirsiniz."), conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "new-booking", category: "ekip", name: tk("Yeni randevu akışı"),
    why: tk("Her yeni randevu paneldeki bildirim kutusuna düşer; isterseniz ekibin telefonuna da gider."),
    rule: { name: tk("Yeni randevu akışı"), trigger: "appointment_created", title: tk("Yeni randevu alındı"), message: tk("{{customerName}} · {{serviceName}} · {{date}} {{time}} · {{staffName}}"), customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: false, customerPush: false } },
  },
  {
    id: "done", category: "ekip", name: tk("Kasa hatırlatması"),
    why: tk("Tamamlanan işlemde ücreti ekibe hatırlatır; ödeme almayı unutmayın."),
    rule: { name: tk("Kasa hatırlatması"), trigger: "appointment_completed", title: tk("Ödemeyi almayı unutmayın"), message: tk("{{customerName}} · {{serviceName}} tamamlandı. Tutar: {{price}}"), customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
];

/**
 * Tarifi seçili dile göre kurala çevirir. Mesaj metinleri Firestore'a kaydedilip bildirim olarak gider;
 * {{değişken}} yer tutucuları çeviride aynen korunur (t() değişkensiz çağrılır, {{…}} dokunulmadan kalır).
 */
export function recipeRuleInput(recipe: Recipe, t: TFunction): AutomationRuleInput {
  const { rule } = recipe;
  const text = (value: string) => (value ? t(value) : value);
  return { ...rule, name: text(rule.name), title: text(rule.title), message: text(rule.message), customerTitle: text(rule.customerTitle), customerMessage: text(rule.customerMessage), enabled: true };
}

export function blankRule(trigger: AutomationTrigger = "appointment_created"): AutomationRuleInput {
  return { name: "", trigger, enabled: true, title: "", message: "", customerTitle: "", customerMessage: "", conditions: { ...empty }, channels: { teamPush: false, customerPush: false } };
}
