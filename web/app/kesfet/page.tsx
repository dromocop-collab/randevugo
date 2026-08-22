"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { searchBusinesses } from "@/features/discovery/search-repository";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { EmptyState, LoadingState } from "@/components/ui/states";
import type { Business } from "@/types/business";
import { getDemoStorefrontByCategory, isDemoBusiness } from "@/lib/demo-storefronts";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarCheck2, ChevronLeft, ChevronRight, MapPin, Search, ShieldCheck, Sparkles, Star, UsersRound } from "lucide-react";

const DEFAULT_CATEGORIES = [
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

const ALL_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara",
  "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman",
  "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne",
  "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun",
  "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri",
  "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya",
  "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde",
  "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt",
  "Sinop", "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli",
  "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

export default function DiscoverPage() {
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (requestedCategory) queueMicrotask(() => setCategory(requestedCategory));
  }, []);

  // Fetch dynamic categories
  useEffect(() => {
    listDynamicCategories().then((dynamic: DynamicCategory[]) => {
      const existing = new Set(DEFAULT_CATEGORIES.map((c) => c.value));
      const merged = [...DEFAULT_CATEGORIES.filter((c) => c.value !== "diger")];
      dynamic.forEach((dc) => {
        if (!existing.has(dc.slug)) {
          merged.push({ value: dc.slug, label: dc.label, icon: dc.emoji });
        }
      });
      merged.push({ value: "diger", label: "Diğer", icon: "📦" });
      setCategories(merged);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });

    searchBusinesses({
      searchText: keyword.trim() || undefined,
      category: category || undefined,
      city: city || undefined,
      maxResults: 50,
    })
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [keyword, category, city]);

  const demoStorefront = !loading && results.length === 0 && category && !keyword.trim() && !city
    ? getDemoStorefrontByCategory(category)
    : null;
  const visibleResults = demoStorefront ? [demoStorefront.business] : results;

  return (
    <div className="marketing-page discover-v2 min-h-screen">
      <MarketingHeader />

      <main className="discover-main mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
        {/* Hero */}
        <div className="discover-hero mb-10">
          <div className="discover-hero-copy">
            <div className="discover-eyebrow"><Sparkles size={14} /> Sana özel keşif</div>
            <h1>İyi hissettiren<br /><em>hizmeti keşfet.</em></h1>
            <p>Yakınındaki güvenilir işletmeleri, gerçek müşteri puanlarını ve sana uygun hizmetleri tek yerde bul. Kararını ver, randevunu saniyeler içinde al.</p>
            <div className="discover-trust-row"><span><ShieldCheck size={15} /> Güvenilir işletmeler</span><span><Star size={15} /> Gerçek yorumlar</span><span><CalendarCheck2 size={15} /> 7/24 randevu</span></div>
          </div>
          <aside className="discover-business-portal">
            <div className="business-portal-icon"><BriefcaseBusiness size={23} /></div>
            <span>İŞLETME SAHİPLERİ İÇİN</span>
            <h2>Takviminizi değil,<br />işletmenizi büyütün.</h2>
            <p>Randevu, ekip, müşteri ve gelirinizi tek profesyonel çalışma alanında yönetin.</p>
            <Link href="/ozellikler">İşletme çözümlerini keşfet <ArrowUpRight size={16} /></Link>
            <small><BadgeCheck size={13} /> 14 gün ücretsiz · Kart gerekmez</small>
          </aside>
        </div>

        {/* Search */}
        <div className="discover-search-panel mb-8 space-y-4">
          <div className="discover-search-intro">
            <span><Search size={18} /></span>
            <div><strong>Sana uygun deneyimi bul</strong><small>Hizmet, kategori ve konuma göre profesyonel eşleştirme</small></div>
            <aside><b><Sparkles size={12} /> Akıllı kategori</b><b><BadgeCheck size={12} /> Gerçek mağazalar</b></aside>
          </div>
          <div className="discover-search-field relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              type="search"
              placeholder="Berber, kuaför, güzellik merkezi veya hizmet ara..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-3.5 pl-12 pr-4 text-sm text-[var(--text-1)] placeholder-[var(--text-3)] shadow-lg shadow-[var(--shadow-soft)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <span className="discover-search-shortcut">Hızlı ara</span>
          </div>

          {/* Category Pills */}
          <CategoryRail categories={categories} value={category} onChange={setCategory} />

          {/* City + Info */}
          <div className="discover-filter-footer flex items-center gap-3">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-sm text-[var(--text-1)] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="">Tüm Şehirler</option>
              {ALL_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="discover-result-count text-sm text-[var(--text-3)]">
              {loading ? "Aranıyor..." : demoStorefront ? "1 örnek vitrin" : `${results.length} işletme bulundu`}
            </p>
            <span className="discover-filter-hint"><MapPin size={14} /> Şehrindeki en iyi seçenekleri gösteriyoruz</span>
          </div>
        </div>

        <div className="discover-results-head"><div><span>SEÇİLMİŞ İŞLETMELER</span><h2>{category ? categories.find((item) => item.value === category)?.label : "Sana uygun yerler"}</h2></div><p><UsersRound size={16} /> {demoStorefront ? "Bu kategorinin örnek mağaza ve hizmetlerini incele" : "Gerçek işletmeler, kolay randevu deneyimi"}</p></div>

        {/* Results */}
        {loading ? (
          <LoadingState title="İşletmeler yükleniyor" description="Lütfen bekleyin..." />
        ) : visibleResults.length === 0 ? (
          <EmptyState
            title="Sonuç bulunamadı"
            description="Filtrelerinizi değiştirip tekrar deneyin."
          />
        ) : (
          <div className="discover-results grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleResults.map((biz) => (
              <Link
                key={biz.id}
                href={`/isletme/${biz.slug}`}
                className="discover-card group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-md shadow-[var(--shadow-soft)] transition hover:shadow-xl hover:border-[var(--accent)]/30 hover:-translate-y-0.5"
              >
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
                  {isDemoBusiness(biz) ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
                      ÖRNEK VİTRİN
                    </span>
                  ) : biz.status === "active" && (biz.rating ?? 0) >= 4.5 && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      ✓ Doğrulanmış
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}

function CategoryRail({ categories, value, onChange }: { categories: typeof DEFAULT_CATEGORIES; value: string; onChange: (value: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0, pointerId: -1 });
  const [edges, setEdges] = useState({ left: false, right: true });
  const [isDragging, setIsDragging] = useState(false);

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setEdges({ left: rail.scrollLeft > 4, right: rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 4 });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [categories, updateEdges]);

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

  return <div className={`category-carousel ${edges.left ? "can-left" : ""} ${edges.right ? "can-right" : ""}`}>
    <button type="button" className="category-arrow category-arrow--left" onClick={() => scroll(-1)} disabled={!edges.left} aria-label="Önceki kategoriler"><ChevronLeft size={20} /></button>
    <div ref={railRef} className={`discover-category-rail ${isDragging ? "is-dragging" : ""}`} onScroll={updateEdges} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      {categories.map((cat) => {
        const visual = CATEGORY_VISUALS[cat.value];
        const active = value === cat.value;
        return <button key={cat.value} type="button" aria-pressed={active} onClick={() => { if (!drag.current.moved) onChange(cat.value); }} className={`discover-category-card ${active ? "active" : ""}`}>
          <figure>
            {visual ? <Image src={visual} alt="" fill sizes="150px" /> : <span>{cat.icon}</span>}
            <i aria-hidden="true" />
          </figure>
          <span className="discover-category-card-copy"><small>{cat.value ? "KATEGORİ" : "TÜM DENEYİMLER"}</small><strong>{cat.label}</strong><em>{active ? "Seçildi" : "Hemen keşfet"}</em></span>
          <b className="discover-category-card-icon">{cat.icon}</b>
        </button>;
      })}
    </div>
    <button type="button" className="category-arrow category-arrow--right" onClick={() => scroll(1)} disabled={!edges.right} aria-label="Sonraki kategoriler"><ChevronRight size={20} /></button>
    <div className="category-drag-hint"><ArrowLeft size={11} /> sürükle <ArrowRight size={11} /></div>
  </div>;
}
