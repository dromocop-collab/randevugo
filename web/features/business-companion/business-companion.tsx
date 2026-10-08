"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { updateAppointmentStatus } from "@/features/appointments/appointment-repository";
import { getSyncedUid, isPushOptedOut } from "@/features/push/push-repository";
import { registerForegroundClaim } from "@/features/push/foreground-claims";
import { useNotificationSoundSync } from "@/features/push/notification-sound-sync";
import { canConfirmAppointments, startOfLocalDay } from "@/features/business-companion/companion-domain";
import { useCompanionFeed } from "@/features/business-companion/use-companion-feed";
import { CompanionView, useArrivalQueue, useNow } from "@/features/business-companion/companion-view";

/**
 * Herkese açık sayfalarda, işletme erişimi olan girişli kullanıcı için canlı mini panel.
 * BusinessCompanionGate tarafından yalnızca gerektiğinde (tembel) yüklenir.
 */
export default function LiveBusinessCompanion() {
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId, access } = useBusiness();
  const uid = user?.uid ?? null;
  const active = businesses.find((business) => business.id === businessId) ?? businesses[0] ?? null;
  const role = access?.role ?? "owner";
  const staffId = role === "staff" ? access?.staffId ?? null : null;
  const now = useNow();
  useNotificationSoundSync();
  const dayStartMs = startOfLocalDay(now);

  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active?.id]);

  const shouldNotifyNatively = useCallback(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
    if (document.visibilityState !== "hidden") return false;
    // Push bu tarayıcıda açıksa sekme gizliyken bildirimi zaten servis çalışanı gösterir.
    return !(uid && getSyncedUid() === uid && !isPushOptedOut());
  }, [uid]);

  const arrivals = useArrivalQueue({ businessName: active?.name ?? "İşletmen", shouldNotifyNatively });

  // Aynı "yeni randevu" push'u ön planda ikinci kez zil/toast olmasın.
  useEffect(() => registerForegroundClaim((data) =>
    data.audience === "business" && data.kind === "appointment_created" && Boolean(data.businessId) && data.businessId === activeIdRef.current,
  ), []);

  const scopeMissing = role === "staff" && !staffId;
  const feed = useCompanionFeed({
    businessId: scopeMissing ? null : active?.id ?? null,
    staffId,
    uid,
    dayStartMs,
    onArrivals: arrivals.push,
  });

  const confirm = useCallback(async (appointmentId: string) => {
    if (!active) return;
    await updateAppointmentStatus(active.id, appointmentId, "confirmed");
  }, [active]);

  const companionBusinesses = useMemo(
    () => businesses.map((business) => ({ id: business.id, name: business.name, slug: business.slug })),
    [businesses],
  );

  if (!active || scopeMissing) return null;

  return (
    <CompanionView
      businesses={companionBusinesses}
      activeBusiness={{ id: active.id, name: active.name, slug: active.slug }}
      onSwitchBusiness={setBusinessId}
      role={role}
      canConfirm={canConfirmAppointments(role, access?.permissions)}
      feed={feed}
      arrivals={arrivals}
      onConfirm={confirm}
    />
  );
}
