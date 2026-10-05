"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { claimStoredGuestBookings } from "@/features/appointments/guest-booking-store";

/**
 * Kullanıcı giriş yapmışsa bu cihazda misafir olarak alınmış randevuları hesabına aktarır.
 * En az bir randevu aktarılırsa onClaimed çağrılır (ör. Randevularım listesini yenilemek için).
 */
export function useGuestAppointmentClaim(onClaimed?: (count: number) => void) {
  const { user, status } = useAuth();
  const callbackRef = useRef(onClaimed);
  useEffect(() => { callbackRef.current = onClaimed; }, [onClaimed]);
  const uid = status === "authenticated" ? user?.uid ?? null : null;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    claimStoredGuestBookings()
      .then((count) => {
        if (!active || count <= 0) return;
        toast.success(count === 1 ? "Bu cihazda aldığınız randevu hesabınıza kaydedildi." : `Bu cihazda aldığınız ${count} randevu hesabınıza kaydedildi.`);
        callbackRef.current?.(count);
      })
      .catch(() => {
        // Ağ/yetki hatası: tokenlar cihazda kalır, bir sonraki girişte yeniden denenir.
      });
    return () => { active = false; };
  }, [uid]);
}
