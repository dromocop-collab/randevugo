"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BadgeCheck, Check, ChevronDown, ChevronRight, Clock3, Heart, History, MapPin, RefreshCw, Scale, Search, SlidersHorizontal, Sparkles, Star, TrendingUp, X, Zap } from "lucide-react";
import { getDiscoveryFacets, searchBusinesses, type BusinessSearchResult, type DiscoveryFacets } from "@/features/discovery/search-repository";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { addFavoriteBusiness, listFavoriteBusinesses, removeFavoriteBusiness } from "@/features/customers/favorite-repository";
import { useAuth } from "@/hooks/use-auth";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import type { Business } from "@/types/business";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import styles from "./discover.module.css";

interface DiscoveryCategory {
  value: string;
  label: string;
  icon: string;
  imageUrl?: string;
}

type SortKey = "recommended" | "rating" | "reviews" | "name";

const DEFAULT_CATEGORIES: DiscoveryCategory[] = [
  { value: "", label: "Tümü", icon: "✨" },
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

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Önerilen" },
  { value: "rating", label: "En yüksek puan" },
  { value: "reviews", label: "En çok yorum" },
  { value: "name", label: "A → Z" },
];

const POPULAR_SEARCHES = ["Saç kesimi", "Manikür", "Cilt bakımı", "Sakal", "Masaj", "Kaş tasarımı"];
const RECENT_KEY = "sr_discover_recent";
const COMPARE_KEY = "seninrandevun-compare";
const EMPTY_FACETS: DiscoveryFacets = { categoryCounts: {}, categoryCovers: {}, cities: [], totalBusinesses: 0 };

function readRecent(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 6) : [];
  } catch { return []; }
}

function writeRecent(list: string[]) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); } catch { /* depolama kapalı olabilir */ }
}

function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

export function DiscoverInteractive() {
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [facets, setFacets] = useState<DiscoveryFacets>(EMPTY_FACETS);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [resultLimit, setResultLimit] = useState(24);
  const [urlReady, setUrlReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [stuck, setStuck] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsHeadRef = useRef<HTMLDivElement>(null);

  // URL → filtreler (paylaşılabilir keşif linkleri)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSearch = params.get("q");
    const requestedSort = params.get("sort");
    queueMicrotask(() => {
      if (params.get("category")) setCategory(params.get("category") ?? "");
      if (requestedSearch) { const safe = requestedSearch.slice(0, 100); setKeyword(safe); setDebouncedKeyword(safe.trim()); }
      if (params.get("city")) setCity(params.get("city") ?? "");
      if (["recommended", "rating", "reviews", "name"].includes(requestedSort ?? "")) setSort(requestedSort as SortKey);
      if (params.get("verified") === "1") setVerifiedOnly(true);
      setRecent(readRecent());
      setUrlReady(true);
    });
  }, []);

  // Filtreler → URL
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

  // Karşılaştırma listesi cihazda saklanır
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COMPARE_KEY) ?? "[]") as unknown;
      if (Array.isArray(saved)) queueMicrotask(() => setCompareIds(saved.filter((id): id is string => typeof id === "string").slice(0, 3)));
    } catch { /* bozuk tercih yok sayılır */ }
  }, []);
  useEffect(() => { try { window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds)); } catch { /* depolama kapalı olabilir */ } }, [compareIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 260);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  // "/" veya ⌘K ile aramaya odaklan
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

  // Yapışkan arama çubuğu başlığın hemen altında durur
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".marketing-header");
    const apply = () => rootRef.current?.style.setProperty("--sticky-top", `${(header?.offsetHeight ?? 64) + 8}px`);
    apply();
    window.addEventListener("resize", apply);
    const sentinel = sentinelRef.current;
    const observer = sentinel ? new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { rootMargin: `-${(header?.offsetHeight ?? 64) + 9}px 0px 0px 0px` }) : null;
    if (sentinel && observer) observer.observe(sentinel);
    return () => { window.removeEventListener("resize", apply); observer?.disconnect(); };
  }, []);

  useEffect(() => {
    listDynamicCategories().then((dynamic: DynamicCategory[]) => {
      const existing = new Set(DEFAULT_CATEGORIES.map((item) => item.value));
      const merged = [...DEFAULT_CATEGORIES.filter((item) => item.value !== "diger")];
      dynamic.forEach((item) => {
        const slug = canonicalBusinessCategory(item.slug);
        if (!existing.has(slug)) { existing.add(slug); merged.push({ value: slug, label: item.label, icon: item.emoji || "•", imageUrl: item.imageUrl }); }
      });
      merged.push(DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]);
      setCategories(merged);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDiscoveryFacets()
      .then((next) => { if (!cancelled) setFacets(next); })
      .catch(() => { if (!cancelled) setFacets(EMPTY_FACETS); });
    return () => { cancelled = true; };
  }, []);

  // Giriş yapan kullanıcının favorileri kalp durumunu belirler
  useEffect(() => {
    if (!user) { queueMicrotask(() => setFavoriteIds(new Set())); return; }
    let cancelled = false;
    listFavoriteBusinesses(user.uid)
      .then((rows) => { if (!cancelled) setFavoriteIds(new Set(rows.map((row) => row.businessId))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setLoadError(false); } });
    searchBusinesses({ searchText: debouncedKeyword || undefined, category: category || undefined, city: city || undefined, maxResults: resultLimit })
      .then((rows) => { if (!cancelled) setResults(rows); })
      .catch(() => { if (!cancelled) { setResults([]); setLoadError(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); setHasLoaded(true); } });
    return () => { cancelled = true; };
  }, [debouncedKeyword, category, city, resultLimit, retryKey]);

  // Bilgi amaçlı: son aramalar yalnızca bu cihazda tutulur
  useEffect(() => {
    if (debouncedKeyword.length < 2) return;
    const timer = window.setTimeout(() => {
      setRecent((current) => {
        const next = [debouncedKeyword, ...current.filter((item) => item.toLocaleLowerCase("tr") !== debouncedKeyword.toLocaleLowerCase("tr"))].slice(0, 6);
        writeRecent(next);
        return next;
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [debouncedKeyword]);

  function revealResults() {
    window.requestAnimationFrame(() => {
      const target = resultsHeadRef.current;
      if (!target) return;
      const offset = (document.querySelector<HTMLElement>(".marketing-header")?.offsetHeight ?? 64) + 90;
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: "smooth" });
    });
  }

  function applySearch(value: string) {
    setKeyword(value);
    setDebouncedKeyword(value.trim());
    setResultLimit(24);
    setSearchFocused(false);
    searchInputRef.current?.blur();
    revealResults();
  }

  function selectCategory(value: string) {
    setCategory((current) => current === value ? "" : value);
    setResultLimit(24);
  }

  function clearFilters() {
    setKeyword(""); setDebouncedKeyword(""); setCategory(""); setCity(""); setVerifiedOnly(false); setSort("recommended"); setResultLimit(24);
  }

  async function toggleFavorite(business: Business) {
    if (!user) { router.push(`/musteri/giris?next=${encodeURIComponent("/kesfet")}`); return; }
    const isFavorite = favoriteIds.has(business.id);
    setFavoriteIds((current) => { const next = new Set(current); if (isFavorite) next.delete(business.id); else next.add(business.id); return next; });
    try {
      if (isFavorite) await removeFavoriteBusiness(user.uid, business.id);
      else await addFavoriteBusiness(user.uid, business);
    } catch {
      setFavoriteIds((current) => { const next = new Set(current); if (isFavorite) next.add(business.id); else next.delete(business.id); return next; });
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  }

  const visibleResults = useMemo(() => {
    const rows = verifiedOnly ? results.filter((business) => business.isVerified) : [...results];
    const score = (business: Business) => (business.rating ?? 0) * 18 + Math.log10((business.reviewCount ?? 0) + 1) * 8 + (business.isVerified ? 6 : 0) + (business.coverUrl ? 2 : 0);
    if (sort === "recommended") rows.sort((a, b) => score(b) - score(a));
    if (sort === "rating") rows.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "reviews") rows.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return rows;
  }, [results, sort, verifiedOnly]);

  const availableCategories = useMemo(
    () => categories.filter((item) => item.value === "" || (facets.categoryCounts[item.value] ?? 0) > 0 || item.value === category),
    [categories, facets.categoryCounts, category]
  );
  const categoryLabel = (value: string) => categories.find((item) => item.value === value)?.label ?? value;
  const sheetFilterCount = Number(Boolean(city)) + Number(verifiedOnly) + Number(sort !== "recommended");
  const anyFilter = Boolean(debouncedKeyword || category || city || verifiedOnly || sort !== "recommended");
  const initialLoading = loading && !hasLoaded;
  const refreshing = loading && hasLoaded;
  const compared = useMemo(() => compareIds.map((id) => results.find((item) => item.id === id)).filter((item): item is Business => Boolean(item)), [compareIds, results]);
  const showSuggest = searchFocused && keyword.trim().length === 0 && (recent.length > 0 || POPULAR_SEARCHES.length > 0);

  return (
    <div ref={rootRef} className={styles.page}>
      <div ref={sentinelRef} aria-hidden="true" />

      {/* ── Yapışkan arama + filtre ── */}
      <div className={cx(styles.stickyBar, stuck && styles.stuck)}>
        <div className={styles.searchRow}>
          <form
            className={styles.search}
            role="search"
            onSubmit={(event) => { event.preventDefault(); applySearch(keyword); }}
          >
            <Search size={20} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              placeholder="Hizmet, işletme veya semt ara"
              aria-label="Hizmet, işletme veya semt ara"
              value={keyword}
              maxLength={100}
              autoComplete="off"
              onChange={(event) => { setKeyword(event.target.value); setResultLimit(24); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 160)}
            />
            {keyword ? (
              <button type="button" className={styles.iconBtn} onClick={() => { setKeyword(""); searchInputRef.current?.focus(); }} aria-label="Aramayı temizle"><X size={16} /></button>
            ) : <kbd className={styles.kbd} aria-hidden="true">⌘K</kbd>}
            {showSuggest && (
              <div className={styles.suggest} onMouseDown={(event) => event.preventDefault()}>
                {recent.length > 0 && <>
                  <div className={styles.suggestTitle}><span>SON ARAMALARIN</span><button type="button" onClick={() => { setRecent([]); writeRecent([]); }}>Temizle</button></div>
                  <div className={styles.suggestList}>{recent.map((item) => <button key={item} type="button" className={styles.suggestChip} onClick={() => applySearch(item)}><History size={13} /> {item}</button>)}</div>
                </>}
                <div className={styles.suggestTitle}><span>POPÜLER</span></div>
                <div className={styles.suggestList}>{POPULAR_SEARCHES.map((item) => <button key={item} type="button" className={styles.suggestChip} onClick={() => applySearch(item)}><TrendingUp size={13} /> {item}</button>)}</div>
              </div>
            )}
          </form>
          <button type="button" className={styles.filterBtn} onClick={() => setSheetOpen(true)} aria-label={`Filtreler${sheetFilterCount ? `, ${sheetFilterCount} aktif` : ""}`}>
            <SlidersHorizontal size={20} /><span>Filtrele</span>
            {sheetFilterCount > 0 && <i className={styles.filterCount}>{sheetFilterCount}</i>}
          </button>
        </div>

        {/* Kategori çipleri */}
        <div className={styles.chipsWrap}>
          <div className={styles.chips} role="tablist" aria-label="Kategoriler">
            {availableCategories.map((item) => {
              const active = category === item.value;
              const count = item.value ? (facets.categoryCounts[item.value] ?? 0) : facets.totalBusinesses;
              const visual = item.imageUrl || facets.categoryCovers?.[item.value] || CATEGORY_VISUALS[item.value];
              return (
                <button key={item.value || "all"} type="button" role="tab" aria-selected={active} className={cx(styles.chip, active && styles.chipActive)} onClick={() => { if (item.value) selectCategory(item.value); else setCategory(""); }}>
                  <span className={styles.chipMedia}>{visual ? <Image src={visual} alt="" fill sizes="34px" /> : item.icon}</span>
                  {item.label}
                  {count > 0 && <small>{count}</small>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hızlı kısayollar */}
      <div className={styles.quick}>
        <button type="button" className={cx(styles.quickBtn, sort === "rating" && styles.quickOn)} onClick={() => setSort((current) => current === "rating" ? "recommended" : "rating")}><Star size={14} /> En yüksek puan</button>
        <button type="button" className={cx(styles.quickBtn, verifiedOnly && styles.quickOn)} onClick={() => setVerifiedOnly((value) => !value)}><BadgeCheck size={14} /> Doğrulanmış</button>
        <Link href="/simdi-musait" className={styles.quickBtn}><Zap size={14} /> Şimdi müsait</Link>
        <Link href="/siram" className={styles.quickBtn}><Clock3 size={14} /> Canlı sıra</Link>
      </div>

      {/* Sonuç başlığı */}
      <div ref={resultsHeadRef} className={styles.resultsHead}>
        <div>
          <h2>{category ? categoryLabel(category) : debouncedKeyword ? `“${debouncedKeyword}”` : "Sana uygun yerler"}</h2>
          <p className={cx(styles.live, refreshing && styles.busy)} aria-live="polite"><i /> {loadError ? "Bağlantı sorunu" : initialLoading || refreshing ? "Eşleştiriliyor…" : `${visibleResults.length} işletme${city ? ` · ${city}` : ""}`}</p>
        </div>
        <div className={styles.sortInline} role="radiogroup" aria-label="Sıralama">
          {SORT_OPTIONS.map((option) => <button key={option.value} type="button" role="radio" aria-checked={sort === option.value} className={cx(sort === option.value && styles.sortOn)} onClick={() => setSort(option.value)}>{option.label}</button>)}
        </div>
      </div>

      {anyFilter && (
        <div className={styles.activeRow}>
          {debouncedKeyword && <button type="button" className={styles.activeTag} onClick={() => { setKeyword(""); setDebouncedKeyword(""); }}>“{debouncedKeyword}” <X size={12} /></button>}
          {category && <button type="button" className={styles.activeTag} onClick={() => setCategory("")}>{categoryLabel(category)} <X size={12} /></button>}
          {city && <button type="button" className={styles.activeTag} onClick={() => setCity("")}><MapPin size={12} /> {city} <X size={12} /></button>}
          {verifiedOnly && <button type="button" className={styles.activeTag} onClick={() => setVerifiedOnly(false)}><BadgeCheck size={12} /> Doğrulanmış <X size={12} /></button>}
          {sort !== "recommended" && <button type="button" className={styles.activeTag} onClick={() => setSort("recommended")}>{SORT_OPTIONS.find((item) => item.value === sort)?.label} <X size={12} /></button>}
          <button type="button" className={styles.clearAll} onClick={clearFilters}>Tümünü temizle</button>
        </div>
      )}

      {/* Sonuçlar */}
      {initialLoading ? (
        <div className={styles.grid} role="status" aria-label="İşletmeler yükleniyor">{Array.from({ length: 6 }).map((_, index) => <div key={index} className={styles.skeleton}><i /><i /><i /><i /></div>)}</div>
      ) : loadError ? (
        <div className={styles.empty}>
          <RoviMascot size={120} mood="thinking" alt="Rovi bağlantıyı kontrol ediyor" />
          <h3>İşletmelere ulaşamadık</h3>
          <p>Bağlantını kontrol edip yeniden deneyebilirsin.</p>
          <div className={styles.emptyActions}><button type="button" className={cx(styles.pill, styles.pillPrimary)} onClick={() => setRetryKey((value) => value + 1)}><RefreshCw size={15} /> Yeniden dene</button></div>
        </div>
      ) : visibleResults.length === 0 ? (
        <div className={styles.empty}>
          <RoviMascot size={120} mood="thinking" alt="Rovi arıyor" />
          <h3>Bu aramada sonuç çıkmadı</h3>
          <p>Farklı bir hizmet adı dene ya da filtreleri gevşet. Rovi&apos;nin önerileri:</p>
          <div className={styles.emptyActions}>
            {anyFilter && <button type="button" className={cx(styles.pill, styles.pillPrimary)} onClick={clearFilters}>Filtreleri temizle</button>}
            {POPULAR_SEARCHES.slice(0, 3).map((item) => <button key={item} type="button" className={styles.pill} onClick={() => applySearch(item)}>{item}</button>)}
          </div>
        </div>
      ) : (
        <div className={cx(styles.grid, refreshing && styles.refreshing)}>
          {visibleResults.map((business, index) => (
            <BusinessResultCard
              key={business.id}
              business={business}
              index={index}
              categoryLabel={categoryLabel(business.category)}
              favorite={favoriteIds.has(business.id)}
              compared={compareIds.includes(business.id)}
              compareFull={compareIds.length >= 3}
              onFavorite={() => void toggleFavorite(business)}
              onCompare={() => toggleCompare(business.id)}
            />
          ))}
        </div>
      )}

      {!initialLoading && !loadError && results.length >= resultLimit && resultLimit < 100 && (
        <div className={styles.more}><button type="button" className={styles.pill} onClick={() => setResultLimit((current) => Math.min(100, current + 24))}>Daha fazla göster <ChevronDown size={15} /></button></div>
      )}

      {compareIds.length > 0 && <div className="compare-dock"><div><span><Scale size={18} /></span><div><b>Karşılaştırma listen</b><small>{compareIds.length}/3 işletme seçildi</small></div></div><div className="compare-dock-items">{compareIds.map((id) => { const item = results.find((business) => business.id === id); return <span key={id}>{item?.name ?? "Seçili işletme"}<button type="button" onClick={() => toggleCompare(id)} aria-label="Karşılaştırmadan çıkar"><X size={12} /></button></span>; })}</div><button type="button" onClick={() => setComparisonOpen(true)} disabled={compared.length < 2}>Karşılaştır <ChevronRight size={15} /></button></div>}
      {comparisonOpen && <ComparisonModal businesses={compared} onClose={() => setComparisonOpen(false)} onRemove={toggleCompare} />}

      {sheetOpen && (
        <FilterSheet
          cities={facets.cities}
          city={city}
          sort={sort}
          verifiedOnly={verifiedOnly}
          resultCount={visibleResults.length}
          onApply={(next) => { setCity(next.city); setSort(next.sort); setVerifiedOnly(next.verifiedOnly); setResultLimit(24); setSheetOpen(false); revealResults(); }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

function BusinessResultCard({ business, index, categoryLabel, favorite, compared, compareFull, onFavorite, onCompare }: {
  business: BusinessSearchResult;
  index: number;
  categoryLabel: string;
  favorite: boolean;
  compared: boolean;
  compareFull: boolean;
  onFavorite: () => void;
  onCompare: () => void;
}) {
  const rating = business.rating ?? 0;
  const reviews = business.reviewCount ?? 0;
  const location = [business.district, business.city].filter(Boolean).join(", ");
  return (
    <article className={styles.card} style={{ "--i": Math.min(index, 10) } as CSSProperties}>
      <Link href={`/isletme/${business.slug}`} className={styles.cardLink} aria-label={`${business.name} mağazasını aç`} />
      <div className={styles.cover}>
        {business.coverUrl
          ? <Image src={business.coverUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
          : <span className={styles.coverFallback}>{business.name.charAt(0)}</span>}
        <div className={styles.badges}>
          <span className={styles.badge}>{categoryLabel}</span>
          {business.isVerified && <span className={cx(styles.badge, styles.badgeVerified)}><BadgeCheck size={12} /> Doğrulanmış</span>}
        </div>
        <div className={styles.coverFoot}>
          {reviews > 0
            ? <span className={styles.rating}><Star size={13} /> {rating.toFixed(1)} <small>({reviews})</small></span>
            : <span className={styles.newTag}>Yeni</span>}
        </div>
      </div>
      <div className={styles.body}>
        <span className={styles.logo}>{business.logoUrl ? <Image src={business.logoUrl} alt="" fill sizes="52px" /> : business.name.charAt(0)}</span>
        <div style={{ minWidth: 0 }}>
          <h3 className={styles.name}>{business.name}</h3>
          {location && <p className={styles.meta}><MapPin size={13} /> {location}</p>}
        </div>
      </div>
      {business.matchedServiceName && <div className={styles.tags}><span className={cx(styles.tag, styles.tagMatch)}><Sparkles size={11} /> {business.matchedServiceName}</span></div>}
      <div className={styles.actions}>
        <Link href={`/isletme/${business.slug}/randevu`} className={styles.book}>Randevu al <ChevronRight size={16} /></Link>
        <button type="button" className={cx(styles.ghost, favorite && styles.heartOn)} onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? "Favorilerden çıkar" : "Favorilere ekle"}><Heart size={18} /></button>
        <button type="button" className={cx(styles.ghost, compared && styles.ghostOn)} onClick={onCompare} aria-pressed={compared} disabled={!compared && compareFull} aria-label={compared ? "Karşılaştırmadan çıkar" : "Karşılaştırmaya ekle"}>{compared ? <Check size={18} /> : <Scale size={18} />}</button>
      </div>
    </article>
  );
}

function FilterSheet({ cities, city, sort, verifiedOnly, resultCount, onApply, onClose }: {
  cities: string[];
  city: string;
  sort: SortKey;
  verifiedOnly: boolean;
  resultCount: number;
  onApply: (next: { city: string; sort: SortKey; verifiedOnly: boolean }) => void;
  onClose: () => void;
}) {
  const [draftCity, setDraftCity] = useState(city);
  const [draftSort, setDraftSort] = useState(sort);
  const [draftVerified, setDraftVerified] = useState(verifiedOnly);
  const [cityQuery, setCityQuery] = useState("");
  const filteredCities = cities.filter((item) => item.toLocaleLowerCase("tr").includes(cityQuery.toLocaleLowerCase("tr")));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className={styles.sheetBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filtreler">
        <div className={styles.grabber} aria-hidden="true" />
        <header className={styles.sheetHead}><h3>Filtreler</h3><button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Kapat"><X size={18} /></button></header>
        <div className={styles.sheetBody}>
          <div className={styles.group}>
            <b>SIRALAMA</b>
            <div className={styles.options}>{SORT_OPTIONS.map((option) => <button key={option.value} type="button" className={cx(styles.option, draftSort === option.value && styles.optionOn)} onClick={() => setDraftSort(option.value)}>{draftSort === option.value ? <Check size={15} /> : <Sparkles size={15} />} {option.label}</button>)}</div>
          </div>
          <div className={styles.group}>
            <b>KONUM</b>
            {cities.length > 8 && <input className={styles.citySearch} placeholder="Şehir ara" value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} aria-label="Şehir ara" />}
            <div className={styles.cityList}>
              <button type="button" className={cx(styles.option, !draftCity && styles.optionOn)} onClick={() => setDraftCity("")}><MapPin size={15} /> Tüm şehirler</button>
              {filteredCities.map((item) => <button key={item} type="button" className={cx(styles.option, draftCity === item && styles.optionOn)} onClick={() => setDraftCity(item)}><MapPin size={15} /> {item}</button>)}
            </div>
          </div>
          <div className={styles.group}>
            <b>GÜVEN</b>
            <button type="button" className={styles.toggleRow} onClick={() => setDraftVerified((value) => !value)} aria-pressed={draftVerified}>
              <span><strong>Yalnızca doğrulanmış işletmeler</strong><small>Belgeleri platform tarafından kontrol edilenler</small></span>
              <i className={cx(styles.switch, draftVerified && styles.switchOn)} aria-hidden="true" />
            </button>
          </div>
        </div>
        <footer className={styles.sheetFoot}>
          <button type="button" className={styles.pill} onClick={() => { setDraftCity(""); setDraftSort("recommended"); setDraftVerified(false); }}>Sıfırla</button>
          <button type="button" className={cx(styles.pill, styles.pillPrimary)} onClick={() => onApply({ city: draftCity, sort: draftSort, verifiedOnly: draftVerified })}>Göster{draftCity === city && draftSort === sort && draftVerified === verifiedOnly ? ` (${resultCount})` : ""}</button>
        </footer>
      </section>
    </div>
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
  const comparisonStyle = { "--comparison-count": Math.max(1, businesses.length) } as CSSProperties;

  return <div className="comparison-overlay" role="dialog" aria-modal="true" aria-label="İşletme karşılaştırması" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="comparison-modal" style={comparisonStyle}><header><div><span><Scale size={15}/> AKILLI KARŞILAŞTIRMA</span><h2>Doğru işletmeyi yan yana seç.</h2><p>Önemli bilgileri tek bakışta karşılaştır ve sana uygun yerden randevunu oluştur.</p></div><button type="button" onClick={onClose} aria-label="Karşılaştırmayı kapat"><X/></button></header><div className="comparison-table"><div className="comparison-row comparison-head"><b>Özellik</b>{businesses.map((business) => <article key={business.id}>{business.logoUrl ? <Image src={business.logoUrl} alt="" width={46} height={46}/> : <span>{business.name.charAt(0)}</span>}<div><strong>{business.name}</strong><small>{business.district}</small></div><button type="button" onClick={() => onRemove(business.id)} aria-label={`${business.name} işletmesini çıkar`}><X size={12}/></button></article>)}</div>{rows.map((row) => <div className="comparison-row" key={row.label}><b>{row.label}</b>{businesses.map((business) => <span key={business.id}>{row.render(business)}</span>)}</div>)}</div><footer>{businesses.map((business) => <Link key={business.id} href={`/isletme/${business.slug}/randevu`}>{business.name} için randevu al <ChevronRight size={14}/></Link>)}</footer><div className="comparison-mobile-cards">{businesses.map((business) => <article key={business.id}><header>{business.logoUrl ? <Image src={business.logoUrl} alt="" width={48} height={48}/> : <span>{business.name.charAt(0)}</span>}<div><strong>{business.name}</strong><small>{business.district}, {business.city}</small></div><button type="button" onClick={() => onRemove(business.id)} aria-label={`${business.name} işletmesini çıkar`}><X size={15}/></button></header><dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.render(business)}</dd></div>)}</dl><Link href={`/isletme/${business.slug}/randevu`}>Randevu al <ChevronRight size={16}/></Link></article>)}</div></section></div>;
}

