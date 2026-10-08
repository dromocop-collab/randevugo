"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getLocalSoundPreferenceUpdatedAt,
  onLocalSoundPreferenceChange,
  setSoundPreference,
} from "@/features/push/notification-sound";

const loadedFor = new Set<string>();
let saveTimer: number | null = null;

/**
 * Randevu sesi tercihini hesapla eşitler (users/{uid}/preferences/notificationSound).
 * - Oturum başına bir kez okur; hesaptaki kayıt yereldekinden yeniyse uygular.
 * - Bu cihazda kullanıcı değiştirince (yerel kaynak) 600 ms sonra hesaba yazar.
 * İşletme panelinde ve sitedeki işletme yardımcısında kullanılır (müşteri sayfalarında okuma yapmaz).
 */
export function useNotificationSoundSync() {
  const { user, status } = useAuth();
  const uid = status === "authenticated" ? user?.uid ?? null : null;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    if (!loadedFor.has(uid)) {
      loadedFor.add(uid);
      import("@/features/users/notification-sound-repository")
        .then(({ getNotificationSoundPreference }) => getNotificationSoundPreference(uid))
        .then((remote) => {
          if (!alive || !remote) return;
          if (remote.updatedAtMs > getLocalSoundPreferenceUpdatedAt()) {
            setSoundPreference(remote.preference, { source: "remote", updatedAtMs: remote.updatedAtMs });
          }
        })
        .catch(() => {
          // Okunamazsa yerel tercih geçerli kalır; bir sonraki oturumda yeniden denenir.
          loadedFor.delete(uid);
        });
    }
    const unsubscribe = onLocalSoundPreferenceChange((preference) => {
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        void import("@/features/users/notification-sound-repository")
          .then(({ saveNotificationSoundPreference }) => saveNotificationSoundPreference(uid, preference))
          .catch(() => undefined);
      }, 600);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [uid]);
}
