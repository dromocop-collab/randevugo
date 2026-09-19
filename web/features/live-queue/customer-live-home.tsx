"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { ArrowRight, Ticket, Zap } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { getMyActiveQueues, watchMyQueueEntry, type ActiveQueuePointer } from "./customer-queue-repository";

export function CustomerLiveHome() {
  const { user, status } = useAuth();
  const [available, setAvailable] = useState(false);
  const [active, setActive] = useState<ActiveQueuePointer[]>([]);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => subscribeLiveFeatureAvailability((flags) =>
    setAvailable(flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled && flags.isLiveOperationsEnabled)), []);
  useEffect(() => {
    if (status !== "authenticated" || !user) { queueMicrotask(() => setActive([])); return; }
    let cancelled = false;
    getMyActiveQueues().then((rows) => { if (!cancelled) setActive(rows); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [status, user]);
  useEffect(() => {
    const first = active[0];
    if (!first) return;
    getDoc(doc(getDb(), "businesses", first.businessId)).then((row) =>
      setBusinessName(String(row.data()?.name ?? "İşletme"))).catch(() => setBusinessName("İşletme"));
    return watchMyQueueEntry(first.businessId, first.entryId, (entry) => {
      if (entry && ["completed", "cancelled", "expired", "no_show"].includes(entry.status))
        setActive((rows) => rows.filter((item) => item.entryId !== first.entryId));
    }, () => undefined);
  }, [active]);

  if (!available && active.length === 0) return null;
  return <section className="mx-auto my-6 max-w-7xl px-4 lg:px-8" aria-label="Canlı sıra">
    {active.length > 0 && <Link href="/siram" className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
      <span className="flex items-center gap-3"><Ticket aria-hidden="true" size={22} /><span><strong className="block">Aktif sıran var</strong><small>{active.length === 1 ? businessName : `${active.length} işletmede aktif sıran var`}</small></span></span>
      <span className="inline-flex items-center gap-1 font-semibold">Sıramı gör <ArrowRight size={16} /></span>
    </Link>}
    {available && <Link href="/simdi-musait" className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-[var(--text-1)] shadow-sm">
      <span className="flex items-center gap-3"><Zap aria-hidden="true" size={22} /><span><strong className="block">Şimdi Müsait</strong><small>Canlı sıraya açık işletmeleri keşfet.</small></span></span>
      <ArrowRight aria-hidden="true" size={18} />
    </Link>}
  </section>;
}
