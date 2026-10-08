"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteWebPushToken,
  getMessagingIfSupported,
  getWebPushToken,
  listenForegroundMessages,
} from "@/lib/firebase/messaging";
import {
  clearSynced,
  getSyncedUid,
  isPushOptedOut,
  isRecentlySynced,
  registerWebPushToken,
  setPushOptedOut,
  unregisterWebPushToken,
} from "@/features/push/push-repository";
import {
  installNotificationAudioUnlock,
  playNotificationChime,
  unlockNotificationAudio,
} from "@/features/push/notification-sound";
import { isForegroundMessageClaimed } from "@/features/push/foreground-claims";

export type PushStatus = "loading" | "unsupported" | "blocked" | "off" | "on";

const CHANGE_EVENT = "sr-push-registration-change";

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function errorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "messaging/permission-blocked" || code === "messaging/permission-default") {
    return "Bildirim izni verilmedi. Tarayıcı ayarlarından bu site için bildirimlere izin verebilirsiniz.";
  }
  if (code.startsWith("messaging/") && code.includes("service-worker")) {
    return "Bildirim servisi başlatılamadı. Sayfayı yenileyip tekrar deneyin.";
  }
  if (code === "functions/unauthenticated") return "Bildirimleri açmak için giriş yapmalısınız.";
  return "Bildirim ayarı güncellenemedi. Lütfen tekrar deneyin.";
}

// Sayfada birden çok kart/yenileyici olsa bile tek bir onMessage dinleyicisi (tek toast).
let foregroundRefs = 0;
let foregroundUnsubscribe: (() => void) | null = null;
let foregroundStarting: Promise<void> | null = null;

function retainForegroundToasts() {
  foregroundRefs += 1;
  if (foregroundUnsubscribe || foregroundStarting) return;
  foregroundStarting = listenForegroundMessages((payload) => {
    // Sayfa görünürken FCM bildirimi işletim sistemine göstermez, buraya iletir: zil + toast.
    const data = payload.data ?? {};
    // İşletme yardımcısı aynı olayı zaten gösteriyorsa (herkese açık sayfalarda) tekrar zil/toast yok.
    if (isForegroundMessageClaimed(data)) return;
    const title = payload.notification?.title ?? data.title ?? "Yeni bildirim";
    const body = payload.notification?.body ?? data.body ?? "";
    const target = data.audience === "business" ? "/dashboard/randevular" : data.audience === "customer" ? "/hesabim?tab=appointments" : null;
    playNotificationChime();
    const onTarget = target !== null && window.location.pathname === target.split("?")[0];
    toast(title, {
      ...(body ? { description: body } : {}),
      ...(data.kind === "appointment_created" ? { duration: 8000 } : {}),
      ...(target && !onTarget ? { action: { label: "Görüntüle", onClick: () => window.location.assign(target) } } : {}),
    });
  }).then((unsubscribe) => {
    foregroundStarting = null;
    if (foregroundRefs > 0) foregroundUnsubscribe = unsubscribe;
    else unsubscribe();
  }).catch(() => {
    foregroundStarting = null;
  });
}

function releaseForegroundToasts() {
  foregroundRefs = Math.max(0, foregroundRefs - 1);
  if (foregroundRefs === 0 && foregroundUnsubscribe) {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }
}

// Aynı anda birden fazla örneğin sunucuya paralel kayıt göndermesini engeller.
let syncInFlight: Promise<boolean> | null = null;

async function syncToken(uid: string, force: boolean): Promise<boolean> {
  if (!syncInFlight) {
    syncInFlight = (async () => {
      const token = await getWebPushToken();
      if (!token) return false;
      if (force || !isRecentlySynced(uid, token)) await registerWebPushToken(uid, token);
      return true;
    })().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

/**
 * Web push kaydı. İzin yalnızca enable() ile (kullanıcı tıklamasıyla) istenir.
 * İzin zaten verilmişse ve kullanıcı kapatmadıysa jeton sessizce yenilenir.
 */
export function usePushRegistration() {
  const { user, status: authStatus } = useAuth();
  const uid = user?.uid ?? null;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  // Jetonun sunucuya kaydedildiği kullanıcı (bu tarayıcı için).
  const [registeredFor, setRegisteredFor] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const readState = () => {
      setPermission(Notification.permission);
      setRegisteredFor(isPushOptedOut() ? null : getSyncedUid());
    };
    getMessagingIfSupported().then((messaging) => {
      if (cancelled) return;
      setSupported(Boolean(messaging));
      if (messaging) readState();
    });
    // Aynı sayfadaki diğer örneklerin (kart / yenileyici) değişikliklerini yansıt.
    const onChange = () => {
      if (!cancelled && "Notification" in window) readState();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);

  // Sessiz yenileme: izin verilmiş + giriş yapılmış + kullanıcı kapatmamış. Asla izin istemez.
  useEffect(() => {
    if (!supported || !uid || authStatus !== "authenticated") return;
    if (Notification.permission !== "granted" || isPushOptedOut()) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setSyncing(true); });
    syncToken(uid, false)
      .then((ok) => {
        if (!cancelled) setRegisteredFor(ok ? uid : null);
      })
      .catch(() => {
        // Sessiz yenileme hatası kullanıcıya gösterilmez; kart "kapalı" görünür ve tekrar açılabilir.
        if (!cancelled) setRegisteredFor(null);
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported, uid, authStatus]);

  useEffect(() => {
    installNotificationAudioUnlock();
  }, []);

  const isOn = Boolean(supported && uid && permission === "granted" && registeredFor === uid);

  useEffect(() => {
    if (!isOn) return;
    retainForegroundToasts();
    return releaseForegroundToasts;
  }, [isOn]);

  const enable = useCallback(async () => {
    if (!supported || !uid) return false;
    setBusy(true);
    try {
      // Kullanıcı hareketi içinde: ses bağlamını aç ve izni iste (requestPermission tıklamadan çağrılmalı).
      unlockNotificationAudio();
      const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        if (result === "denied") toast.error("Bildirim izni engellendi. Tarayıcı ayarlarından izin verebilirsiniz.");
        return false;
      }
      setPushOptedOut(false);
      const ok = await syncToken(uid, true);
      setRegisteredFor(ok ? uid : null);
      if (ok) toast.success("Bildirimler bu tarayıcıda açıldı.");
      else toast.error("Bu tarayıcı bildirim jetonu oluşturamadı.");
      notifyChange();
      return ok;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, uid]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      setPushOptedOut(true);
      if (uid) await unregisterWebPushToken().catch(() => undefined);
      clearSynced();
      await deleteWebPushToken().catch(() => undefined);
      setRegisteredFor(null);
      toast.success("Bu tarayıcıda bildirimler kapatıldı.");
      notifyChange();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [supported, uid]);

  let status: PushStatus;
  if (supported === null || authStatus === "loading") status = "loading";
  else if (!supported) status = "unsupported";
  else if (permission === "denied") status = "blocked";
  else if (isOn) status = "on";
  else if (syncing) status = "loading";
  else status = "off";

  return { status, busy, signedIn: Boolean(uid), enable, disable };
}
