"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDiscoveryFacets, searchBusinesses, type BusinessSearchResult, type DiscoveryFacets } from "@/features/discovery/search-repository";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { Business } from "@/types/business";
import { BadgeCheck, Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, RefreshCw, Scale, Search, SlidersHorizontal, Sparkles, Star, UsersRound, X } from "lucide-react";
import { canonicalBusinessCategory } from "@/lib/business-categories";

interface DiscoveryCategory {
  value: string;
  label: string;
  icon: string;
  imageUrl?: string;
}

const DEFAULT_CATEGORIES: DiscoveryCategory[] = [
  { value: "", label: "Tümü", icon: "🏢" },
  { value: "kuafor", label: "Kuaför", icon: "💇" },
  { value: "berber", label: "Berber", icon: "💈" },
  { value: "guzellik", label: "Güzellik Merkezi", icon: "💅" },
  { value: "spa", label: "Spa", icon: "🧖" },
  { value: "nail", label: "Nail Studio", icon: "💎" },
  { value: "spor", label: "Spor / PT", icon: "🏋️" },
  { value: "saglik", label: "Sağlık", icon: "🩺" },
  { value: "danismanlik", label: "Danışmanlık", icon: "📋" },
  { value: "veteriner", label: "Veteriner", icon: "🐾" },
  { value: "yazilim", label: "Yazılım", icon: "💻" },
  { value: "egitim", label: "Eğitim", icon: "📚" },
  { value: "servis", label: "Servis / Teknik", icon: "🔧" },
  { value: "diger", label: "Diğer", icon: "📦" },
];

const CATEGORY_VISUALS: Record<string, string> = {
  "": "/images/categories/guzellik.png",
  kuafor: "/images/categories/kuafor.png",
  berber: "/images/categories/berber.png",
  guzellik: "/images/categories/guzellik.png",
  spa: "/images/categories/spa.png",
  nail: "/images/categories/nail.png",
  spor: "/images/categories/spor.png",
  saglik: "/images/categories/saglik.png",
  danismanlik: "/images/categories/danismanlik.png",
  veteriner: "/images/categories/veteriner.png",
  yazilim: "/images/categories/yazilim.png",
};

const EMPTY_FACETS: DiscoveryFacets = { categoryCounts: {}, categoryCovers: {}, cities: [], totalBusinesses: 0 };

export function DiscoverInteractive() {
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [facets, setFacets] = useState<DiscoveryFacets>(EMPTY_FACETS);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<"recommended" | "rating" | "reviews" | "name">("recommended");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [resultLimit, setResultLimit] = useState(24);
  const [urlReady, setUrlReady] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");
    const requestedSearch = params.get("q");
    const requestedCity = params.get("city");
    const requestedSort = params.get("sort");
    if (requestedCategory) queueMicrotask(() => setCategory(requestedCategory));
    if (requestedSearch) queueMicrotask(() => {
      const safeSearch = requestedSearch.slice(0, 100);
      setKeyword(safeSearch);
      setDebouncedKeyword(safeSearch.trim());
    });
    if (requestedCity) queueMicrotask(() => setCity(requestedCity));
    if (["recommended", "rating", "reviews", "name"].includes(requestedSort ?? "")) queueMicrotask(() => setSort(requestedSort as typeof sort));
    if (params.get("verified") === "1") queueMicrotask(() => setVerifiedOnly(true));
    queueMicrotask(() => setUrlReady(true));
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (key: string, value: string) => value ? params.set(key, value) : params.delete(key);
    setOrDelete("q", debouncedKeyword);
    setOrDelete("category", category);
    setOrDelete("city", city);
    setOrDelete("sort", sort === "recommended" ? "" : sort);
    setOrDelete("verified", verifiedOnly ? "1" : "");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`);
  }, [category, city, debouncedKeyword, sort, urlReady, verifiedOnly]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("seninrandevun-compare") ?? "[]") as unknown;
      if (Array.isArray(saved)) queueMicrotask(() => setCompareIds(saved.filter((id): id is string => typeof id === "string").slice(0, 3)));
    } catch { /* Ignore malformed local preference. */ }
  }, []);

  useEffect(() => { window.localStorage.setItem("seninrandevun-compare", JSON.stringify(compareIds)); }, [compareIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 260);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.key === "/" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) &&
        !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  // Fetch dynamic categories
  useEffect(() => {
    listDynamicCategories().then((dynamic: DynamicCategory[]) => {
      const existing = new Set(DEFAULT_CATEGORIES.map((c) => c.value));
      const merged = [...DEFAULT_CATEGORIES.filter((c) => c.value !== "diger")];
      dynamic.forEach((dc) => {
        const canonicalSlug = canonicalBusinessCategory(dc.slug);
        if (!existing.has(canonicalSlug)) {
          existing.add(canonicalSlug);
          merged.push({ value: canonicalSlug, label: dc.label, icon: dc.emoji, imageUrl: dc.imageUrl });
        }
      });
      merged.push({ value: "diger", label: "Diğer", icon: "📦" });
      setCategories(merged);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDiscoveryFacets()
      .then((nextFacets) => { if (!cancelled) setFacets(nextFacets); })
      .catch(() => { if (!cancelled) setFacets(EMPTY_FACETS); })
      .finally(() => { if (!cancelled) setFacetsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setLoadError(false); } });

    searchBusinesses({
      searchText: debouncedKeyword || undefined,
      category: category || undefined,
      city: city || undefined,
      maxResults: resultLimit,
    })
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch(() => {
        if (!cancelled) { setResults([]); setLoadError(true); }
      })
      .finally(() => {
        if (!cancelled) { setLoading(false); setHasLoaded(true); }
      });

    return () => { cancelled = true; };
  }, [debouncedKeyword, category, city, resultLimit, retryKey]);

  function clearFilters() {
    setKeyword("");
    setCategory("");
    setCity("");
    setVerifiedOnly(false);
    setSort("recommended");
    setResultLimit(24);
  }

  function updateKeyword(value: string) {
    setKeyword(value);
    setResultLimit(24);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setResultLimit(24);
  }

  function updateCity(value: string) {
    setCity(value);
    setResultLimit(24);
  }

  const visibleResults = useMemo(() => {
    const rows = verifiedOnly ? results.filter((business) => business.isVerified) : [...results];
    if (sort === "recommended") rows.sort((a, b) => {
      const score = (business: Business) => (business.rating ?? 0) * 18 + Math.log10((business.reviewCount ?? 0) + 1) * 8 + (business.isVerified ? 6 : 0) + (business.coverUrl ? 2 : 0);
      return score(b) - score(a);
    });
    if (sort === "rating") rows.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "reviews") rows.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return rows;
  }, [results, sort, verifiedOnly]);

  const availableCategories = useMemo(
    () => categories.filter((item) => item.value === "" || (facets.categoryCounts[item.value] ?? 0) > 0),
    [categories, facets.categoryCounts]
  );
  const activeFilterCount = Number(Boolean(keyword)) + Number(Boolean(category)) + Number(Boolean(city)) + Number(verifiedOnly) + Number(sort !== "recommended");
  const initialLoading = loading && !hasLoaded;
  const refreshing = loading && hasLoaded;

  const compared = useMemo(() => compareIds.map((id) => results.find((item) => item.id === id)).filter((item): item is Business => Boolean(item)), [compareIds, results]);
  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  }

  return (
    <>
      <section className="discover-search-panel discover-command-center mb-8" aria-label="İşletme keşfetme ve filtreleme" aria-busy={loading}>
        <div className="discover-command-glow" aria-hidden="true" />
        <header className="discover-command-head">
          <div>
            <span className="discover-command-kicker"><Sparkles size={14} /> AKILLI KEŞİF</span>
            <h2>Doğru hizmeti <em>daha hızlı</em> bul.</h2>
            <p>Yalnızca yayında, eksiksiz ve randevuya hazır işletmeler arasında ara.</p>
          </div>
          <aside className="discover-command-badges">
            <span><i /> Canlı sonuçlar</span>
            <span><BadgeCheck size={14} /> Gerçek işletmeler</span>
          </aside>
        </header>

        <div className="discover-command-search">
          <span className="discover-command-search__icon"><Search size={22} /></span>
          <label htmlFor="discover-search-input">
            <small>NE ARIYORSUN?</small>
            <input
              ref={searchInputRef}
              id="discover-search-input"
              type="search"
              placeholder="Berber, kuaför, güzellik merkezi veya hizmet ara..."
              value={keyword}
              maxLength={100}
              onChange={(event) => updateKeyword(event.target.value)}
              autoComplete="off"
            />
          </label>
          {keyword && <button type="button" className="discover-command-search__clear" onClick={() => { updateKeyword(""); searchInputRef.current?.focus(); }} aria-label="Aramayı temizle"><X size={17} /></button>}
          <kbd>⌘ K</kbd>
          <div className={`discover-command-search__state ${refreshing ? "is-searching" : ""}`} aria-live="polite">
            <span /> {loadError ? "Bağlantı sorunu" : refreshing ? "Eşleştiriliyor" : `${visibleResults.length} sonuç`}
          </div>
        </div>

        {facetsLoading ? (
          <div className="discover-category-skeleton" aria-label="Kategoriler yükleniyor">{Array.from({ length: 5 }).map((_, index) => <span key={index} />)}</div>
        ) : (
          <CategoryRail categories={availableCategories} value={category} onChange={updateCategory} counts={facets.categoryCounts} covers={facets.categoryCovers ?? {}} total={facets.totalBusinesses} />
        )}

        <div className="discover-command-toolbar">
          <span className="discover-command-toolbar__title"><SlidersHorizontal size={15} /> Filtrele</span>
          <label className="discover-command-select"><MapPin size={15} /><span><small>KONUM</small><select value={city} onChange={(event) => updateCity(event.target.value)} aria-label="Şehir seç"><option value="">Tüm şehirler</option>{facets.cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></span><ChevronDown size={14}/></label>
          <label className="discover-command-select"><Sparkles size={15} /><span><small>SIRALAMA</small><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="İşletmeleri sırala"><option value="recommended">Önerilen</option><option value="rating">Puana göre</option><option value="reviews">Yorum sayısı</option><option value="name">İsme göre</option></select></span><ChevronDown size={14}/></label>
          <button type="button" onClick={() => setVerifiedOnly((value) => !value)} aria-pressed={verifiedOnly} className={`discover-command-verified ${verifiedOnly ? "active" : ""}`}><BadgeCheck size={16}/><span><small>GÜVEN FİLTRESİ</small><strong>{verifiedOnly ? "Yalnızca doğrulanmış" : "Tüm işletmeler"}</strong></span><i /></button>
          <div className="discover-command-summary" aria-live="polite"><strong>{loading ? "—" : visibleResults.length}</strong><span>işletme<br/>bulundu</span></div>
        </div>

        {activeFilterCount > 0 && <div className="discover-active-filters"><span>{activeFilterCount} aktif filtre</span>{keyword && <button type="button" onClick={() => updateKeyword("")}>“{keyword}” <X size={12}/></button>}{category && <button type="button" onClick={() => updateCategory("")}>{categories.find((item) => item.value === category)?.label ?? category} <X size={12}/></button>}{city && <button type="button" onClick={() => updateCity("")}>{city} <X size={12}/></button>}<button type="button" className="discover-active-filters__clear" onClick={clearFilters}>Tümünü temizle</button></div>}
        {refreshing && <div className="discover-command-loading" aria-hidden="true"><span /></div>}
      </section>

      <div className="discover-results-head"><div><span>SEÇİLMİŞ İŞLETMELER</span><h2>{category ? categories.find((item) => item.value === category)?.label : "Sana uygun yerler"}</h2></div><p><UsersRound size={16} /> Yayındaki işletmeler, kolay randevu deneyimi</p></div>

      {/* Results */}
      {initialLoading ? (
        <LoadingState title="İşletmeler yükleniyor" description="Lütfen bekleyin..." />
      ) : loadError ? (
        <ErrorState
          title="İşletmelere ulaşılamadı"
          description="Bağlantını kontrol edip yeniden deneyebilirsin."
          action={<button type="button" onClick={() => setRetryKey((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800"><RefreshCw size={15} /> Yeniden dene</button>}
        />
      ) : visibleResults.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Arama alanını veya filtrelerini temizleyerek diğer işletmelere göz atabilirsin."
          action={(keyword || category || city) ? <button type="button" onClick={clearFilters} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Filtreleri temizle</button> : undefined}
        />
      ) : (
        <div className={`discover-results grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${refreshing ? "is-refreshing" : ""}`}>
          {visibleResults.map((biz, index) => (
            <article key={biz.id} style={{ "--discover-index": Math.min(index, 12) } as CSSProperties} className="discover-card group relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-md shadow-[var(--shadow-soft)] transition hover:shadow-xl hover:border-[var(--accent)]/30 hover:-translate-y-0.5">
            <Link href={`/isletme/${biz.slug}`} className="block">
              {/* Cover */}
              <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-[var(--surface-3)]">
                {biz.coverUrl ? (
                  <Image
                    src={biz.coverUrl}
                    alt={biz.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--accent)/10,var(--accent-2)/10)]">
                    <span className="text-5xl font-bold text-[var(--accent)]/10">{biz.name.charAt(0)}</span>
                  </div>
                )}
                {biz.isVerified && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    <BadgeCheck size={12} /> Doğrulanmış
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-[var(--text-1)] group-hover:text-[var(--accent)] transition">
                      {biz.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-3)]">
                      {biz.district && biz.city
                        ? `${biz.district}, ${biz.city}`
                        : biz.city || ""}
                    </p>
                  </div>
                  {(biz.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1">
                  <Star className="fill-current" size={12} />
                      <span className="text-xs font-bold text-amber-600">
                        {(biz.rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {(biz.reviewCount ?? 0) === 0 && <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700">Yeni</span>}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--accent)]/5 px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                    {categories.find((item) => item.value === biz.category)?.label ?? biz.category}
                  </span>
                  {(biz.reviewCount ?? 0) > 0 && (
                    <span className="text-[10px] text-[var(--text-3)]">
                      {biz.reviewCount} yorum
                    </span>
                  )}
                </div>
                {biz.matchedServiceName && <p className="discover-card-service"><Sparkles size={11}/> Hizmet eşleşmesi: <b>{biz.matchedServiceName}</b></p>}
              </div>
            </Link>
            <Link href={`/isletme/${biz.slug}/randevu`} className="discover-book-button">Randevu al <ChevronRight size={13}/></Link>
            <button type="button" onClick={() => toggleCompare(biz.id)} aria-pressed={compareIds.includes(biz.id)} className={`discover-compare-button ${compareIds.includes(biz.id) ? "active" : ""}`} disabled={!compareIds.includes(biz.id) && compareIds.length >= 3}>{compareIds.includes(biz.id) ? <Check size={13}/> : <Scale size={13}/>} {compareIds.includes(biz.id) ? "Eklendi" : "Karşılaştır"}</button>
            </article>
          ))}
        </div>
      )}
      {!initialLoading && !loadError && results.length >= resultLimit && resultLimit < 100 && <div className="discover-results-more"><button type="button" onClick={() => setResultLimit((current) => Math.min(100, current + 24))}>Daha fazla işletme göster <ChevronDown size={15}/></button></div>}
      {compareIds.length > 0 && <div className="compare-dock"><div><span><Scale size={18}/></span><div><b>Karşılaştırma listen</b><small>{compareIds.length}/3 işletme seçildi</small></div></div><div className="compare-dock-items">{compareIds.map((id) => { const item = results.find((business) => business.id === id); return <span key={id}>{item?.name ?? "Seçili işletme"}<button type="button" onClick={() => toggleCompare(id)} aria-label="Karşılaştırmadan çıkar"><X size={12}/></button></span>; })}</div><button type="button" onClick={() => setComparisonOpen(true)} disabled={compared.length < 2}>Karşılaştır <ChevronRight size={15}/></button></div>}
      {comparisonOpen && <ComparisonModal businesses={compared} onClose={() => setComparisonOpen(false)} onRemove={toggleCompare}/>}
    </>
  );
}

function ComparisonModal({ businesses, onClose, onRemove }: { businesses: Business[]; onClose: () => void; onRemove: (id: string) => void }) {
  const rows = [
    { label: "Müşteri puanı", render: (business: Business) => business.reviewCount ? `${(business.rating ?? 0).toFixed(1)} / 5` : "Henüz puan yok" },
    { label: "Yorum", render: (business: Business) => `${business.reviewCount ?? 0} değerlendirme` },
    { label: "Konum", render: (business: Business) => `${business.district}, ${business.city}` },
    { label: "Kategori", render: (business: Business) => canonicalBusinessCategory(business.category) },
    { label: "Güven", render: (business: Business) => business.isVerified ? "Doğrulanmış işletme" : "Standart profil" },
    { label: "Randevu değişikliği", render: (business: Business) => business.allowReschedule === false ? "Kapalı" : "Kullanılabilir" },
    { label: "İptal", render: (business: Business) => business.allowCancellation === false ? "Kapalı" : "Kullanılabilir" },
  ];
  return <div className="comparison-overlay" role="dialog" aria-modal="true" aria-label="İşletme karşılaştırması" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="comparison-modal"><header><div><span><Scale size={15}/> AKILLI KARŞILAŞTIRMA</span><h2>Doğru işletmeyi yan yana seç.</h2><p>Önemli bilgileri tek bakışta karşılaştır ve sana uygun yerden randevunu oluştur.</p></div><button type="button" onClick={onClose} aria-label="Karşılaştırmayı kapat"><X/></button></header><div className="comparison-table"><div className="comparison-row comparison-head"><b>Özellik</b>{businesses.map((business) => <article key={business.id}>{business.logoUrl ? <Image src={business.logoUrl} alt="" width={46} height={46}/> : <span>{business.name.charAt(0)}</span>}<div><strong>{business.name}</strong><small>{business.district}</small></div><button type="button" onClick={() => onRemove(business.id)} aria-label={`${business.name} işletmesini çıkar`}><X size={12}/></button></article>)}</div>{rows.map((row) => <div className="comparison-row" key={row.label}><b>{row.label}</b>{businesses.map((business) => <span key={business.id}>{row.render(business)}</span>)}</div>)}</div><footer>{businesses.map((business) => <Link key={business.id} href={`/isletme/${business.slug}/randevu`}>{business.name} için randevu al <ChevronRight size={14}/></Link>)}</footer></section></div>;
}

function CategoryRail({ categories, value, onChange, counts, covers = {}, total }: { categories: DiscoveryCategory[]; value: string; onChange: (value: string) => void; counts: Record<string, number>; covers?: Record<string, string>; total: number }) {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0, pointerId: -1 });
  const [edges, setEdges] = useState({ left: false, right: true });
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = Math.max(1, rail.scrollWidth - rail.clientWidth);
    setEdges({ left: rail.scrollLeft > 4, right: rail.scrollLeft < maxScroll - 4 });
    setProgress(Math.min(100, Math.max(0, (rail.scrollLeft / maxScroll) * 100)));
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [categories, updateEdges]);

  useEffect(() => {
    const index = categories.findIndex((item) => item.value === value);
    const target = index >= 0 ? railRef.current?.children.item(index) : null;
    if (target instanceof HTMLElement) target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [categories, value]);

  function scroll(direction: -1 | 1) { railRef.current?.scrollBy({ left: direction * Math.max(280, railRef.current.clientWidth * .72), behavior: "smooth" }); }
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = { active: true, moved: false, startX: event.clientX, scrollLeft: rail.scrollLeft, pointerId: event.pointerId };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!drag.current.active || !rail || drag.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(distance) > 7) {
      drag.current.moved = true;
      setIsDragging(true);
      rail.setPointerCapture(event.pointerId);
    }
    if (!drag.current.moved) return;
    event.preventDefault();
    rail.scrollLeft = drag.current.scrollLeft - distance;
  }
  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (drag.current.pointerId !== event.pointerId) return;
    drag.current.active = false;
    setIsDragging(false);
    if (rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { drag.current.moved = false; }, 0);
  }
  function onWheel(event: WheelEvent<HTMLDivElement>) { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); event.currentTarget.scrollLeft += event.deltaY; } }

  const categoryVisuals = categories
    .filter((item) => item.value)
    .map((item) => item.imageUrl || covers[item.value] || CATEGORY_VISUALS[item.value])
    .filter((item): item is string => Boolean(item));
  const compact = categories.length <= 4;

  return <div className={`category-showcase ${compact ? "is-compact" : ""}`}>
    <div className="category-showcase-head">
      <div><span>CANLI KATEGORİLER</span><strong>Deneyimini seç, uygun işletmeleri anında gör.</strong></div>
      <p><i /> {Math.max(0, categories.length - 1)} aktif kategori {!compact && <b>Kaydırarak keşfet <ChevronRight size={13}/></b>}</p>
    </div>
    <div className="category-showcase-body">
      <div className={`category-carousel ${edges.left ? "can-left" : ""} ${edges.right ? "can-right" : ""}`}>
        <button type="button" className="category-arrow category-arrow--left" onClick={() => scroll(-1)} disabled={!edges.left} aria-label="Önceki kategoriler"><ChevronLeft size={20} /></button>
        <div ref={railRef} className={`discover-category-rail ${isDragging ? "is-dragging" : ""}`} onScroll={updateEdges} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          {categories.map((cat, categoryIndex) => {
            const visual = cat.imageUrl || covers[cat.value] || CATEGORY_VISUALS[cat.value] || categoryVisuals[0];
            const active = value === cat.value;
            const count = cat.value ? (counts[cat.value] ?? 0) : total;
            return <button key={cat.value} type="button" aria-pressed={active} aria-label={`${cat.label}, ${count} işletme`} onClick={() => { if (!drag.current.moved) onChange(cat.value); }} className={`discover-category-card ${active ? "active" : ""}`}>
              <figure>
                {cat.value === "" && categoryVisuals.length > 1 ? <span className="discover-category-mosaic">{categoryVisuals.slice(0, 3).map((src) => <Image key={src} src={src} alt="" width={220} height={130} sizes="(max-width: 640px) 120px, 220px" loading="eager" />)}</span> : visual ? <Image src={visual} alt="" fill sizes="(max-width: 640px) 160px, 260px" loading={categoryIndex < 2 ? "eager" : "lazy"} /> : <span>{cat.icon}</span>}
                <i aria-hidden="true" />
              </figure>
              <span className="discover-category-card-copy"><small>{cat.value ? "KATEGORİ" : "TÜM DENEYİMLER"}</small><strong>{cat.label}</strong><em>{active ? "Seçildi" : `${count} işletme`}</em></span>
              <b className="discover-category-card-icon">{cat.icon}</b>
            </button>;
          })}
        </div>
        <button type="button" className="category-arrow category-arrow--right" onClick={() => scroll(1)} disabled={!edges.right} aria-label="Sonraki kategoriler"><ChevronRight size={20} /></button>
        <div className="category-carousel-progress" aria-hidden="true"><span style={{ width: `${Math.max(12, progress)}%` }} /></div>
      </div>
      {compact && <aside className="category-showcase-insight"><span><Sparkles size={14}/> CANLI EŞLEŞTİRME</span><strong><b>{total}</b> randevuya hazır işletme</strong><p>Eksik veya boş kategoriler gösterilmez. Yeni aktif işletmeler eklendikçe bu vitrin otomatik güncellenir.</p><div><BadgeCheck size={14}/> Doğrulanmış içerik <i/><UsersRound size={14}/> Anlık veri</div></aside>}
    </div>
  </div>;
}
