"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Search, Zap } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { listLiveDiscovery, type LiveDiscoveryBusiness } from "@/features/live-queue/customer-queue-repository";
import { waitEstimateLabel } from "@/features/live-queue/wait-estimate";

export default function LiveDiscoveryPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [businesses, setBusinesses] = useState<LiveDiscoveryBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => subscribeLiveFeatureAvailability((flags) =>
    setEnabled(flags.isLiveAvailabilityEnabled && flags.isLiveQueueEnabled && flags.isLiveOperationsEnabled)), []);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setReload((value) => value + 1), 180_000);
    const onFocus = () => setReload((value) => value + 1);
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) { queueMicrotask(() => setBusinesses([])); return; }
    let cancelled = false;
    queueMicrotask(() => { setLoading(true); setError(""); });
    listLiveDiscovery().then((rows) => { if (!cancelled) setBusinesses(rows); })
      .catch(() => { if (!cancelled) setError("Canlı işletmeler yüklenemedi. Lütfen tekrar dene."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, reload]);

  const categories = useMemo(() => [...new Set(businesses.map((item) => item.category).filter(Boolean))].sort(), [businesses]);
  const cities = useMemo(() => [...new Set(businesses.map((item) => item.city).filter(Boolean))].sort(), [businesses]);
  const visible = useMemo(() => businesses.filter((item) => {
    const term = search.trim().toLocaleLowerCase("tr");
    return (!term || [item.name, item.category, item.city, item.district].some((value) => value.toLocaleLowerCase("tr").includes(term))) &&
      (!category || item.category === category) && (!city || item.city === city);
  }), [businesses, search, category, city]);

  return <div className="marketing-page min-h-screen bg-[var(--bg-1)]"><MarketingHeader />
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Link href="/kesfet" className="text-sm text-[var(--accent)]">← Normal randevu keşfine dön</Link>
      <div className="mt-7"><span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"><Zap size={16} /> CANLI SIRA</span>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-1)]">Şimdi Müsait</h1>
        <p className="mt-2 text-[var(--text-2)]">Şu anda canlı sıraya açık işletmeleri keşfet. Kesin bekleme süresi işletmenin güncel durumuna bağlıdır.</p></div>
      {enabled === null || loading ? <p className="mt-10" role="status">İşletmeler yükleniyor…</p> : !enabled ?
        <div className="mt-10 rounded-2xl border border-[var(--border)] p-8">Canlı sıra şu anda kullanılamıyor. <Link href="/kesfet" className="text-[var(--accent)]">Randevu için işletmeleri keşfet</Link></div> : <>
        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4"><Search size={18} aria-hidden="true" /><span className="sr-only">İşletme ara</span><input className="min-h-12 w-full bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="İşletme, kategori veya ilçe ara" /></label>
          <select aria-label="Kategori" className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tüm kategoriler</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          <select aria-label="Şehir" className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4" value={city} onChange={(event) => setCity(event.target.value)}><option value="">Tüm şehirler</option>{cities.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {error ? <div className="mt-8 rounded-2xl border border-[var(--border)] p-6"><p>{error}</p><button className="mt-3 text-[var(--accent)]" onClick={() => setReload((value) => value + 1)}>Yeniden dene</button></div> :
          visible.length === 0 ? <div className="mt-8 rounded-2xl border border-[var(--border)] p-8">Şu anda bu filtrelere uyan canlı sıraya açık işletme yok.</div> :
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((business) => <article key={business.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">● Canlı sıraya açık</span>
            <h2 className="mt-3 text-xl font-bold text-[var(--text-1)]">{business.name}</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">{business.category}</p>
            <p className="mt-4 flex items-center gap-1 text-sm text-[var(--text-2)]"><MapPin size={15} aria-hidden="true" />{[business.district, business.city].filter(Boolean).join(", ")}</p>
            <p className="mt-2 text-sm text-[var(--text-2)]">{business.serviceCount} hizmet</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-1)]">{business.earliestWait
              ? `En erken: ${business.earliestWait.serviceName} · ${waitEstimateLabel(business.earliestWait)}`
              : "Bekleme süresi hizmete göre değişir"}</p>
            <Link className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white" href={`/isletme/${business.slug}/canli-sira`}>Sıraya katıl <ArrowRight size={17} /></Link>
          </article>)}</div>}
      </>}
    </main><MarketingFooter /></div>;
}
