"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, RefreshCw, Search, SlidersHorizontal, Sparkles, Ticket, UsersRound, Zap } from "lucide-react";
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
  const hasFilters = Boolean(search.trim() || category || city);
  const resetFilters = () => { setSearch(""); setCategory(""); setCity(""); };

  return <div className="marketing-page live-discovery-page"><MarketingHeader />
    <main className="live-discovery-main">
      <nav className="live-breadcrumb" aria-label="Sayfa konumu"><Link href="/kesfet"><ArrowLeft size={15} /> Keşfe dön</Link><span>/</span><span>Şimdi Müsait</span></nav>

      <section className="live-discovery-hero" aria-labelledby="live-discovery-title">
        <div className="live-discovery-hero__copy">
          <span className="live-eyebrow"><Zap size={15} fill="currentColor" /> CANLI SIRA · ŞİMDİ MÜSAİT</span>
          <h1 id="live-discovery-title">Güzel bir hizmet için <em>doğru zaman şimdi.</em></h1>
          <p>Canlı sıraya yeni müşteri kabul eden işletmeleri keşfet. Hizmetini seç, sıraya katıl ve durumunu tek yerden takip et.</p>
          <div className="live-hero-links"><a href="#canli-isletmeler">İşletmeleri keşfet <ArrowRight size={17} /></a><Link href="/siram"><Ticket size={17} /> Sıramı gör</Link></div>
          <span className="live-hero-note"><RefreshCw size={14} /> İşletme durumu düzenli olarak yenilenir</span>
        </div>
        <div className="live-journey-card" aria-label="Canlı sıra nasıl çalışır">
          <div className="live-journey-card__top"><span>NASIL ÇALIŞIR?</span><span className="live-journey-card__spark"><Sparkles size={20} /></span></div>
          <div className="live-journey-step"><span className="live-journey-step__number">01</span><span className="live-journey-step__icon"><Search size={19} /></span><div><strong>İşletmeni bul</strong><small>Şu an müşteri kabul edenleri gör.</small></div><Check size={16} /></div>
          <div className="live-journey-step"><span className="live-journey-step__number">02</span><span className="live-journey-step__icon"><UsersRound size={19} /></span><div><strong>Sıraya katıl</strong><small>Hizmetini ve personel tercihini seç.</small></div><Check size={16} /></div>
          <div className="live-journey-step"><span className="live-journey-step__number">03</span><span className="live-journey-step__icon"><Ticket size={19} /></span><div><strong>Sıranı takip et</strong><small>Çağrıldığında buradan haberdar ol.</small></div><Check size={16} /></div>
          <p>Canlı sıra, ileri tarihli randevudan ayrıdır.</p>
        </div>
      </section>

      {enabled && <div className="live-filter-bar live-filter-bar--floating">
        <label className="live-search-field"><Search size={19} /><span className="sr-only">İşletme ara</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="İşletme, kategori veya ilçe ara" /></label>
        <label className="live-select-field"><SlidersHorizontal size={17} /><span className="sr-only">Kategori</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tüm kategoriler</option>{categories.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={16} /></label>
        <label className="live-select-field"><MapPin size={17} /><span className="sr-only">Şehir</span><select value={city} onChange={(event) => setCity(event.target.value)}><option value="">Tüm şehirler</option>{cities.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={16} /></label>
      </div>}

      <section id="canli-isletmeler" className="live-discovery-results" aria-labelledby="live-results-title">
        <div className="live-results-heading"><div><span className="live-section-kicker"><span /> GÜNCEL LİSTE</span><h2 id="live-results-title">Canlı sıraya açık işletmeler</h2><p>İşletmelerin yeni müşteri kabul etme durumuna göre listelenir.</p></div>{enabled && <button type="button" className="live-refresh" onClick={() => setReload((value) => value + 1)} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Listeyi yenile</button>}</div>

        {enabled === null || loading ? <div className="live-state-card" role="status"><span className="live-state-card__icon"><RefreshCw size={25} className="animate-spin" /></span><h3>İşletmeler kontrol ediliyor</h3><p>Güncel canlı sıra durumunu getiriyoruz.</p></div> : !enabled ?
          <div className="live-state-card"><span className="live-state-card__icon"><CalendarDays size={28} /></span><h3>Canlı sıra şu anda kapalı</h3><p>Normal randevu almaya devam edebilirsin. Sana uygun işletme ve saatleri keşfet.</p><Link href="/kesfet" className="live-state-card__action">Randevu keşfine git <ArrowRight size={17} /></Link></div> : error ?
          <div className="live-state-card" role="alert"><span className="live-state-card__icon"><RefreshCw size={27} /></span><h3>Liste yüklenemedi</h3><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="live-state-card__action">Tekrar dene <ArrowRight size={17} /></button></div> : visible.length === 0 ?
          <div className="live-state-card"><span className="live-state-card__icon"><Search size={27} /></span><h3>{hasFilters ? "Bu aramaya uygun işletme bulunamadı" : "Şu anda açık canlı sıra yok"}</h3><p>{hasFilters ? "Farklı bir arama veya şehir deneyebilirsin. İstersen filtreleri temizleyip tüm işletmelere bak." : "İşletmeler yalnızca çalışma saatlerinde yeni müşteri kabul ederken burada görünür. Normal randevu seçeneklerine de göz atabilirsin."}</p><div className="live-state-card__links">{hasFilters && <button type="button" onClick={resetFilters} className="live-state-card__action">Filtreleri temizle <ArrowRight size={17} /></button>}<Link href="/kesfet" className={hasFilters ? "live-state-card__secondary" : "live-state-card__action"}>Normal randevuları keşfet <ArrowRight size={17} /></Link></div></div> : <>
          <div className="live-results-count"><strong>{visible.length} işletme</strong><span>şu anda canlı sıraya açık</span>{hasFilters && <button type="button" onClick={resetFilters}>Filtreleri temizle</button>}</div>
          <div className="live-business-grid">{visible.map((business) => <article key={business.id} className="live-business-card">
            <div className="live-business-card__head"><div className="live-business-card__logo">{business.logoUrl ? <Image src={business.logoUrl} alt={`${business.name} logosu`} width={58} height={58} /> : <span>{business.name.charAt(0).toLocaleUpperCase("tr-TR")}</span>}</div><span className="live-business-card__status"><span /> Yeni müşteri kabul ediyor</span></div>
            <h3>{business.name}</h3><p className="live-business-card__category">{business.category}</p>
            <div className="live-business-card__facts"><span><MapPin size={16} /> {[business.district, business.city].filter(Boolean).join(", ") || "Konum bilgisi yok"}</span><span><Sparkles size={16} /> {business.serviceCount} hizmet</span></div>
            <div className="live-business-card__wait"><Clock3 size={18} /><div><small>GÜNCEL BEKLEME</small><strong>{business.earliestWait ? `${business.earliestWait.serviceName} · ${waitEstimateLabel(business.earliestWait)}` : "Hizmete göre değişir"}</strong></div></div>
            <Link href={`/isletme/${business.slug}/canli-sira`} className="live-business-card__cta">Canlı sırayı gör <ArrowRight size={18} /></Link>
          </article>)}</div>
        </>}
      </section>
    </main><MarketingFooter /></div>;
}
