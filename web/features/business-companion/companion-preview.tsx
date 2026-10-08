"use client";

/**
 * YALNIZCA GELİŞTİRME: ?companionPreview=1 ile işletme yardımcısını sahte veriyle gösterir.
 * BusinessCompanionGate bu modülü yalnızca NODE_ENV !== "production" iken içe aktarır;
 * üretim derlemesinde import dalı sabit `false` olduğu için paket dışında kalır.
 * Firebase'e hiç dokunmaz.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startOfLocalDay, type CompanionAppointment } from "@/features/business-companion/companion-domain";
import { CompanionView, useArrivalQueue, useNow } from "@/features/business-companion/companion-view";
import { dashTokensClassName } from "@/components/dashboard/ui";
import { NotificationSoundSection } from "@/app/dashboard/ayarlar/notification-sound-section";
import styles from "./business-companion.module.css";

const NAMES = ["Ayşe Yılmaz", "Mehmet Kaya", "Zeynep Demir", "Can Öztürk", "Elif Şahin", "Burak Arslan"];
const SERVICES = ["Saç kesimi", "Fön", "Sakal tıraşı", "Manikür", "Cilt bakımı"];
const STAFF = ["Mert", "Selin", "Deniz"];

function mockDay(nowMs: number): CompanionAppointment[] {
  const start = startOfLocalDay(nowMs);
  const slot = (h: number, m: number) => start + (h * 60 + m) * 60_000;
  const nowHour = new Date(nowMs).getHours();
  const base = Math.min(Math.max(nowHour, 9), 20);
  return [
    { id: "p1", customerName: "Selin Koç", serviceName: "Saç boyama", staffName: "Selin", startAtMs: slot(base - 2, 0), endAtMs: slot(base - 1, 0), status: "completed" },
    { id: "p2", customerName: "Ali Can", serviceName: "Sakal tıraşı", staffName: "Mert", startAtMs: slot(base, 0) - 10 * 60_000, endAtMs: slot(base, 0) + 20 * 60_000, status: "confirmed" },
    { id: "p3", customerName: "Ayşe Yılmaz", serviceName: "Saç kesimi", staffName: "Mert", startAtMs: slot(base, 40), endAtMs: slot(base + 1, 10), status: "confirmed" },
    { id: "p4", customerName: "Deniz Ak", serviceName: "Manikür", staffName: "Deniz", startAtMs: slot(base + 1, 30), endAtMs: slot(base + 2, 15), status: "pending" },
    { id: "p5", customerName: "Kerem Ateş", serviceName: "Fön", staffName: "Selin", startAtMs: slot(base + 2, 30), endAtMs: slot(base + 3, 0), status: "confirmed" },
  ];
}

export default function CompanionPreview() {
  const now = useNow();
  const [today, setToday] = useState<CompanionAppointment[]>(() => mockDay(Date.now()));
  const [pending, setPending] = useState<CompanionAppointment[]>(() => [
    ...mockDay(Date.now()).filter((item) => item.status === "pending"),
    { id: "p6", customerName: "Burak Arslan", serviceName: "Cilt bakımı", staffName: "Deniz", startAtMs: startOfLocalDay(Date.now()) + 34 * 3_600_000, status: "pending" },
  ]);
  const counter = useRef(0);
  const arrivals = useArrivalQueue({ businessName: "Şık Saçlar Kuaför", shouldNotifyNatively: () => false });
  const { push } = arrivals;

  const simulate = useCallback(() => {
    counter.current += 1;
    const index = counter.current;
    const item: CompanionAppointment = {
      id: `sim-${index}`,
      customerName: NAMES[index % NAMES.length],
      serviceName: SERVICES[index % SERVICES.length],
      staffName: STAFF[index % STAFF.length],
      startAtMs: startOfLocalDay(Date.now()) + (18 * 60 + (index % 4) * 15) * 60_000,
      status: index % 2 ? "pending" : "confirmed",
      createdAtMs: Date.now(),
    };
    push([item]);
    if (item.status === "pending") setPending((current) => [...current, item]);
  }, [push]);

  // Ekran görüntüsü için: açılıştan kısa süre sonra bir yeni randevu gelir.
  useEffect(() => {
    const timer = window.setTimeout(simulate, 1200);
    return () => window.clearTimeout(timer);
  }, [simulate]);

  const businesses = useMemo(() => [
    { id: "demo-1", name: "Şık Saçlar Kuaför", slug: "sik-saclar" },
    { id: "demo-2", name: "Şık Saçlar Bodrum", slug: "sik-saclar-bodrum" },
  ], []);
  const [activeId, setActiveId] = useState("demo-1");
  const activeBusiness = businesses.find((business) => business.id === activeId) ?? businesses[0];

  const confirm = useCallback(async (id: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setPending((current) => current.filter((item) => item.id !== id));
    setToday((current) => current.map((item) => (item.id === id ? { ...item, status: "confirmed" } : item)));
  }, []);

  const [showSoundCard, setShowSoundCard] = useState(false);
  useEffect(() => {
    // ?companionPreview=1&soundCard=1 → panel ayarlarındaki "Randevu bildirim sesi" kartını da göster.
    if (new URLSearchParams(window.location.search).get("soundCard") === "1") queueMicrotask(() => setShowSoundCard(true));
  }, []);

  return (
    <>
    {showSoundCard && (
      <div className={dashTokensClassName} style={{ position: "fixed", inset: "72px 16px auto", zIndex: 9980, maxWidth: 760, maxHeight: "calc(100dvh - 180px)", overflowY: "auto", margin: "0 auto", borderRadius: 20, boxShadow: "0 20px 60px rgb(0 0 0 / .25)" }}>
        <NotificationSoundSection />
      </div>
    )}
    <CompanionView
      businesses={businesses}
      activeBusiness={activeBusiness}
      onSwitchBusiness={setActiveId}
      role="owner"
      canConfirm
      feed={{ ready: true, today, pending, error: null }}
      arrivals={arrivals}
      onConfirm={confirm}
      devTools={
        <div className={styles.devTools}>
          <span>Önizleme (yalnızca geliştirme) · {new Date(now).toLocaleTimeString("tr-TR")}</span>
          <button type="button" onClick={simulate}>Yeni randevu simüle et</button>
        </div>
      }
    />
    </>
  );
}
