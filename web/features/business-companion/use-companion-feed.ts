"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import {
  pickNewArrivals,
  toCompanionAppointment,
  type CompanionAppointment,
} from "@/features/business-companion/companion-domain";

export interface CompanionFeed {
  ready: boolean;
  today: CompanionAppointment[];
  pending: CompanionAppointment[];
  error: string | null;
}

const EMPTY: CompanionFeed = { ready: false, today: [], pending: [], error: null };
const CLOCK_SKEW_MS = 2 * 60_000;

function rows(docs: { id: string; data: () => Record<string, unknown> }[]): CompanionAppointment[] {
  return docs.map((doc) => toCompanionAppointment(doc.id, doc.data())).filter((item): item is CompanionAppointment => item !== null);
}

/**
 * Herkese açık sayfalarda işletme için en az okumayla canlı akış:
 * 1) bugünün randevuları (startAt aralığı), 2) onay bekleyenler (status == pending, en fazla 25),
 * 3) sayfa açıldıktan sonra oluşturulan randevular (createdAt > açılış; ilk anlık görüntü yalnızca "görüldü" sayılır).
 * Çalışan rolünde her sorgu staffId ile daraltılır (firestore.rules ve mevcut (staffId, startAt) dizini).
 * Kullanılan sorgular yeni bir bileşik dizin gerektirmez.
 */
export function useCompanionFeed(input: {
  businessId: string | null;
  staffId: string | null;
  uid: string | null;
  dayStartMs: number;
  onArrivals: (items: CompanionAppointment[]) => void;
}): CompanionFeed {
  const { businessId, staffId, uid, dayStartMs, onArrivals } = input;
  const [feed, setFeed] = useState<CompanionFeed & { key: string }>({ ...EMPTY, key: "" });
  const arrivalsRef = useRef(onArrivals);
  useEffect(() => {
    arrivalsRef.current = onArrivals;
  }, [onArrivals]);

  const key = businessId ? `${businessId}:${staffId ?? "*"}:${dayStartMs}` : "";

  useEffect(() => {
    if (!businessId) return;
    const db = getDb();
    const ref = collection(db, "businesses", businessId, "appointments");
    const scope: QueryConstraint[] = staffId ? [where("staffId", "==", staffId)] : [];
    const dayEnd = dayStartMs + 24 * 60 * 60_000 - 1;
    const loadedAt = Date.now();
    let alive = true;
    let todayReady = false;
    let pendingReady = false;

    const update = (patch: Partial<CompanionFeed>) => {
      if (!alive) return;
      setFeed((current) => ({ ...(current.key === key ? current : { ...EMPTY, key }), ...patch, key }));
    };
    const fail = () => update({ error: "Randevular şu anda alınamadı.", ready: true });

    const unsubscribers = [
      onSnapshot(
        query(ref, ...scope, where("startAt", ">=", Timestamp.fromMillis(dayStartMs)), where("startAt", "<=", Timestamp.fromMillis(dayEnd)), orderBy("startAt", "asc")),
        (snapshot) => {
          todayReady = true;
          update({ today: rows(snapshot.docs), ready: pendingReady, error: null });
        },
        fail,
      ),
      onSnapshot(
        query(ref, ...scope, where("status", "==", "pending"), limit(25)),
        (snapshot) => {
          pendingReady = true;
          update({ pending: rows(snapshot.docs), ready: todayReady });
        },
        // Onay listesi alınamazsa (ör. yetki) yardımcının geri kalanı çalışmaya devam eder.
        () => {
          pendingReady = true;
          update({ pending: [], ready: todayReady });
        },
      ),
    ];

    // Yeni randevu dinleyicisi. Yönetici: createdAt > açılış (tek alan dizini, ilk okuma ~0 belge).
    // Çalışan: (staffId, startAt) dizinini kullanır; createdAt + staffId bileşik dizini gerektirmesin diye.
    let seen = new Set<string>();
    let primed = false;
    const arrivalsQuery = staffId
      ? query(ref, ...scope, where("startAt", ">=", Timestamp.fromMillis(dayStartMs)), orderBy("startAt", "asc"), limit(150))
      : query(ref, where("createdAt", ">", Timestamp.fromMillis(loadedAt - CLOCK_SKEW_MS)));
    unsubscribers.push(onSnapshot(
      arrivalsQuery,
      (snapshot) => {
        if (!primed) {
          primed = true;
          seen = new Set(snapshot.docs.map((doc) => doc.id));
          return;
        }
        const added = rows(snapshot.docChanges().filter((change) => change.type === "added").map((change) => change.doc));
        if (!added.length) return;
        const result = pickNewArrivals({ added, seen, sinceMs: loadedAt - CLOCK_SKEW_MS, selfUid: uid });
        seen = result.seen;
        if (result.fresh.length && alive) arrivalsRef.current(result.fresh);
      },
      () => undefined,
    ));

    return () => {
      alive = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [businessId, staffId, uid, dayStartMs, key]);

  return feed.key === key ? feed : EMPTY;
}
