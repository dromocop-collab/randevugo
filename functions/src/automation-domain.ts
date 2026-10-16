// İşletme otomasyonları — saf yardımcılar (tetikleyici, koşul, şablon). Test: automation-domain.test.mjs
// Kurallar businesses/{id}/automationRules altında; panel (web) aynı alanları yazar.

export const AUTOMATION_TRIGGERS = [
  "appointment_created",
  "appointment_confirmed",
  "appointment_rescheduled",
  "appointment_cancelled",
  "appointment_completed",
  "appointment_no_show",
  "waitlist_created",
] as const;

export type BusinessAutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export type AutomationChannels = { panel: true; teamPush: boolean; customerPush: boolean };

export type AutomationRuleConfig = {
  trigger: BusinessAutomationTrigger;
  serviceIds: string[];
  staffIds: string[];
  cancelledBy: "any" | "customer" | "business";
  channels: AutomationChannels;
  title: string;
  message: string;
  customerTitle: string;
  customerMessage: string;
};

export function isAutomationTrigger(value: unknown): value is BusinessAutomationTrigger {
  return typeof value === "string" && (AUTOMATION_TRIGGERS as readonly string[]).includes(value);
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item)))].slice(0, 50) : [];
}

/** Firestore belgesini güvenli kural yapılandırmasına çevirir; tanınmayan tetikleyici → null. Eski kurallar (yalnız title/message) aynen çalışır. */
export function parseAutomationRule(data: Record<string, unknown> | undefined): AutomationRuleConfig | null {
  if (!data || !isAutomationTrigger(data.trigger)) return null;
  const conditions = (data.conditions ?? {}) as Record<string, unknown>;
  const channels = (data.channels ?? {}) as Record<string, unknown>;
  const cancelledBy = conditions.cancelledBy === "customer" || conditions.cancelledBy === "business" ? conditions.cancelledBy : "any";
  return {
    trigger: data.trigger,
    serviceIds: ids(conditions.serviceIds),
    staffIds: ids(conditions.staffIds),
    cancelledBy,
    // Müşteri bildirimi yalnız randevu olaylarında anlamlı (bekleme talebinde müşteri hesabı olmayabilir).
    channels: { panel: true, teamPush: channels.teamPush === true, customerPush: channels.customerPush === true && data.trigger !== "waitlist_created" },
    title: String(data.title ?? ""),
    message: String(data.message ?? ""),
    customerTitle: String(data.customerTitle ?? ""),
    customerMessage: String(data.customerMessage ?? ""),
  };
}

/** Randevu durum geçişinden tetikleyici(ler)i çıkarır. */
export function appointmentTransitionTriggers(before: { status?: unknown; startMs: number }, after: { status?: unknown; startMs: number }): BusinessAutomationTrigger[] {
  const from = String(before.status ?? "");
  const to = String(after.status ?? "");
  const out: BusinessAutomationTrigger[] = [];
  if (from !== to) {
    if (to === "cancelled") out.push("appointment_cancelled");
    else if (to === "completed") out.push("appointment_completed");
    else if (to === "no_show") out.push("appointment_no_show");
    else if (from === "pending" && to === "confirmed") out.push("appointment_confirmed");
  }
  if (before.startMs && after.startMs && before.startMs !== after.startMs && ["pending", "confirmed"].includes(to)) out.push("appointment_rescheduled");
  return out;
}

/** Kural koşulları olaya uyuyor mu? Boş liste = "hepsi". */
export function automationRuleMatches(rule: AutomationRuleConfig, trigger: BusinessAutomationTrigger, payload: Record<string, unknown>): boolean {
  if (rule.trigger !== trigger) return false;
  const serviceIds = [payload.serviceId, ...(Array.isArray(payload.serviceIds) ? payload.serviceIds : [])].filter((item): item is string => typeof item === "string");
  if (rule.serviceIds.length && !serviceIds.some((id) => rule.serviceIds.includes(id))) return false;
  if (rule.staffIds.length && !(typeof payload.staffId === "string" && rule.staffIds.includes(payload.staffId))) return false;
  if (trigger === "appointment_cancelled" && rule.cancelledBy !== "any") {
    const byCustomer = payload.cancelledBy === "customer";
    if (rule.cancelledBy === "customer" ? !byCustomer : byCustomer) return false;
  }
  return true;
}

/** {{degisken}} → değer; bilinmeyen/boş değişken "—". Satır sonları korunur, uzunluk sınırlı. */
export function renderAutomationText(template: unknown, vars: Record<string, unknown>, max = 500) {
  return String(template ?? "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
      const value = vars[key];
      const text = value === null || value === undefined ? "" : String(value).trim();
      return text || "—";
    })
    .slice(0, max);
}

/** Şablonlarda kullanılabilen değişkenler (panel ile aynı liste). */
export const AUTOMATION_VARIABLES = ["customerName", "serviceName", "staffName", "date", "time", "price", "businessName", "customerPhone", "preferredDate"] as const;

export type AutomationVariableSource = {
  customerName?: unknown;
  serviceName?: unknown;
  staffName?: unknown;
  customerPhone?: unknown;
  servicePrice?: unknown;
  preferredDate?: unknown;
  startMs?: number | null;
  businessName?: unknown;
  timeZone?: string;
};

export function automationVariables(source: AutomationVariableSource): Record<string, string> {
  const timeZone = source.timeZone || "Europe/Istanbul";
  const start = source.startMs ? new Date(source.startMs) : null;
  const date = start ? new Intl.DateTimeFormat("tr-TR", { timeZone, day: "numeric", month: "long", weekday: "long" }).format(start) : "";
  const time = start ? new Intl.DateTimeFormat("tr-TR", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(start) : "";
  const price = Number(source.servicePrice);
  const preferred = typeof source.preferredDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.preferredDate)
    ? new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", weekday: "long" }).format(new Date(`${source.preferredDate}T12:00:00Z`))
    : String(source.preferredDate ?? "");
  const text = (value: unknown, limit = 80) => String(value ?? "").trim().slice(0, limit);
  return {
    customerName: text(source.customerName) || "Müşteri",
    serviceName: text(source.serviceName) || "Hizmet",
    staffName: text(source.staffName),
    date,
    time,
    price: Number.isFinite(price) && price > 0 ? `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(price)} ₺` : "",
    businessName: text(source.businessName) || "İşletme",
    customerPhone: text(source.customerPhone, 24),
    preferredDate: preferred,
  };
}
