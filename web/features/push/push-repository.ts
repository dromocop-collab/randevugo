"use client";

import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";

const DEVICE_ID_KEY = "sr.push.deviceId";
const OPT_OUT_KEY = "sr.push.optOut";
const LAST_SYNC_KEY = "sr.push.lastSync";

type RegisterPushTokenInput = {
  token: string;
  deviceId: string;
  platform: "web";
  appVersion: string;
  locale: string;
};

function callable<TInput, TOutput>(name: string) {
  return httpsCallable<TInput, TOutput>(getFunctions(getFirebaseApp(), "europe-west1"), name);
}

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Gizli pencere / engelli depolama: yalnızca bu oturum için bellekte devam edilir.
  }
}

let memoryDeviceId: string | null = null;

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Bu tarayıcı için kalıcı cihaz kimliği (sunucu [a-zA-Z0-9_-] dışını temizler). */
export function getWebDeviceId(): string {
  const stored = storageGet(DEVICE_ID_KEY);
  if (stored && /^[a-zA-Z0-9_-]{4,128}$/.test(stored)) return stored;
  if (!memoryDeviceId) memoryDeviceId = `web-${randomId()}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  storageSet(DEVICE_ID_KEY, memoryDeviceId);
  return memoryDeviceId;
}

/** Kullanıcı bu tarayıcıda bildirimleri bilerek kapattı mı? */
export function isPushOptedOut(): boolean {
  return storageGet(OPT_OUT_KEY) === "1";
}

export function setPushOptedOut(value: boolean) {
  storageSet(OPT_OUT_KEY, value ? "1" : null);
}

type LastSync = { uid: string; token: string; at: number };

const RESYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Aynı kullanıcı + jeton son 24 saatte kaydedildiyse sunucuyu tekrar çağırmaya gerek yok. */
export function isRecentlySynced(uid: string, token: string): boolean {
  const raw = storageGet(LAST_SYNC_KEY);
  if (!raw) return false;
  try {
    const value = JSON.parse(raw) as Partial<LastSync>;
    return value.uid === uid && value.token === token && typeof value.at === "number" && Date.now() - value.at < RESYNC_INTERVAL_MS;
  } catch {
    return false;
  }
}

/** Bu tarayıcının jetonu en son hangi kullanıcı için kaydedildi? */
export function getSyncedUid(): string | null {
  const raw = storageGet(LAST_SYNC_KEY);
  if (!raw) return null;
  try {
    const uid = (JSON.parse(raw) as Partial<LastSync>).uid;
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

function markSynced(uid: string, token: string) {
  storageSet(LAST_SYNC_KEY, JSON.stringify({ uid, token, at: Date.now() } satisfies LastSync));
}

export function clearSynced() {
  storageSet(LAST_SYNC_KEY, null);
}

export async function registerWebPushToken(uid: string, token: string) {
  await callable<RegisterPushTokenInput, { success: boolean }>("registerPushToken")({
    token,
    deviceId: getWebDeviceId(),
    platform: "web",
    appVersion: "web",
    locale: typeof navigator !== "undefined" && navigator.language ? navigator.language : "tr-TR",
  });
  markSynced(uid, token);
}

export async function unregisterWebPushToken() {
  await callable<{ deviceId: string }, { success: boolean }>("unregisterPushToken")({ deviceId: getWebDeviceId() });
  clearSynced();
}
