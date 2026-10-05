"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search, ShieldCheck, Sparkles, WifiOff, X } from "lucide-react";
import { SearchBar } from "@/components/discovery/search-bar";
import { FeaturedBusinessCard } from "@/components/home/featured-business-card";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { getDiscoveryFacets, getPopularBusinesses, searchBusinesses } from "@/features/discovery/search-repository";
import type { Business } from "@/types/business";
import { canonicalBusinessCategory } from "@/lib/business-categories";
import styles from "@/components/home/home.module.css";
import { categoryImageFor } from "@/components/marketing/category-catalog";

export type HomeCategory = { slug: string; label: string; emoji: string; tone: string; image?: string; description?: string };

export const DEFAULT_CATEGORIES: HomeCategory[] = [
  { slug: "kuafor", label: "Kuaför", emoji: "✦", tone: "mint", image: "/images/categories/kuafor.png", description: "Kesim, renklendirme ve bakım" },
  { slug: "berber", label: "Berber", emoji: "✂", tone: "blue", image: "/images/categories/berber.png", description: "Saç, sakal ve modern bakım" },
  { slug: "guzellik", label: "Güzellik", emoji: "◇", tone: "rose", image: "/images/categories/guzellik.png", description: "Cilt bakımı ve güzellik ritüelleri" },
  { slug: "spa", label: "Spa & Masaj", emoji: "◌", tone: "sand", image: "/images/categories/spa.png", description: "Rahatlama ve yenilenme" },
  { slug: "nail", label: "Nail Studio", emoji: "◆", tone: "violet", image: "/images/categories/nail.png", description: "Manikür, pedikür ve nail art" },
  { slug: "spor", label: "Spor & PT", emoji: "↗", tone: "lime", image: "/images/categories/spor.png", description: "Sana özel antrenman planları" },
  { slug: "saglik", label: "Sağlık", emoji: "+", tone: "cyan", image: "/images/categories/saglik.png", description: "Uzman sağlık hizmetleri" },
  { slug: "danismanlik", label: "Danışmanlık", emoji: "◎", tone: "amber", image: "/images/categories/danismanlik.png", description: "Doğru uzmanla yeni bir adım" },
  { slug: "veteriner", label: "Veteriner", emoji: "♥", tone: "coral", image: "/images/categories/veteriner.png", description: "Dostların için güvenilir bakım" },
  { slug: "yazilim", label: "Yazılım", emoji: "</>", tone: "blue", image: "/images/categories/yazilim.png", description: "Web, mobil ve dijital çözümler" },
];

/** Gerçek, yayında olan işletmelerden türetilen sayılar (sahte istatistik yok). */
export type HomeStats = { totalBusinesses: number; cityCount: number; categoryCounts: Record<string, number> };

export type HomeInitialData = { businesses: Business[]; cities: string[]; dynamicCategories: DynamicCategory[]; stats?: HomeStats | null };

const STATS_MIN_BUSINESSES = 12;
const QUICK_FALLBACK = ["kuafor", "berber", "guzellik", "nail", "spa"];

function mergeCategories(dynamic: DynamicCategory[]): HomeCategory[] {
  const known = new Set(DEFAULT_CATEGORIES.map((item) => item.slug));
  const additions = dynamic.flatMap((item: DynamicCategory) => {
    const slug = canonicalBusinessCategory(item.slug);
    if (known.has(slug)) return [];
    known.add(slug);
    return [{ slug, label: item.label, emoji: item.emoji || "•", tone: "mint", image: item.imageUrl || categoryImageFor(slug, item.label) }];
  });
  return [...DEFAULT_CATEGORIES, ...additions];
}

// Kaydırılabilir şeritlerin kenarı sert kesilmesin: devamı olan tarafta yumuşak solma gösterilir.
function updateRailEdges(rail: HTMLElement | null) {
  if (!rail) return;
  rail.dataset.atStart = String(rail.scrollLeft <= 8);
  rail.dataset.atEnd = String(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8);
}

function formatCount(value: number) {
  return value.toLocaleString("tr-TR");
}

/**
 * Ana sayfanın etkileşimli kısmı: hero arama alanı, kategori vitrini ve öne çıkan işletmeler.
 * initialData sunucuda hazırlanır: mağaza linkleri ilk HTML'de gelir (arama motorları görür), istemci tekrar yüklemez.
 * Başlık (intro) ve görsel (art) sunucuda çizilip buraya yuva olarak verilir.
 */
export function HomeInteractive({ initialData, intro, art }: { initialData?: HomeInitialData | null; intro?: ReactNode; art?: ReactNode }) {
  const [popular, setPopular] = useState<Business[]>(initialData?.businesses ?? []);
  const [results, setResults] = useState<Business[]>([]);
  const [cities, setCities] = useState<string[]>(initialData?.cities ?? []);
  const [stats, setStats] = useState<HomeStats | null>(initialData?.stats ?? null);
  const [categories, setCategories] = useState<HomeCategory[]>(() => initialData ? mergeCategories(initialData.dynamicCategories) : DEFAULT_CATEGORIES);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [lastQuery, setLastQuery] = useState<{ searchText: string; category: string; city: string }>({ searchText: "", category: "", city: "" });
  const categoryRailRef = useRef<HTMLDivElement>(null);
  const businessRailRef = useRef<HTMLDivElement>(null);

  function scrollRail(rail: HTMLDivElement | null, direction: -1 | 1) {
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(240, rail.clientWidth * 0.85), behavior: "smooth" });
  }

  const loadHomepage = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [businesses, facets, dynamic] = await Promise.all([getPopularBusinesses(8), getDiscoveryFacets(), listDynamicCategories()]);
      setPopular(businesses);
      setCities(facets.cities);
      setStats({ totalBusinesses: facets.totalBusinesses, cityCount: facets.cities.length, categoryCounts: facets.categoryCounts });
      setCategories(mergeCategories(dynamic));
    } catch {
      setErrorMessage("İşletmeler şu anda yüklenemedi. Bağlantını kontrol edip yeniden deneyebilirsin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialData) return;
    queueMicrotask(() => { void loadHomepage(); });
  }, [initialData, loadHomepage]);

  function revealResults() {
    requestAnimationFrame(() => document.querySelector("#magazalar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function runSearch(params: { searchText: string; category: string; city: string }) {
    setLoading(true); setErrorMessage(null); setSearched(true); setActiveCategory(params.category); setLastQuery(params);
    try { setResults(await searchBusinesses({ searchText: params.searchText, category: params.category || undefined, city: params.city || undefined })); }
    catch { setResults([]); setErrorMessage("Arama şu anda tamamlanamadı. Lütfen yeniden dene."); } finally { setLoading(false); }
    revealResults();
  }

  async function selectCategory(category: string) {
    const next = activeCategory === category ? "" : category;
    setActiveCategory(next);
    if (!next) { clearSearch(); return; }
    await runSearch({ searchText: "", category: next, city: "" });
  }

  function clearSearch() {
    setSearched(false); setResults([]); setActiveCategory(""); setErrorMessage(null);
  }

  const visibleBusinesses = useMemo(() => searched ? results : popular, [searched, results, popular]);
  const counts = stats?.categoryCounts ?? {};
  const categoryLabel = (slug: string) => categories.find((item) => item.slug === slug)?.label ?? slug;

  const quickCategories = useMemo(() => {
    const ranked = Object.entries(stats?.categoryCounts ?? {})
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => slug)
      .filter((slug) => categories.some((item) => item.slug === slug));
    const merged = [...ranked, ...QUICK_FALLBACK.filter((slug) => !ranked.includes(slug))];
    return merged.slice(0, 5);
  }, [stats, categories]);

  const activeCategoryCount = Object.values(counts).filter((count) => count > 0).length;
  // Sayılar küçükken (lansman dönemi) güven rozetleri gösterilir; eşik aşılınca gerçek canlı sayılar.
  const hasStats = Boolean(stats && stats.totalBusinesses >= STATS_MIN_BUSINESSES);

  useEffect(() => {
    const sync = () => { updateRailEdges(categoryRailRef.current); updateRailEdges(businessRailRef.current); };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [categories, visibleBusinesses, loading]);

  return <>
    {/* ─── Hero ─── */}
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroBackdrop} aria-hidden="true"><span className={styles.heroGrid} /><span className={`${styles.heroGlow} ${styles.glowA}`} /><span className={`${styles.heroGlow} ${styles.glowB}`} /></div>
      <div className={`${styles.wrap} ${styles.heroInner}`}>
        <div className={styles.heroCopy}>
          {intro}

          <div className={styles.searchCard} role="search" aria-label="İşletme ve hizmet ara">
            <div className={styles.searchHead}><span aria-hidden="true"><Search size={15} /></span><div><strong>Randevuna buradan başla</strong><small>Hizmet, işletme, kategori veya şehir seç</small></div></div>
            <SearchBar onSearch={runSearch} cities={cities} dynamicCategories={categories.slice(DEFAULT_CATEGORIES.length).map(item => ({ value: item.slug, label: item.label }))} className={styles.searchForm} />
          </div>

          <div className={styles.quick}>
            <span className={styles.quickLabel}><Sparkles size={13} aria-hidden="true" /> Popüler</span>
            {quickCategories.map((slug) => <button key={slug} type="button" className={`${styles.quickChip} ${activeCategory === slug ? styles.quickChipActive : ""}`} onClick={() => selectCategory(slug)} aria-pressed={activeCategory === slug}>
              {categoryLabel(slug)}{hasStats && counts[slug] > 0 && <small>{formatCount(counts[slug])}</small>}
            </button>)}
          </div>

          {hasStats && stats ? <dl className={styles.stats} aria-label="SeninRandevun'da şu anda">
            <div><dt>Yayında işletme</dt><dd>{formatCount(stats.totalBusinesses)}</dd></div>
            <div><dt>Şehir</dt><dd>{formatCount(stats.cityCount)}</dd></div>
            <div><dt>Aktif kategori</dt><dd>{formatCount(activeCategoryCount)}</dd></div>
          </dl> : <ul className={styles.trustRow} aria-label="Neden SeninRandevun">
            <li><BadgeCheck size={14} aria-hidden="true" /> Müşteriler için ücretsiz</li>
            <li><ShieldCheck size={14} aria-hidden="true" /> Güvenli randevu</li>
            <li><Clock3 size={14} aria-hidden="true" /> 7/24 online</li>
          </ul>}
        </div>
        {art}
      </div>
    </section>

    {/* ─── Kategori vitrini ─── */}
    <section className={styles.section} id="kategoriler" aria-labelledby="home-categories-title">
      <div className={styles.wrap}>
        <div className={styles.sectionHead} data-reveal="">
          <div><span className={styles.kicker}>KATEGORİLER</span><h2 id="home-categories-title">Bugün neye ihtiyacın var?</h2><p>Bir kategoriye dokun; o alandaki yayında işletmeleri hemen aşağıda gösterelim.</p></div>
          <div className={styles.headActions}>
            <div className={styles.arrows}><button type="button" onClick={() => scrollRail(categoryRailRef.current, -1)} aria-label="Önceki kategoriler"><ChevronLeft size={18} /></button><button type="button" onClick={() => scrollRail(categoryRailRef.current, 1)} aria-label="Sonraki kategoriler"><ChevronRight size={18} /></button></div>
            <Link href="/kategoriler" className={styles.textLink}>Tüm kategoriler <ArrowRight size={15} /></Link>
          </div>
        </div>
      </div>
      <div ref={categoryRailRef} onScroll={(event) => updateRailEdges(event.currentTarget)} className={`${styles.rail} ${styles.categoryRail}`} data-at-start="true" data-at-end="false">
        {categories.slice(0, 16).map((category, index) => {
          const count = counts[category.slug] ?? 0;
          const active = activeCategory === category.slug;
          return <button key={category.slug} type="button" className={`${styles.categoryCard} ${active ? styles.categoryCardActive : ""}`} onClick={() => selectCategory(category.slug)} aria-pressed={active} style={{ "--i": index } as CSSProperties}>
            <span className={styles.categoryMedia}>
              {category.image ? <Image src={category.image} alt="" fill sizes="(max-width: 720px) 62vw, 260px" /> : <b aria-hidden="true">{category.emoji}</b>}
            </span>
            <span className={styles.categoryShade} aria-hidden="true" />
            <span className={styles.categoryCount}>{hasStats && count > 0 ? `${formatCount(count)} işletme` : "Keşfet"}</span>
            <span className={styles.categoryBody}>
              <strong>{category.label}</strong>
              <em>{category.description || "Yakınındaki uzmanları keşfet"}</em>
            </span>
            <span className={styles.categoryGo} aria-hidden="true">{active ? <X size={16} /> : <ArrowUpRight size={17} />}</span>
          </button>;
        })}
      </div>
    </section>

    {/* ─── Öne çıkanlar / arama sonuçları ─── */}
    <section className={`${styles.section} ${styles.businessSection}`} id="magazalar" aria-labelledby="home-business-title" aria-live="polite">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.kicker}>{searched ? "ARAMA SONUÇLARI" : "ÖNE ÇIKAN İŞLETMELER"}</span>
            <h2 id="home-business-title">{searched ? (loading ? "Aranıyor…" : `${visibleBusinesses.length} eşleşme bulundu`) : "Sevilen yerleri keşfet."}</h2>
            {searched && !loading && <p>{[lastQuery.searchText && `“${lastQuery.searchText}”`, lastQuery.category && categoryLabel(lastQuery.category), lastQuery.city].filter(Boolean).join(" · ") || "Tüm işletmeler"}</p>}
            {!searched && <p>Müşterilerin en çok ilgilendiği, randevuya açık işletmeler.</p>}
          </div>
          <div className={styles.headActions}>
            {visibleBusinesses.length > 1 && !loading && <div className={styles.arrows}><button type="button" onClick={() => scrollRail(businessRailRef.current, -1)} aria-label="Önceki işletmeler"><ChevronLeft size={18} /></button><button type="button" onClick={() => scrollRail(businessRailRef.current, 1)} aria-label="Sonraki işletmeler"><ChevronRight size={18} /></button></div>}
            {searched ? <button type="button" className={styles.clearButton} onClick={clearSearch}><X size={14} /> Aramayı temizle</button> : <Link href="/kesfet" className={styles.textLink}>Tümünü keşfet <ArrowRight size={15} /></Link>}
          </div>
        </div>
      </div>

      {loading ? <div className={`${styles.rail} ${styles.businessRail}`} role="status" aria-label="İşletmeler yükleniyor">{[1, 2, 3, 4].map(item => <div key={item} className={styles.skeleton} />)}</div>
        : errorMessage ? <div className={styles.wrap}><div className={styles.empty}><WifiOff size={26} aria-hidden="true" /><h3>Bağlantı kurulamadı.</h3><p>{errorMessage}</p><button type="button" onClick={() => searched ? runSearch(lastQuery) : loadHomepage()}><RefreshCw size={14} /> Yeniden dene</button></div></div>
        : visibleBusinesses.length > 0 ? <div ref={businessRailRef} onScroll={(event) => updateRailEdges(event.currentTarget)} className={`${styles.rail} ${styles.businessRail}`} data-at-start="true" data-at-end="false">
          {visibleBusinesses.slice(0, searched ? 24 : 8).map((business, index) => <FeaturedBusinessCard key={business.id} business={business} index={index} />)}
          {!searched && <Link href="/kesfet" className={styles.moreCard}><span><ArrowUpRight size={22} /></span><strong>Daha fazla işletme</strong><small>Şehrine ve kategorine göre keşfet</small></Link>}
        </div>
        : <div className={styles.wrap}><div className={styles.empty}><Search size={26} aria-hidden="true" /><h3>Şimdilik eşleşme bulamadık.</h3><p>Başka bir kategori, hizmet veya şehir deneyebilirsin.</p><button type="button" onClick={clearSearch}>Öne çıkanlara dön</button></div></div>}
    </section>
  </>;
}
