"use client";

import type { MessagePayload, Messaging } from "firebase/messaging";
import { getFirebaseApp } from "@/lib/firebase/client";

export const MESSAGING_SW_PATH = "/firebase-messaging-sw.js";
// Firebase'in varsayılan kapsamı: sitenin geri kalanını kontrol etmeyen ayrı bir SW kapsamı.
export const MESSAGING_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

let messagingPromise: Promise<Messaging | null> | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function hasBrowserPushApis() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

/** Tarayıcı FCM web push destekliyorsa Messaging örneğini döndürür (firebase/messaging tembel yüklenir). */
export function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!hasBrowserPushApis()) return Promise.resolve(null);
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const { getMessaging, isSupported } = await import("firebase/messaging");
        if (!(await isSupported())) return null;
        return getMessaging(getFirebaseApp());
      } catch {
        return null;
      }
    })();
  }
  return messagingPromise;
}

function waitForActive(registration: ServiceWorkerRegistration, timeoutMs = 10_000) {
  if (registration.active) return Promise.resolve();
  const incoming = registration.installing ?? registration.waiting;
  if (!incoming) return Promise.reject(new Error("Service worker bulunamadı."));
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Service worker etkinleşmedi.")), timeoutMs);
    incoming.addEventListener("statechange", () => {
      if (incoming.state === "activated") {
        window.clearTimeout(timer);
        resolve();
      }
    });
  });
}

/** FCM service worker'ını kaydeder (tekrar çağrılırsa aynı kaydı döndürür). */
export function getMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!registrationPromise) {
    registrationPromise = (async () => {
      const registration = await navigator.serviceWorker.register(MESSAGING_SW_PATH, { scope: MESSAGING_SW_SCOPE });
      registration.update().catch(() => undefined);
      await waitForActive(registration);
      return registration;
    })().catch((error) => {
      registrationPromise = null;
      throw error;
    });
  }
  return registrationPromise;
}

/** İzin verilmiş olmalı. FCM kayıt jetonunu alır; NEXT_PUBLIC_FIREBASE_VAPID_KEY varsa onu kullanır. */
export async function getWebPushToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;
  const serviceWorkerRegistration = await getMessagingServiceWorker();
  const { getToken } = await import("firebase/messaging");
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const token = await getToken(messaging, {
    serviceWorkerRegistration,
    ...(vapidKey ? { vapidKey } : {}),
  });
  return token || null;
}

/** Bu tarayıcının FCM jetonunu siler (push aboneliği de iptal edilir). */
export async function deleteWebPushToken(): Promise<void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  const { deleteToken } = await import("firebase/messaging");
  await deleteToken(messaging);
}

/** Sayfa açıkken gelen mesajları dinler. Abonelikten çıkış fonksiyonu döndürür. */
export async function listenForegroundMessages(handler: (payload: MessagePayload) => void): Promise<() => void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => undefined;
  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, handler);
}
