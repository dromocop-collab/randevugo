"use client";

import { useSyncExternalStore } from "react";

/**
 * "Bu sayfalarda gösterme" tercihi (cihaz başına). Panel › Ayarlar › Randevu Motoru › Bildirimler
 * kartından ya da işletme yardımcısının kendi menüsünden değiştirilir.
 */
const HIDDEN_KEY = "sr.companion.hidden";
const listeners = new Set<() => void>();

export function isCompanionHidden(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCompanionHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(HIDDEN_KEY, "1");
    else window.localStorage.removeItem(HIDDEN_KEY);
  } catch {
    // Depolama kapalıysa tercih yalnızca bu sayfa için geçerli olur.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === HIDDEN_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Sunucuda ve ilk boyamada "gizli" kabul edilir; böylece hidrasyon sonrası tek seferde belirir. */
export function useCompanionHidden(): boolean {
  return useSyncExternalStore(subscribe, isCompanionHidden, () => true);
}
