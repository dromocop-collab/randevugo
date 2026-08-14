import type { FirebaseOptions } from "firebase/app";

type WindowWithFirebaseConfig = Window & {
  __FIREBASE_CONFIG__?: string | FirebaseOptions;
  FIREBASE_WEBAPP_CONFIG?: string | FirebaseOptions;
};

function resolveConfigFromJson(raw?: string | FirebaseOptions): FirebaseOptions | null {
  if (!raw) return null;

  if (typeof raw === "object") {
    const value = raw as FirebaseOptions;
    if (value.apiKey && value.appId && value.projectId) {
      return value;
    }
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as FirebaseOptions;
    if (parsed.apiKey && parsed.appId && parsed.projectId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function resolveConfigFromWindow(): FirebaseOptions | null {
  if (typeof window === "undefined") return null;

  const value = window as WindowWithFirebaseConfig;
  return (
    resolveConfigFromJson(value.__FIREBASE_CONFIG__) ??
    resolveConfigFromJson(value.FIREBASE_WEBAPP_CONFIG)
  );
}

export function getFirebaseConfig(): FirebaseOptions {
  const fromJson =
    resolveConfigFromJson(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) ??
    resolveConfigFromJson(process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG) ??
    resolveConfigFromWindow();

  if (fromJson) {
    return fromJson;
  }

  const fromVars: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!fromVars.apiKey || !fromVars.appId || !fromVars.projectId) {
    throw new Error(
      "Firebase istemci konfigurasyonu eksik. NEXT_PUBLIC_FIREBASE_CONFIG veya NEXT_PUBLIC_FIREBASE_* degiskenlerini tanimlayin."
    );
  }

  return fromVars;
}
