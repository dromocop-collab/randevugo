// Süper admin › canlı ziyaretçiler: saf hesaplar (kartlar, özet şeridi, platform özeti). Test: live-visitors-logic.test.mjs

export type LiveTrailItem = { t: "page"; p: string; pt: string; at: number } | { t: "action"; a: string; at: number };

export type LiveVisitorLike = {
  lastSeenAt: number; sessionStartAt: number | null; lastPageType: string; lastAction: string | null; lastActionAt: number | null;
  sourceKind: string; device: string; trail: LiveTrailItem[];
};

export const LIVE_WINDOW_MS = 5 * 60_000;
/** Görünür sekme dakikada bir sinyal gönderir; 80 sn içinde haber gelen "aktif". */
export const LIVE_ACTIVE_MS = 80_000;

/** Adımın ait olduğu sayfa türü (kayıt adımı kayıt sayfasında, kurulum adımı kurulum ekranında olur). */
export function actionPageType(action: string): string | null {
  if (action.startsWith("booking:")) return "booking";
  if (action.startsWith("onboarding:")) return "business_onboarding";
  if (action === "signup:verified") return "business_panel";
  if (action.startsWith("signup:")) return "business_signup";
  return null;
}

/**
 * Eski kayıtlarda adım, sayfa görüntülemesinden önce yazılabiliyordu ("Kategori seçiyor → İşletme kaydı").
 * Adımın hemen ardından aynı sayfanın görüntülemesi (10 sn içinde) geliyorsa ikisi yer değiştirir.
 */
export function orderTrail(trail: readonly LiveTrailItem[]): LiveTrailItem[] {
  const items = [...trail];
  for (let index = 0; index < items.length - 1; index++) {
    const current = items[index]!;
    const next = items[index + 1]!;
    if (current.t === "action" && next.t === "page" && next.at - current.at <= 10_000 && actionPageType(current.a) === next.pt) {
      items[index] = next;
      items[index + 1] = current;
      index++;
    }
  }
  return items;
}

/**
 * Ziyaretçinin şu anki adımı: izin son öğesi bir adımsa o. Sayfa değiştiyse (ör. kayıttan ana sayfaya döndüyse)
 * eski adım artık gösterilmez. İz yoksa (eski kayıt) sayfa türü eşleşiyorsa son adım kullanılır.
 */
export function currentAction(visitor: LiveVisitorLike): string | null {
  const trail = orderTrail(visitor.trail);
  const last = trail[trail.length - 1];
  if (last) return last.t === "action" ? last.a : null;
  if (!visitor.lastAction || !visitor.lastActionAt || visitor.lastActionAt < (visitor.sessionStartAt ?? 0)) return null;
  return actionPageType(visitor.lastAction) === visitor.lastPageType ? visitor.lastAction : null;
}

/** Kayıt yolculuğu (kayıt formu + kurulum) sırası: kartta "adım x / y" ilerlemesi için. */
export const SIGNUP_JOURNEY = [
  "signup:0", "signup:1", "signup:2", "signup:3", "signup:account", "onboarding:1", "onboarding:2", "onboarding:3",
] as const;

/** Bu oturumda kayıt yolculuğunda gelinen en ileri adım (0'dan başlar) ya da null. */
export function signupProgress(trail: readonly LiveTrailItem[]): { index: number; total: number; action: string } | null {
  let best = -1;
  for (const item of trail) {
    if (item.t !== "action") continue;
    // onboarding:0 kurulum ekranının açılışıdır; hesap açıldı ile aynı aşama sayılır.
    const key = item.a === "onboarding:0" ? "signup:account" : item.a;
    best = Math.max(best, SIGNUP_JOURNEY.indexOf(key as (typeof SIGNUP_JOURNEY)[number]));
  }
  return best < 0 ? null : { index: best, total: SIGNUP_JOURNEY.length, action: SIGNUP_JOURNEY[best]! };
}

export type LiveSummary = {
  total: number; active: number; idle: number; ads: number; mobile: number;
  /** Şu an işletme kaydı formunda ya da kurulumda. */
  signingUp: number;
  /** Şu an bir işletmenin randevu ekranında. */
  booking: number;
  /** Bu oturumda hesap açan / randevu alan (hedefe ulaşan). */
  goals: number;
};

const GOAL_ACTIONS = new Set(["signup:account", "signup:verified", "booking:success"]);
const SIGNUP_TYPES = new Set(["business_signup", "business_onboarding"]);

export function visibleVisitors<T extends LiveVisitorLike>(rows: readonly T[], now: number): T[] {
  return rows.filter((row) => now - row.lastSeenAt < LIVE_WINDOW_MS);
}

export function summarizeLive(rows: readonly LiveVisitorLike[], now: number): LiveSummary {
  const visible = visibleVisitors(rows, now);
  const active = visible.filter((row) => now - row.lastSeenAt < LIVE_ACTIVE_MS).length;
  return {
    total: visible.length,
    active,
    idle: visible.length - active,
    ads: visible.filter((row) => row.sourceKind === "ads").length,
    mobile: visible.filter((row) => row.device === "mobile").length,
    signingUp: visible.filter((row) => SIGNUP_TYPES.has(row.lastPageType)).length,
    booking: visible.filter((row) => row.lastPageType === "booking").length,
    goals: visible.filter((row) => row.trail.some((item) => item.t === "action" && GOAL_ACTIONS.has(item.a))).length,
  };
}

export type LiveFilter = "all" | "signup" | "booking" | "ads" | "active";

export function matchesFilter(row: LiveVisitorLike, filter: LiveFilter, now: number): boolean {
  if (filter === "signup") return SIGNUP_TYPES.has(row.lastPageType);
  if (filter === "booking") return row.lastPageType === "booking";
  if (filter === "ads") return row.sourceKind === "ads";
  if (filter === "active") return now - row.lastSeenAt < LIVE_ACTIVE_MS;
  return true;
}

/** Sıra: önce aktif olanlar, sonra hedefe yakın olanlar (kayıt/randevu), sonra en son hareket. */
export function sortLive<T extends LiveVisitorLike>(rows: readonly T[], now: number): T[] {
  const score = (row: T) => (now - row.lastSeenAt < LIVE_ACTIVE_MS ? 2 : 0) + (SIGNUP_TYPES.has(row.lastPageType) || row.lastPageType === "booking" ? 1 : 0);
  return [...rows].sort((a, b) => score(b) - score(a) || b.lastSeenAt - a.lastSeenAt);
}
