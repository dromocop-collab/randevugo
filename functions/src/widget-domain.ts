import { createHash, randomBytes } from "crypto";

// İşletme ana ekran widget'ı (iOS WidgetKit) — saf yardımcılar. Test: widget-domain.test.mjs
// Widget telefonda Firebase oturumu tutmaz: uygulama cihaza özel, salt okunur bir widget anahtarı alır
// (issueWidgetToken), widget bu anahtarla businessWidgetFeed'den bugünün ve yarının randevularını çeker.
// Firestore'da yalnız anahtarın SHA-256 özeti saklanır (widgetTokens/{özet}).

export const WIDGET_TOKEN_BYTES = 32;
export const WIDGET_FEED_LIMIT = 60;

export function newWidgetToken(): string {
  return randomBytes(WIDGET_TOKEN_BYTES).toString("base64url");
}

export function widgetTokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** "Bearer <anahtar>" başlığından anahtarı çıkarır; biçim geçersizse null. */
export function bearerWidgetToken(header: unknown): string | null {
  const value = typeof header === "string" ? header.trim() : "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{40,64})$/.exec(value);
  return match ? match[1]! : null;
}

/** Widget'ta gösterilen kısa müşteri adı: "Ayşe Kaya" → "Ayşe K.", tek kelime olduğu gibi. Telefon/e-posta gösterilmez. */
export function widgetCustomerName(value: unknown): string {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]!.slice(0, 18);
  if (words.length === 1) return first;
  const last = words[words.length - 1]!;
  return `${first} ${last.charAt(0).toLocaleUpperCase("tr-TR")}.`;
}

export type WidgetAppointment = {
  id: string;
  start: number;
  end: number;
  status: string;
  customer: string;
  service: string;
  staff: string;
  serviceTranslations?: Record<string, string>;
};

/** Ham randevu satırlarından widget listesini kurar: sıralı, iptal/gelmedi hariç, en fazla WIDGET_FEED_LIMIT. */
export function widgetAppointments(rows: Array<{ id: string; data: Record<string, unknown> }>): WidgetAppointment[] {
  const out: WidgetAppointment[] = [];
  for (const { id, data } of rows) {
    const status = String(data.status ?? "pending");
    if (status === "cancelled" || status === "no_show") continue;
    const start = millis(data.startAt);
    const end = millis(data.endAt) ?? (start !== null ? start + 30 * 60_000 : null);
    if (start === null || end === null) continue;
    const translations = data.serviceNameTranslations && typeof data.serviceNameTranslations === "object"
      ? Object.fromEntries(Object.entries(data.serviceNameTranslations as Record<string, unknown>)
        .filter(([key, value]) => /^[a-z]{2}$/.test(key) && typeof value === "string" && value.trim())
        .map(([key, value]) => [key, String(value).slice(0, 80)]))
      : {};
    out.push({
      id,
      start,
      end,
      status,
      customer: widgetCustomerName(data.customerName),
      service: String(data.serviceName ?? "").slice(0, 80),
      staff: String(data.staffName ?? "").slice(0, 40),
      ...(Object.keys(translations).length ? { serviceTranslations: translations } : {}),
    });
  }
  return out.sort((a, b) => a.start - b.start).slice(0, WIDGET_FEED_LIMIT);
}

/** Bugünün özeti (işletme saat dilimindeki gün aralığına göre). */
export function widgetTodaySummary(items: WidgetAppointment[], dayStart: number, dayEnd: number, now: number) {
  const today = items.filter((item) => item.start >= dayStart && item.start < dayEnd);
  return {
    total: today.length,
    pending: today.filter((item) => item.status === "pending").length,
    completed: today.filter((item) => item.status === "completed").length,
    remaining: today.filter((item) => item.end > now && item.status !== "completed").length,
  };
}

function millis(value: unknown): number | null {
  if (value && typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}
