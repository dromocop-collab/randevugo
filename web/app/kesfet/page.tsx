"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchBusinesses } from "@/features/discovery/search-repository";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import { EmptyState, LoadingState } from "@/components/ui/states";
import type { Business } from "@/types/business";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";

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
  { value: "egitim", label: "Eğitim", icon: "📚" },
  { value: "servis", label: "Servis / Teknik", icon: "🔧" },
  { value: "diger", label: "Diğer", icon: "📦" },
];

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

  return (
    <div className="marketing-page discover-v2 min-h-screen">
      <MarketingHeader />

      <main className="discover-main mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
        {/* Hero */}
        <div className="discover-hero mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-1.5 text-xs font-semibold text-[var(--accent)]">
            🔍 Keşfet
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text-1)] md:text-4xl">
            İşletme & Hizmet Keşfet
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[var(--text-3)]">
            Binlerce işletme arasından size en uygun olanı bulun ve anında randevu alın.
          </p>
        </div>

        {/* Search */}
        <div className="discover-search-panel mb-8 space-y-4">
          <div className="relative">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Berber, kuaför, güzellik merkezi veya hizmet ara..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-3.5 pl-12 pr-4 text-sm text-[var(--text-1)] placeholder-[var(--text-3)] shadow-lg shadow-[var(--shadow-soft)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          {/* Category Pills */}
          <div className="discover-category-rail flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 ${
                  category === cat.value
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-sky-500/20 scale-105"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-[var(--accent)]/50 hover:shadow-md"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* City + Info */}
          <div className="flex items-center gap-3">
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
            <p className="text-sm text-[var(--text-3)]">
              {loading ? "Aranıyor..." : `${results.length} işletme bulundu`}
            </p>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <LoadingState title="İşletmeler yükleniyor" description="Lütfen bekleyin..." />
        ) : results.length === 0 ? (
          <EmptyState
            title="Sonuç bulunamadı"
            description="Filtrelerinizi değiştirip tekrar deneyin."
          />
        ) : (
          <div className="discover-results grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((biz) => (
              <Link
                key={biz.id}
                href={`/isletme/${biz.slug}`}
                className="discover-card group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-md shadow-[var(--shadow-soft)] transition hover:shadow-xl hover:border-[var(--accent)]/30 hover:-translate-y-0.5"
              >
                {/* Cover */}
                <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-[var(--surface-3)]">
                  {biz.coverUrl ? (
                    <img
                      src={biz.coverUrl}
                      alt={biz.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--accent)/10,var(--accent-2)/10)]">
                      <span className="text-5xl font-bold text-[var(--accent)]/10">{biz.name.charAt(0)}</span>
                    </div>
                  )}
                  {biz.status === "active" && (biz.rating ?? 0) >= 4.5 && (
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
                        <span className="text-xs">⭐</span>
                        <span className="text-xs font-bold text-amber-600">
                          {(biz.rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-full bg-[var(--accent)]/5 px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      {biz.category}
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
