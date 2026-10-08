/**
 * platformPlans belgeleri için saf (Firebase'siz) yardımcılar.
 * Web süper admin, iOS süper admin ve eski kayıtlar farklı alan adları yazmış olabilir
 * (label/name, monthlyPrice/price, isActive/active/status …); okuma tarafı hepsini tek
 * PlatformPlan biçimine çevirir. Sunucu (fiyat sayfaları) ve istemci (panel) aynı kuralı kullanır.
 */
import { ALL_SUBSCRIPTION_ENTITLEMENTS, type SubscriptionEntitlement } from "../../constants/subscription-entitlements.ts";
import { PLAN_FEATURE_LIST, PLAN_FEATURES, PLAN_LABEL, PLAN_PRICE } from "../../constants/plans.ts";

export interface PlatformPlan {
  id: string;
  label: string;
  yearlyPrice: number;
  monthlyPrice: number;
  currency: string;
  trialDays: number;
  maxStores: number;
  maxStaff: number;
  /** Satışa ve atamaya açık mı (süper admin "Satışta" anahtarı). */
  isActive: boolean;
  isRecommended: boolean;
  /** Küçük olan önce gösterilir; tanımsızsa fiyata göre sıralanır. */
  sortOrder: number | null;
  description: string;
  features: string[];
  entitlements: SubscriptionEntitlement[];
  /** true: Firestore'da yok, constants/plans'tan türetilen yerleşik varsayılan paket. */
  isFallback?: boolean;
}

export const DEFAULT_PLATFORM_PLAN_ID = "RANDEVUGO";
export const PLATFORM_PLANS_CACHE_TAG = "platform-plans";

/** platformPlans boşken kullanılan yerleşik paket (functions ensureDefaultPlatformPlans ile aynı değerler). */
export function defaultPlatformPlan(): PlatformPlan {
  return {
    id: DEFAULT_PLATFORM_PLAN_ID,
    label: PLAN_LABEL,
    monthlyPrice: PLAN_PRICE.monthly,
    yearlyPrice: PLAN_PRICE.yearly,
    currency: PLAN_PRICE.currency,
    trialDays: PLAN_PRICE.trialDays,
    // Paket belgesi yokken backend 10 şubeye izin verir; varsayılan paket bunu korur.
    maxStores: PLAN_FEATURES.maxBranches,
    maxStaff: PLAN_FEATURES.maxStaff,
    isActive: true,
    isRecommended: true,
    sortOrder: null,
    description: "Tüm randevu operasyonunu tek merkezden yönetin.",
    features: [...PLAN_FEATURE_LIST],
    entitlements: [...ALL_SUBSCRIPTION_ENTITLEMENTS],
    isFallback: true,
  };
}

type RawPlan = Record<string, unknown>;

function firstDefined(data: RawPlan, keys: string[]): unknown {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "1", "active", "aktif", "published", "yayında", "satışta", "visible", "public"].includes(text)) return true;
    if (["false", "0", "inactive", "pasif", "draft", "taslak", "archived", "hidden", "private", "kapalı"].includes(text)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return null;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return [];
}

/**
 * Ham Firestore verisini PlatformPlan'a çevirir. Bilinen eş anlamlı alanlar:
 * label|name|title, monthlyPrice|price, yearlyPrice|annualPrice, isActive|active|status,
 * isPublic|visible|isVisible (false ise satıştan bağımsız olarak gizli), isRecommended|highlighted|featured|recommended,
 * sortOrder|order|position.
 */
export function normalizePlatformPlan(id: string, data: RawPlan): PlatformPlan {
  const label = String(firstDefined(data, ["label", "name", "title"]) ?? id).trim() || id;
  const monthlyRaw = toNumber(firstDefined(data, ["monthlyPrice", "price", "priceMonthly"]));
  const yearlyRaw = toNumber(firstDefined(data, ["yearlyPrice", "annualPrice", "priceYearly"]));
  const monthlyPrice = Math.max(0, monthlyRaw ?? (yearlyRaw !== null ? Math.round(yearlyRaw / 12) : 0));
  const yearlyPrice = Math.max(0, yearlyRaw ?? monthlyPrice * 12);

  // Açıkça kapatılmadıkça satışta sayılır (eski belgelerde alan hiç yok).
  const activeFlags = [toFlag(data.isActive), toFlag(data.active), toFlag(data.status)];
  const visibleFlags = [toFlag(data.isPublic), toFlag(data.visible), toFlag(data.isVisible)];
  const isActive = !activeFlags.includes(false) && !visibleFlags.includes(false);

  const recommendedFlags = [data.isRecommended, data.highlighted, data.isHighlighted, data.featured, data.recommended].map(toFlag);
  const sortOrder = toNumber(firstDefined(data, ["sortOrder", "order", "position"]));
  const entitlements = toStringList(data.entitlements)
    .filter((key): key is SubscriptionEntitlement => (ALL_SUBSCRIPTION_ENTITLEMENTS as string[]).includes(key));

  return {
    id,
    label,
    monthlyPrice,
    yearlyPrice,
    currency: String(data.currency ?? "TRY").toUpperCase() || "TRY",
    trialDays: Math.max(0, Math.round(toNumber(data.trialDays) ?? 0)),
    maxStores: Math.max(1, Math.round(toNumber(data.maxStores) ?? 3)),
    maxStaff: Math.max(1, Math.round(toNumber(data.maxStaff) ?? 250)),
    isActive,
    isRecommended: recommendedFlags.includes(true),
    sortOrder,
    description: String(data.description ?? "").trim(),
    features: toStringList(data.features),
    entitlements: [...new Set(entitlements)],
  };
}

/** Görüntüleme sırası: sortOrder (tanımlılar önce) → aylık fiyat → ad. */
export function sortPlatformPlans<T extends PlatformPlan>(plans: readonly T[]): T[] {
  return [...plans].sort((a, b) => {
    const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    if (a.monthlyPrice !== b.monthlyPrice) return a.monthlyPrice - b.monthlyPrice;
    return a.label.localeCompare(b.label, "tr");
  });
}

/** Satıştaki paketler, görüntüleme sırasında. Hiç yoksa boş dizi. */
export function activePlatformPlans<T extends PlatformPlan>(plans: readonly T[]): T[] {
  return sortPlatformPlans(plans.filter((plan) => plan.isActive));
}

/**
 * Vurgulanacak tek paket: işaretli olanlardan sırada ilki; hiçbiri işaretli değilse
 * birden çok paket varken ortadaki (3'lü düzende klasik "orta" kart), tek paket varsa o.
 */
export function featuredPlanId(plans: readonly PlatformPlan[]): string | null {
  if (!plans.length) return null;
  const marked = plans.find((plan) => plan.isRecommended);
  if (marked) return marked.id;
  return plans.length === 1 ? plans[0].id : plans[Math.floor((plans.length - 1) / 2)].id;
}

/** Herkese açık sayfalar için: satıştakiler (yoksa varsayılan), tek vurgulu paketle. */
export function publicPlatformPlans(plans: readonly PlatformPlan[]): PlatformPlan[] {
  const active = activePlatformPlans(plans);
  const list = active.length ? active : [defaultPlatformPlan()];
  const featured = featuredPlanId(list);
  return list.map((plan) => ({ ...plan, isRecommended: plan.id === featured }));
}

/* ─── Firestore REST (sunucu) değer çözücü ─── */

type RestValue = {
  nullValue?: null; booleanValue?: boolean; integerValue?: string; doubleValue?: number; stringValue?: string;
  timestampValue?: string; arrayValue?: { values?: RestValue[] }; mapValue?: { fields?: Record<string, RestValue> };
  referenceValue?: string; geoPointValue?: unknown; bytesValue?: string;
};

export function decodeRestValue(value: RestValue | undefined): unknown {
  if (!value) return undefined;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue?.values ?? []).map(decodeRestValue);
  if ("mapValue" in value) return decodeRestFields(value.mapValue?.fields);
  if ("referenceValue" in value) return value.referenceValue;
  return null;
}

export function decodeRestFields(fields: Record<string, RestValue> | undefined): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([key, value]) => [key, decodeRestValue(value)]));
}

/** `GET …/documents/platformPlans` yanıtını normalize edilmiş paketlere çevirir. */
export function plansFromRestList(body: { documents?: Array<{ name?: string; fields?: Record<string, RestValue> }> }): PlatformPlan[] {
  return (body.documents ?? []).map((document) => {
    const id = String(document.name ?? "").split("/").pop() ?? "";
    return normalizePlatformPlan(id, decodeRestFields(document.fields));
  }).filter((plan) => plan.id);
}
