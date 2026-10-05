import { SDK_VERSION } from "firebase/app";
import { getFirebaseConfig } from "@/lib/firebase/config";

// Firebase Cloud Messaging service worker'ı. Service worker process.env okuyamadığı için
// web istemcisinin kullandığı aynı public Firebase yapılandırması (getFirebaseConfig)
// build sırasında betiğe gömülür; compat SDK sürümü kurulu firebase paketiyle eşleşir.
export const dynamic = "force-static";

function buildServiceWorker() {
  const config = getFirebaseConfig();
  const publicConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  };

  return `/* Senin Randevun — FCM service worker (otomatik üretildi) */
const FIREBASE_CONFIG = ${JSON.stringify(publicConfig)};
const FCM_MSG_KEY = "FCM_MSG";

function targetPath(data) {
  if (data && data.audience === "business") return "/dashboard/randevular";
  return "/hesabim?tab=appointments";
}

function readData(notification) {
  const raw = notification && notification.data;
  if (!raw) return null;
  // FCM'in otomatik gösterdiği bildirimlerde özel veri FCM_MSG.data içinde gelir.
  if (raw[FCM_MSG_KEY]) return raw[FCM_MSG_KEY].data || {};
  return raw;
}

// Firebase SDK'dan ÖNCE kaydedilir: SDK kendi notificationclick dinleyicisinde
// stopImmediatePropagation çağırdığı ve link yoksa hiçbir sayfa açmadığı için
// tıklamayı burada ele alıyoruz.
self.addEventListener("notificationclick", (event) => {
  const data = readData(event.notification);
  if (!data) return;
  event.stopImmediatePropagation();
  event.notification.close();
  const url = new URL(targetPath(data), self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const sameOrigin = windows.filter((client) => new URL(client.url).origin === self.location.origin);
    const exact = sameOrigin.find((client) => client.url === url);
    if (exact) return exact.focus();
    const reusable = sameOrigin[0];
    if (reusable && "navigate" in reusable) {
      try {
        const focused = await reusable.focus();
        return await focused.navigate(url);
      } catch (error) {
        // navigate kontrol edilmeyen istemcilerde başarısız olabilir; yeni pencere açılır.
      }
    }
    return self.clients.openWindow(url);
  })());
});

importScripts("https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

// notification alanı olan mesajları FCM zaten otomatik gösterir; burada yalnızca
// data-only mesajlar için bildirim oluşturulur (çift bildirim olmaması için).
// Görünür bir sekme varsa SDK mesajı göstermeden o sayfaya iletir (onMessage → zil + toast);
// bu yüzden onBackgroundMessage yalnızca görünür pencere yokken çalışır. İşletim sistemi
// kendi bildirim sesini çalar (silent:false); tarayıcılar arka planda özel ses desteklemez.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return;
  const data = payload.data || {};
  const title = data.title || "Senin Randevun";
  const body = data.body || "";
  return self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.appointmentId ? "appointment-" + data.appointmentId : "senin-randevun",
    renotify: true,
    silent: false,
    requireInteraction: false,
    data,
  });
});
`;
}

export function GET() {
  return new Response(buildServiceWorker(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
