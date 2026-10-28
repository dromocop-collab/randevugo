"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";

// Süper admin destek modu: bir işletmenin panelini o işletme adına açar.
// Yalnız bu sekmede (sessionStorage) geçerlidir; işletmeye üye eklenmez, sahiplik değişmez.
// Yetki Firestore kuralları (isPlatformAdmin) ve callable'lardaki süper admin istisnasıyla sağlanır.

const KEY = "sr-support-business";
export const SUPPORT_MODE_EVENT = "sr:support-mode";

export type SupportSession = { businessId: string; businessName: string; startedAt: number };

export function readSupportSession(): SupportSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SupportSession>;
    if (typeof value.businessId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value.businessId)) return null;
    return { businessId: value.businessId, businessName: String(value.businessName ?? ""), startedAt: Number(value.startedAt) || Date.now() };
  } catch {
    return null;
  }
}

/** Denetim izi: süper admin hangi mağazanın paneline ne zaman girdi (platformAuditLogs; hata yutulur). */
export function logSupportSession(businessId: string, actorUid: string) {
  void addDoc(collection(getDb(), "platformAuditLogs"), {
    action: "support.session_started",
    businessId,
    entityId: businessId,
    actorSource: "support_mode",
    actorUid,
    createdAt: serverTimestamp(),
  }).catch(() => undefined);
}

export function startSupportSession(businessId: string, businessName: string) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ businessId, businessName, startedAt: Date.now() }));
  } catch {
    // Gizli sekme vb.: destek modu açılamaz, panel normal davranır.
  }
  window.dispatchEvent(new Event(SUPPORT_MODE_EVENT));
}

export function endSupportSession() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // yok say
  }
  window.dispatchEvent(new Event(SUPPORT_MODE_EVENT));
}
