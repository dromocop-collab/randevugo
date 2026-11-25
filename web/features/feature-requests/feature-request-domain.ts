// İstek & öneri panosu — saf mantık (test: feature-request-domain.test.mjs).
// Sunucu kuralları functions/src/feature-request-domain.ts ile aynı tutulmalı (türler, durumlar, başlık sınırı).
import { tk } from "../../i18n/config.ts";

export const KINDS = ["feature", "improvement", "bug", "other"] as const;
export type FeatureKind = typeof KINDS[number];
export const STATUSES = ["new", "reviewing", "planned", "in_progress", "done", "declined"] as const;
export type FeatureStatus = typeof STATUSES[number];
export type FeatureAudience = "business" | "customer" | "guest";

export const TITLE_MAX = 120;
export const DETAILS_MAX = 2000;

export const KIND_META: Record<FeatureKind, { label: string; hint: string; emoji: string }> = {
  feature: { label: tk("Yeni özellik"), hint: tk("Olmayan bir şey olsun istiyorum"), emoji: "💡" },
  improvement: { label: tk("İyileştirme"), hint: tk("Var olan bir şey daha iyi olsun"), emoji: "🛠️" },
  bug: { label: tk("Hata bildir"), hint: tk("Bir şey beklediğim gibi çalışmıyor"), emoji: "🐞" },
  other: { label: tk("Diğer"), hint: tk("Teşekkür, fikir, aklına gelen her şey"), emoji: "💬" },
};

export const STATUS_META: Record<FeatureStatus, { label: string; tone: "neutral" | "blue" | "violet" | "amber" | "green" | "red"; hint: string }> = {
  new: { label: tk("Alındı"), tone: "neutral", hint: tk("Ekibimiz okuyacak") },
  reviewing: { label: tk("İnceleniyor"), tone: "blue", hint: tk("Değerlendiriyoruz") },
  planned: { label: tk("Planlandı"), tone: "violet", hint: tk("Yol haritasında") },
  in_progress: { label: tk("Yapılıyor"), tone: "amber", hint: tk("Şu an üzerinde çalışıyoruz") },
  done: { label: tk("Yayında"), tone: "green", hint: tk("Kullanıma açıldı") },
  declined: { label: tk("Şimdilik değil"), tone: "red", hint: tk("Şu an planlarımızda yok") },
};

/** Yol haritası sütunları (sırayla). */
export const ROADMAP: FeatureStatus[] = ["planned", "in_progress", "done"];

export type FeatureRequest = {
  id: string; title: string; details: string; kind: FeatureKind; audience: FeatureAudience; authorLabel: string; authorUid: string | null;
  businessCategory: string | null; status: FeatureStatus; public: boolean; votes: number;
  adminReply: { text: string; at: number | null } | null; adminNote?: string;
  createdAt: number | null; updatedAt: number | null; statusChangedAt: number | null;
};

const millis = (value: unknown): number | null => {
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: unknown }).toMillis === "function") return (value as { toMillis: () => number }).toMillis();
  return typeof value === "number" ? value : null;
};

/** Firestore belgesini güvenli tipe çevirir (eksik alanlar varsayılanla). */
export function toFeatureRequest(id: string, data: Record<string, unknown>): FeatureRequest {
  const reply = data.adminReply as { text?: unknown; at?: unknown } | null | undefined;
  const replyText = typeof reply?.text === "string" ? reply.text.trim() : "";
  return {
    id,
    title: String(data.title ?? ""),
    details: String(data.details ?? ""),
    kind: (KINDS as readonly string[]).includes(String(data.kind)) ? data.kind as FeatureKind : "feature",
    audience: data.audience === "business" || data.audience === "customer" ? data.audience : "guest",
    authorLabel: String(data.authorLabel ?? ""),
    authorUid: typeof data.authorUid === "string" ? data.authorUid : null,
    businessCategory: typeof data.businessCategory === "string" ? data.businessCategory : null,
    status: (STATUSES as readonly string[]).includes(String(data.status)) ? data.status as FeatureStatus : "new",
    public: data.public === true,
    votes: Math.max(0, Number(data.votes ?? 0) || 0),
    adminReply: replyText ? { text: replyText, at: millis(reply?.at) } : null,
    adminNote: typeof data.adminNote === "string" ? data.adminNote : undefined,
    createdAt: millis(data.createdAt), updatedAt: millis(data.updatedAt), statusChangedAt: millis(data.statusChangedAt),
  };
}

export function fold(value: string): string {
  return String(value ?? "").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// Benzerlikte sayılmayan sık kelimeler.
const STOP = new Set(["ve", "ile", "bir", "bu", "da", "de", "icin", "olsun", "olabilir", "mi", "mu", "ben", "biz", "cok", "daha", "gibi", "the", "a", "to", "and", "for", "keske", "lutfen", "istiyorum", "eklensin", "ekleyin", "olmasi"]);
const tokens = (value: string) => fold(value).split(" ").filter((word) => word.length >= 3 && !STOP.has(word));

/** Türkçe ekler için kaba kök eşleşmesi: ortak ön ek en az min(5, kısa kelime) harf (3 harfliler tam eşleşir). */
function sameRoot(a: string, b: string): boolean {
  const need = Math.min(5, a.length, b.length);
  if (need < 4) return a === b;
  return a.slice(0, need) === b.slice(0, need);
}

/**
 * Yazılan başlığa benzeyen istekler (aynı isteği tekrar göndermek yerine oy verilsin diye).
 * Ölçüt: ortak kelime kökü sayısı; en az 1 ortak kök ve yazılanın en az %40'ı.
 */
export function similarRequests(list: FeatureRequest[], text: string, limit = 3): FeatureRequest[] {
  const query = [...new Set(tokens(text))];
  if (!query.length) return [];
  return list
    .map((item) => {
      const own = tokens(`${item.title} ${item.details.slice(0, 200)}`);
      const shared = query.filter((word) => own.some((other) => sameRoot(word, other))).length;
      return { item, shared, ratio: shared / query.length };
    })
    .filter((row) => row.shared >= 1 && row.ratio >= 0.4)
    .sort((a, b) => b.shared - a.shared || b.ratio - a.ratio || b.item.votes - a.item.votes)
    .slice(0, limit)
    .map((row) => row.item);
}

export type SortMode = "trending" | "top" | "new";

/** Trend: oylar zamana göre söner (yarı ömür ~3 hafta) — yeni ve çok oylananlar üstte. */
export function trendScore(item: FeatureRequest, nowMs: number): number {
  const ageDays = Math.max(0, (nowMs - (item.createdAt ?? nowMs)) / 86_400_000);
  return (item.votes + 1) / Math.pow(1 + ageDays / 21, 1.2);
}

export function sortRequests(list: FeatureRequest[], mode: SortMode, nowMs: number): FeatureRequest[] {
  const copy = [...list];
  if (mode === "new") return copy.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  if (mode === "top") return copy.sort((a, b) => b.votes - a.votes || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return copy.sort((a, b) => trendScore(b, nowMs) - trendScore(a, nowMs) || b.votes - a.votes);
}

/** Metin araması (başlık + ayrıntı), Türkçe harf duyarsız. */
export function searchRequests(list: FeatureRequest[], query: string): FeatureRequest[] {
  const needle = fold(query);
  if (!needle) return list;
  return list.filter((item) => fold(`${item.title} ${item.details} ${item.adminReply?.text ?? ""}`).includes(needle));
}
