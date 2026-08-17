import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import type { PlatformSettings } from "@/types/platform";

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
    featureFlags: { ...DEFAULT_SETTINGS.featureFlags, ...(data.featureFlags ?? {}) },
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
