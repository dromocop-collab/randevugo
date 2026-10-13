import type { FirebaseOptions } from "firebase/app";

const FALLBACK_FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyDNVqEA7LxLwDR_8wqcDD2Ah5AQerOgTpk",
  authDomain: "randevugo-d1d2e.firebaseapp.com",
  projectId: "randevugo-d1d2e",
  storageBucket: "randevugo-d1d2e.firebasestorage.app",
  messagingSenderId: "575970652443",
  appId: "1:575970652443:web:41e944be411b347194a3be",
};

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

/**
 * Google/Apple giriş penceresinde "randevugo-d1d2e.firebaseapp.com" yerine "seninrandevun.com" görünsün diye
 * canlı sitede authDomain sitenin kendisi olur; /__/auth ve /__/firebase istekleri next.config rewrites ile
 * Firebase'e aktarılır. ÖNCE Google OAuth istemcisine ve Apple Services ID'ye
 * https://seninrandevun.com/__/auth/handler yönlendirme adresi eklenmeli, sonra NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN=1.
 */
const CUSTOM_AUTH_HOSTS = ["seninrandevun.com", "www.seninrandevun.com"];

function withCustomAuthDomain(config: FirebaseOptions): FirebaseOptions {
  if (process.env.NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN !== "1" || typeof window === "undefined") return config;
  const host = window.location.hostname;
  return CUSTOM_AUTH_HOSTS.includes(host) ? { ...config, authDomain: host } : config;
}

export function getFirebaseConfig(): FirebaseOptions {
  return withCustomAuthDomain(resolveFirebaseConfig());
}

function resolveFirebaseConfig(): FirebaseOptions {
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
    return FALLBACK_FIREBASE_CONFIG;
  }

  return fromVars;
}
