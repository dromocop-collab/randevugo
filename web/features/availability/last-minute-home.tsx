"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { listLastMinuteOpenings, type LastMinuteOpening } from "./availability-repository";

export function LastMinuteHome() {
  const [enabled, setEnabled] = useState(false);
  const [openings, setOpenings] = useState<LastMinuteOpening[]>([]);
  useEffect(() => subscribeLiveFeatureAvailability((flags) => setEnabled(flags.isLastMinuteSlotsEnabled)), []);
  useEffect(() => {
    if (!enabled) { queueMicrotask(() => setOpenings([])); return; }
    let active = true;
    listLastMinuteOpenings().then((rows) => { if (active) setOpenings(rows); })
      .catch(() => { if (active) setOpenings([]); });
    return () => { active = false; };
  }, [enabled]);
  if (!enabled || openings.length === 0) return null;
  return <section className="mx-auto my-6 max-w-7xl px-4 lg:px-8" aria-label="Son dakika boşlukları">
    <div className="mb-3 flex items-center gap-2"><Zap size={19} aria-hidden="true" className="text-amber-600" />
      <h2 className="text-xl font-bold text-[var(--text-1)]">Son Dakika Boşlukları</h2></div>
    <p className="mb-3 text-sm text-[var(--text-3)]">Planlı randevu saatleri. Boşluklar rezerve edilmez; son uygunluk randevu adımında kontrol edilir.</p>
    <div className="grid gap-3 md:grid-cols-3">{openings.slice(0, 3).map((opening) => {
      const params = new URLSearchParams({ service: opening.serviceId, date: opening.dateKey,
        start: String(opening.startAtMillis) });
      if (opening.staffId) params.set("staff", opening.staffId);
      return <Link key={opening.id} href={`/isletme/${encodeURIComponent(opening.businessSlug)}/randevu?${params}`}
        className="flex min-h-28 items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-[var(--text-1)] shadow-sm">
        <span><strong className="block">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: opening.timeZone }).format(opening.startAtMillis)}</strong>
          <span className="mt-1 block text-sm">{opening.businessName} · {opening.serviceName}</span>
          {opening.staffName && <small className="text-[var(--text-3)]">{opening.staffName}</small>}</span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>;
    })}</div>
  </section>;
}
