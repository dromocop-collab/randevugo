import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirebaseApp } from "@/lib/firebase/client";

let initialized = false;

export function initializeFirebaseAppCheck(): void {
  if (initialized || typeof window === "undefined") return;

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) return;

  if (process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN === "true") {
    (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  initialized = true;
}
