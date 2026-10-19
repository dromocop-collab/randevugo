import { BellRing, CalendarCheck2, CalendarClock, Check, CircleCheckBig, UserX, XCircle, type LucideIcon } from "lucide-react";
import type { AutomationRuleInput, AutomationTrigger } from "@/features/automations/automation-repository";

export type Accent = "ocean" | "rose" | "amber" | "violet" | "mint";

export const TRIGGERS: Record<AutomationTrigger, { label: string; when: string; example: string; icon: LucideIcon; accent: Accent }> = {
  appointment_created: { label: "Yeni randevu", when: "Yeni bir randevu alındığında", example: "Müşteri online randevu aldı ya da siz panelden eklediniz.", icon: CalendarCheck2, accent: "ocean" },
  appointment_confirmed: { label: "Randevu onaylandı", when: "Bekleyen bir randevu onaylandığında", example: "Onay bekleyen randevuyu “Onayla” ile kabul ettiniz.", icon: CircleCheckBig, accent: "mint" },
  appointment_rescheduled: { label: "Saat değişti", when: "Randevunun tarihi veya saati değiştiğinde", example: "Müşteri randevusunu başka bir saate aldı.", icon: CalendarClock, accent: "amber" },
  appointment_cancelled: { label: "Randevu iptali", when: "Bir randevu iptal edildiğinde", example: "Müşteri gelemeyeceğini bildirip iptal etti.", icon: XCircle, accent: "rose" },
  appointment_completed: { label: "İşlem tamamlandı", when: "Randevu “Tamamlandı” olarak işaretlendiğinde", example: "Hizmet bitti, randevuyu tamamladınız.", icon: Check, accent: "violet" },
  appointment_no_show: { label: "Gelmedi", when: "Randevu “Gelmedi” olarak işaretlendiğinde", example: "Müşteri haber vermeden randevuya gelmedi.", icon: UserX, accent: "rose" },
  waitlist_created: { label: "Bekleme talebi", when: "Bir müşteri bekleme listesine katıldığında", example: "Dolu güne yer açılırsa haber almak isteyen müşteri.", icon: BellRing, accent: "amber" },
};

export const TRIGGER_ORDER = Object.keys(TRIGGERS) as AutomationTrigger[];

export const VARIABLES: Array<{ key: string; label: string; sample: string; waitlistOnly?: boolean; appointmentOnly?: boolean }> = [
  { key: "customerName", label: "Müşteri adı", sample: "Ayşe Yılmaz" },
  { key: "serviceName", label: "Hizmet", sample: "Saç kesimi" },
  { key: "staffName", label: "Personel", sample: "Mehmet", appointmentOnly: true },
  { key: "date", label: "Tarih", sample: "18 Ekim Cumartesi", appointmentOnly: true },
  { key: "time", label: "Saat", sample: "14:30", appointmentOnly: true },
  { key: "price", label: "Ücret", sample: "450 ₺", appointmentOnly: true },
  { key: "preferredDate", label: "İstenen gün", sample: "20 Ekim Pazartesi", waitlistOnly: true },
  { key: "customerPhone", label: "Telefon", sample: "0555 123 45 67" },
  { key: "businessName", label: "İşletme adı", sample: "İşletmeniz" },
];

export function variablesFor(trigger: AutomationTrigger) {
  const waitlist = trigger === "waitlist_created";
  return VARIABLES.filter((item) => (waitlist ? !item.appointmentOnly : !item.waitlistOnly));
}

/** Panelde canlı önizleme: sunucudaki renderAutomationText ile aynı kural. */
export function previewText(template: string, businessName?: string) {
  const samples: Record<string, string> = Object.fromEntries(VARIABLES.map((item) => [item.key, item.sample]));
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
  { id: "takvim", label: "Takvim", note: "Boşlukları ve değişiklikleri kaçırmayın" },
  { id: "musteri", label: "Müşteri deneyimi", note: "Müşterinize kendiliğinden ulaşın" },
  { id: "ekip", label: "Ekip", note: "Ekibiniz aynı anda haberdar olsun" },
];

export const RECIPES: Recipe[] = [
  {
    id: "cancel-gap", category: "takvim", badge: "En çok kullanılan", name: "İptal alarmı",
    why: "Müşteri iptal edince ekibe anında bildirim gider; boşalan saati bekleme listesiyle doldurabilirsiniz.",
    rule: { name: "İptal alarmı", trigger: "appointment_cancelled", title: "Takvimde boşluk oluştu", message: "{{customerName}} {{date}} {{time}} saatindeki {{serviceName}} randevusunu iptal etti. Bekleme listesine göz atın.", customerTitle: "", customerMessage: "", conditions: { ...empty, cancelledBy: "customer" }, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "waitlist", category: "takvim", name: "Bekleme listesi radarı",
    why: "Dolu bir gün için bekleyen müşteriyi anında görün; yer açılınca ilk onu arayın.",
    rule: { name: "Bekleme listesi radarı", trigger: "waitlist_created", title: "Yeni bekleme talebi", message: "{{customerName}}, {{serviceName}} için {{preferredDate}} gününde yer bekliyor. Tel: {{customerPhone}}", customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "reschedule", category: "takvim", name: "Saat değişikliği takibi",
    why: "Randevusunu kaydıran müşterileri tek yerden izleyin, personeliniz yeni saati kaçırmasın.",
    rule: { name: "Saat değişikliği takibi", trigger: "appointment_rescheduled", title: "Randevu saati değişti", message: "{{customerName}} · {{serviceName}} randevusu {{date}} {{time}} olarak güncellendi ({{staffName}}).", customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "thanks", category: "musteri", badge: "Yorum getirir", name: "Teşekkür ve yorum daveti",
    why: "Hizmet bitince müşterinize uygulamadan teşekkür mesajı gider; memnun müşteri yorum bırakır.",
    rule: { name: "Teşekkür ve yorum daveti", trigger: "appointment_completed", title: "Hizmet tamamlandı", message: "{{customerName}} için {{serviceName}} tamamlandı. Teşekkür mesajı gönderildi.", customerTitle: "Bizi tercih ettiğiniz için teşekkürler", customerMessage: "{{customerName}}, {{businessName}} ailesi olarak teşekkür ederiz! Deneyiminizi uygulamada değerlendirirseniz çok seviniriz.", conditions: empty, channels: { teamPush: false, customerPush: true } },
  },
  {
    id: "confirmed", category: "musteri", name: "Onay sonrası hoş geldin",
    why: "Randevu onaylanınca müşteriye sıcak bir “sizi bekliyoruz” mesajı gider.",
    rule: { name: "Onay sonrası hoş geldin", trigger: "appointment_confirmed", title: "Randevu onaylandı", message: "{{customerName}} · {{serviceName}} · {{date}} {{time}} onaylandı.", customerTitle: "Sizi bekliyoruz", customerMessage: "{{date}} saat {{time}} için {{serviceName}} randevunuz hazır. Görüşmek üzere!", conditions: empty, channels: { teamPush: false, customerPush: true } },
  },
  {
    id: "no-show", category: "musteri", name: "Gelmeyen müşteri takibi",
    why: "Haber vermeden gelmeyenleri kayda geçirin; tekrar edenleri müşteri sayfasından izleyin.",
    rule: { name: "Gelmeyen müşteri takibi", trigger: "appointment_no_show", title: "Müşteri gelmedi", message: "{{customerName}} ({{customerPhone}}) {{date}} {{time}} randevusuna gelmedi. Arayıp yeni saat önerebilirsiniz.", customerTitle: "Sizi özledik", customerMessage: "{{customerName}}, bugünkü randevunuza gelemediniz. Size uygun yeni bir saat için uygulamadan randevu alabilirsiniz.", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
  {
    id: "new-booking", category: "ekip", name: "Yeni randevu akışı",
    why: "Her yeni randevu paneldeki bildirim kutusuna düşer; isterseniz ekibin telefonuna da gider.",
    rule: { name: "Yeni randevu akışı", trigger: "appointment_created", title: "Yeni randevu alındı", message: "{{customerName}} · {{serviceName}} · {{date}} {{time}} · {{staffName}}", customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: false, customerPush: false } },
  },
  {
    id: "done", category: "ekip", name: "Kasa hatırlatması",
    why: "Tamamlanan işlemde ücreti ekibe hatırlatır; ödeme almayı unutmayın.",
    rule: { name: "Kasa hatırlatması", trigger: "appointment_completed", title: "Ödemeyi almayı unutmayın", message: "{{customerName}} · {{serviceName}} tamamlandı. Tutar: {{price}}", customerTitle: "", customerMessage: "", conditions: empty, channels: { teamPush: true, customerPush: false } },
  },
];

export function blankRule(trigger: AutomationTrigger = "appointment_created"): AutomationRuleInput {
  return { name: "", trigger, enabled: true, title: "", message: "", customerTitle: "", customerMessage: "", conditions: { ...empty }, channels: { teamPush: false, customerPush: false } };
}
