"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Search, WandSparkles } from "lucide-react";
import { SearchBar } from "@/components/discovery/search-bar";
import { BusinessCard } from "@/components/discovery/business-card";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { getBusinessCities, getPopularBusinesses, searchBusinesses } from "@/features/discovery/search-repository";
import type { Business } from "@/types/business";
import { getDemoStorefrontByCategory } from "@/lib/demo-storefronts";

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

export function HomeInteractive() {
  const [popular, setPopular] = useState<Business[]>([]);
  const [results, setResults] = useState<Business[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>(DEFAULT_CATEGORIES);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    Promise.all([getPopularBusinesses(8), getBusinessCities(), listDynamicCategories()])
      .then(([businesses, cityList, dynamic]) => {
        setPopular(businesses);
        setCities(cityList);
        const known = new Set(DEFAULT_CATEGORIES.map((item) => item.slug));
        const additions = dynamic.filter((item: DynamicCategory) => !known.has(item.slug)).map((item: DynamicCategory) => ({ slug: item.slug, label: item.label, emoji: item.emoji || "•", tone: "mint" }));
        setCategories([...DEFAULT_CATEGORIES, ...additions]);
      }).catch(() => undefined);
  }, []);

  async function runSearch(params: { searchText: string; category: string; city: string }) {
    setLoading(true); setSearched(true); setActiveCategory(params.category);
    try { setResults(await searchBusinesses({ searchText: params.searchText, category: params.category || undefined, city: params.city || undefined })); }
    catch { setResults([]); } finally { setLoading(false); }
    requestAnimationFrame(() => document.querySelector("#magazalar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function selectCategory(category: string) {
    const next = activeCategory === category ? "" : category;
    setActiveCategory(next);
    if (!next) { setSearched(false); setResults([]); return; }
    setLoading(true); setSearched(true);
    try { setResults(await searchBusinesses({ category: next })); } catch { setResults([]); } finally { setLoading(false); }
    requestAnimationFrame(() => document.querySelector("#magazalar")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const demoBusiness = searched && activeCategory && results.length === 0
    ? getDemoStorefrontByCategory(activeCategory)?.business ?? null
    : null;
  const visibleBusinesses = useMemo(() => searched ? (demoBusiness ? [demoBusiness] : results) : popular, [searched, demoBusiness, results, popular]);

  return <>
    {/* ─── Search Area ─── */}
    <div className="customer-search-wrap">
      <div className="customer-search-title"><span><Search size={16} /></span><div><strong>Randevuna buradan başla</strong><small>Hizmet, işletme veya şehir ara</small></div></div>
      <SearchBar onSearch={runSearch} cities={cities} dynamicCategories={categories.slice(DEFAULT_CATEGORIES.length).map(item => ({ value: item.slug, label: item.label }))} className="customer-home-search" />
      <div className="customer-search-note"><span><WandSparkles size={13} /> Popüler aramalar:</span><button onClick={() => selectCategory("kuafor")}>Kuaför</button><button onClick={() => selectCategory("guzellik")}>Cilt bakımı</button><button onClick={() => selectCategory("nail")}>Nail studio</button></div>
    </div>

    {/* ─── Category Grid ─── */}
    <section className="customer-category-section" id="kategoriler">
      <div className="customer-section-heading"><div><span>KATEGORİLER</span><h2>Bugün neye ihtiyacın var?</h2></div><Link href="/kesfet">Tümünü keşfet <ArrowRight size={15} /></Link></div>
      <div className="customer-category-grid">{categories.slice(0, 10).map((category, index) => <button key={category.slug} className={`customer-category-card tone-${category.tone} ${activeCategory === category.slug ? "active" : ""}`} onClick={() => selectCategory(category.slug)} style={{ "--delay": `${index * 65}ms` } as React.CSSProperties}>
        <span className="customer-category-media">{category.image ? <Image src={category.image} alt={`${category.label} hizmetleri`} fill sizes="(max-width: 760px) 100vw, (max-width: 1050px) 50vw, 33vw" /> : <b>{category.emoji}</b>}<i>{String(index + 1).padStart(2, "0")}</i></span>
        <span className="customer-category-body"><small><b>{category.emoji}</b> HEMEN KEŞFET</small><strong>{category.label}</strong><em>{category.description || "Yakınındaki uzmanları keşfet"}</em></span>
        <span className="customer-category-action" aria-hidden="true"><span>İncele</span><ArrowUpRight size={18} /></span>
      </button>)}</div>
    </section>

    {/* ─── Business Results / Popular ─── */}
    <section className="customer-business-section" id="magazalar">
      <div className="customer-section-heading"><div><span>{searched ? "ARAMA SONUÇLARI" : "ÖNE ÇIKAN MAĞAZALAR"}</span><h2>{searched ? `${visibleBusinesses.length} eşleşme bulundu` : "Sevilen yerleri keşfet."}</h2></div>{searched ? <button className="clear-home-search" onClick={() => { setSearched(false); setResults([]); setActiveCategory(""); }}>Aramayı temizle</button> : <Link href="/kesfet">Tüm mağazalar <ArrowRight size={15} /></Link>}</div>
      {loading ? <div className="business-skeletons">{[1,2,3,4].map(item => <div key={item} />)}</div> : visibleBusinesses.length > 0 ? <div className="business-grid">{visibleBusinesses.slice(0,8).map(business => <BusinessCard key={business.id} business={business} />)}</div> : <div className="customer-empty"><Search size={28} /><h3>Şimdilik eşleşme bulamadık.</h3><p>Başka bir kategori, hizmet veya şehir deneyebilirsin.</p><button onClick={() => { setSearched(false); setActiveCategory(""); }}>Popüler mağazalara dön</button></div>}
    </section>
  </>;
}
