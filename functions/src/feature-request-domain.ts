// İstek & öneri panosu — saf yardımcılar. Test: feature-request-domain.test.mjs
// İşletme sahipleri, çalışanlar ve müşteriler fikir / istek gönderir; ekip durumunu günceller, herkes oy verir.
// Herkese açık belge featureRequests/{id} (kişisel bilgi yok); iletişim bilgisi featureRequestContacts/{id} (yalnız yönetici).
// Web tarafındaki aynı listeler: web/features/feature-requests/feature-request-domain.ts

export const FEATURE_REQUEST_KINDS = ["feature", "improvement", "bug", "other"] as const;
export type FeatureRequestKind = typeof FEATURE_REQUEST_KINDS[number];

export const FEATURE_REQUEST_STATUSES = ["new", "reviewing", "planned", "in_progress", "done", "declined"] as const;
export type FeatureRequestStatus = typeof FEATURE_REQUEST_STATUSES[number];

export type FeatureRequestAudience = "business" | "customer" | "guest";

export type FeatureRequestInput = {
  title: string; details: string; kind: FeatureRequestKind;
  name: string; contact: string; businessId: string | null; page: string;
};

/** Kullanıcıya bildirim giden durum adları (push metni). */
export const STATUS_PUSH_LABEL: Record<FeatureRequestStatus, string> = {
  new: "Alındı", reviewing: "İnceleniyor", planned: "Planlandı", in_progress: "Yapılıyor", done: "Yayında 🎉", declined: "Şimdilik değil",
};

const clean = (value: unknown, max: number) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim()
  .slice(0, max);

const letters = (value: string) => (value.match(/\p{L}/gu) ?? []).length;

/** Geçersizse hata metni döner (kullanıcıya gösterilir); geçerliyse temizlenmiş istek. Gizli alan (website) doluysa bot sayılır. */
export function parseFeatureRequest(raw: unknown): { ok: true; value: FeatureRequestInput } | { ok: false; error: string } {
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  if (typeof data.website === "string" && data.website.trim()) return { ok: false, error: "Form doğrulanamadı." };
  const title = clean(data.title, 120).replace(/\s+/g, " ");
  if (letters(title) < 5) return { ok: false, error: "Başlık en az 5 harf olmalı." };
  const details = clean(data.details, 2000);
  const kind = (FEATURE_REQUEST_KINDS as readonly string[]).includes(String(data.kind)) ? data.kind as FeatureRequestKind : "feature";
  const name = clean(data.name, 60).replace(/\s+/g, " ");
  const contact = clean(data.contact, 120).replace(/\s+/g, " ");
  const businessId = typeof data.businessId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(data.businessId) ? data.businessId : null;
  const page = /^\/[\w\-/.?=&%]{0,160}$/.test(String(data.page ?? "")) ? String(data.page) : "";
  return { ok: true, value: { title, details, kind, name, contact, businessId, page } };
}

/** Panoda görünen yazar etiketi: "Ayşe Y." gibi; ad yoksa kitleye göre genel ad. Soyadın yalnız baş harfi. */
export function authorLabel(name: string, audience: FeatureRequestAudience): string {
  const parts = clean(name, 60).split(/\s+/).filter((part) => letters(part) > 0);
  if (parts.length) {
    const first = parts[0].slice(0, 20);
    const initial = parts.length > 1 ? ` ${parts[parts.length - 1].charAt(0).toLocaleUpperCase("tr-TR")}.` : "";
    return `${first.charAt(0).toLocaleUpperCase("tr-TR")}${first.slice(1)}${initial}`;
  }
  return audience === "business" ? "Bir işletme" : audience === "customer" ? "Bir müşteri" : "Bir ziyaretçi";
}

export function isFeatureRequestStatus(value: unknown): value is FeatureRequestStatus {
  return (FEATURE_REQUEST_STATUSES as readonly string[]).includes(String(value));
}

/** Oy listesinde id'yi açar/kapatır; liste en fazla `max` öğe (en eski düşer). */
export function toggleVote(ids: unknown, requestId: string, max = 500): { ids: string[]; voted: boolean } {
  const list = Array.isArray(ids) ? ids.filter((item): item is string => typeof item === "string") : [];
  if (list.includes(requestId)) return { ids: list.filter((item) => item !== requestId), voted: false };
  return { ids: [...list, requestId].slice(-max), voted: true };
}

/** Yazara bildirim gerekir mi: durum değişti (yeni → başka) ya da ekip yanıtı değişti. */
export function authorUpdateNotice(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): { title: string; body: string } | null {
  if (!before || !after) return null;
  const title = clean(after.title, 80);
  const statusChanged = before.status !== after.status && isFeatureRequestStatus(after.status) && after.status !== "new";
  const reply = clean((after.adminReply as { text?: unknown } | undefined)?.text, 160);
  const replyChanged = reply && reply !== clean((before.adminReply as { text?: unknown } | undefined)?.text, 160);
  if (statusChanged) {
    const label = STATUS_PUSH_LABEL[after.status as FeatureRequestStatus];
    return { title: `İsteğin: ${label}`, body: reply && replyChanged ? `“${title}” · ${reply}` : `“${title}” isteğinin durumu güncellendi.` };
  }
  if (replyChanged) return { title: "İsteğine ekipten yanıt var", body: `“${title}” · ${reply}` };
  return null;
}
