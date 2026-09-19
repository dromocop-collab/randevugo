import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getDb } from "@/lib/firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import type { PlatformSettings } from "@/types/platform";
import {
  DISABLED_LIVE_FEATURE_FLAGS,
  loadLiveFeatureAvailability,
  parseLiveFeatureFlags,
  resolveLiveFeatureAvailability,
  type LiveFeatureFlags,
} from "@/features/platform/live-feature-flags";

const SETTINGS_DOC_ID = "global";

const DEFAULT_SETTINGS: Omit<PlatformSettings, "id" | "createdAt" | "updatedAt"> = {
  platformName: "SeninRandevun",
  supportEmail: "destek@seninrandevun.com",
  supportPhone: "+90 530 478 8298",
  defaultTimezone: "Europe/Istanbul",
  defaultCurrency: "TRY",
  maintenanceMode: false,
  registrationOpen: true,
  bookingOpen: true,
  defaultPlan: "FREE",
  featureFlags: {
    allowAnonymousReviews: true,
    showPricingPage: true,
    showDiscoveryPage: true,
    ...DISABLED_LIVE_FEATURE_FLAGS,
  },
  seo: {
    metaTitle: "SeninRandevun — Online Randevu Sistemi",
    metaDescription:
      "Türkiye'nin #1 akıllı online randevu platformu. Kuaför, güzellik merkezi, berber, sağlık, spor ve daha fazlası için hızlı randevu alın.",
    metaKeywords: "online randevu, randevu sistemi, kuaför randevu, berber randevu",
  },
  social: {},
  announcement: {
    enabled: false,
    message: "",
  },
  analytics: {},
};

/**
 * Get the single global platform settings document, creating sane defaults
 * on the client if it doesn't exist yet (does not persist until saved).
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = getDb();
  const ref = doc(db, "platformSettings", SETTINGS_DOC_ID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      id: SETTINGS_DOC_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...DEFAULT_SETTINGS,
    };
  }

  const data = snap.data();
  return {
    id: snap.id,
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? new Date().toISOString(),
    platformName: data.platformName ?? DEFAULT_SETTINGS.platformName,
    supportEmail: data.supportEmail ?? DEFAULT_SETTINGS.supportEmail,
    supportPhone: data.supportPhone ?? DEFAULT_SETTINGS.supportPhone,
    defaultTimezone: data.defaultTimezone ?? DEFAULT_SETTINGS.defaultTimezone,
    defaultCurrency: data.defaultCurrency ?? DEFAULT_SETTINGS.defaultCurrency,
    maintenanceMode: data.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode,
    registrationOpen: data.registrationOpen ?? DEFAULT_SETTINGS.registrationOpen,
    bookingOpen: data.bookingOpen ?? DEFAULT_SETTINGS.bookingOpen,
    defaultPlan: data.defaultPlan ?? DEFAULT_SETTINGS.defaultPlan,
    featureFlags: {
      ...DEFAULT_SETTINGS.featureFlags,
      ...(data.featureFlags && typeof data.featureFlags === "object" && !Array.isArray(data.featureFlags)
        ? data.featureFlags : {}),
      ...parseLiveFeatureFlags(data.featureFlags),
    },
    seo: { ...DEFAULT_SETTINGS.seo, ...(data.seo ?? {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(data.social ?? {}) },
    announcement: { ...DEFAULT_SETTINGS.announcement, ...(data.announcement ?? {}) },
    analytics: { ...DEFAULT_SETTINGS.analytics, ...(data.analytics ?? {}) },
  };
}

/**
 * Save platform settings (super-admin only per Firestore rules).
 */
export async function updatePlatformSettings(
  input: Partial<Omit<PlatformSettings, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = getDb();
  const ref = doc(db, "platformSettings", SETTINGS_DOC_ID);
  const snap = await getDoc(ref);

  await setDoc(
    ref,
    {
      ...input,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

let liveFeatureCache: { expiresAt: number; value: ReturnType<typeof resolveLiveFeatureAvailability> } | null = null;
let liveFeatureRequest: Promise<ReturnType<typeof resolveLiveFeatureAvailability>> | null = null;
const liveSubscribers = new Set<(value: ReturnType<typeof resolveLiveFeatureAvailability>) => void>();
let liveUnsubscribe: Unsubscribe | null = null;
let liveObserved: ReturnType<typeof resolveLiveFeatureAvailability> | null = null;

/** A single shared settings listener, regardless of how many business surfaces subscribe. */
export function subscribeLiveFeatureAvailability(listener: (value: ReturnType<typeof resolveLiveFeatureAvailability>) => void): Unsubscribe {
  liveSubscribers.add(listener);
  if (liveUnsubscribe && liveObserved) listener(liveObserved);
  if (!liveUnsubscribe) {
    liveUnsubscribe = onSnapshot(doc(getDb(), "platformSettings", SETTINGS_DOC_ID), (snapshot) => {
      const value = resolveLiveFeatureAvailability(snapshot.exists() ? snapshot.data().featureFlags : null);
      liveObserved = value;
      liveFeatureCache = { value, expiresAt: Date.now() + 30_000 };
      liveSubscribers.forEach((subscriber) => subscriber(value));
    }, () => {
      const value = resolveLiveFeatureAvailability(null);
      liveObserved = value;
      liveFeatureCache = { value, expiresAt: Date.now() + 30_000 };
      liveSubscribers.forEach((subscriber) => subscriber(value));
    });
  }
  return () => {
    liveSubscribers.delete(listener);
    if (liveSubscribers.size === 0) { liveUnsubscribe?.(); liveUnsubscribe = null; liveObserved = null; }
  };
}

/** One shared, fail-closed read path for future customer and business screens. */
export async function getLiveFeatureAvailability(): Promise<ReturnType<typeof resolveLiveFeatureAvailability>> {
  if (liveFeatureCache && liveFeatureCache.expiresAt > Date.now()) return liveFeatureCache.value;
  if (liveFeatureRequest) return liveFeatureRequest;

  liveFeatureRequest = (async () => {
    try {
      const value = await loadLiveFeatureAvailability(async () => {
        const snapshot = await getDoc(doc(getDb(), "platformSettings", SETTINGS_DOC_ID));
        return snapshot.exists() ? snapshot.data().featureFlags : null;
      });
      liveFeatureCache = { value, expiresAt: Date.now() + 30_000 };
      return value;
    } finally {
      liveFeatureRequest = null;
    }
  })();

  return liveFeatureRequest;
}

export async function updateLiveFeatureFlags(changes: Partial<LiveFeatureFlags>): Promise<void> {
  const callable = httpsCallable<{ changes: Partial<LiveFeatureFlags> }, { success: boolean }>(
    getFunctions(getFirebaseApp(), "europe-west1"),
    "updateLiveFeatureFlags"
  );
  await callable({ changes });
  liveFeatureCache = null;
}
