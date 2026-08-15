"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/discovery/search-bar";
import { BusinessCard } from "@/components/discovery/business-card";
import {
  searchBusinesses,
  getPopularBusinesses,
  getBusinessCities,
} from "@/features/discovery/search-repository";
import { listDynamicCategories, type DynamicCategory } from "@/features/categories/category-request-repository";
import type { Business } from "@/types/business";
import { useTheme } from "@/components/layout/theme-provider";
import { useAuth } from "@/hooks/use-auth";

const DEFAULT_CATEGORIES = [
  { slug: "kuafor", label: "Kuaför", emoji: "💇" },
  { slug: "berber", label: "Berber", emoji: "✂️" },
  { slug: "guzellik", label: "Güzellik Merkezi", emoji: "💅" },
  { slug: "nail", label: "Nail Studio", emoji: "💎" },
  { slug: "spor", label: "Spor", emoji: "🏋️" },
  { slug: "saglik", label: "Sağlık", emoji: "🩺" },
  { slug: "danismanlik", label: "Danışmanlık", emoji: "📋" },
  { slug: "veteriner", label: "Veteriner", emoji: "🐾" },
  { slug: "egitim", label: "Eğitim", emoji: "📚" },
  { slug: "servis", label: "Servis / Teknik", emoji: "🔧" },
];

const STATS = [
  { value: "1000+", label: "İşletme" },
  { value: "50K+", label: "Randevu" },
  { value: "81", label: "Şehir" },
  { value: "4.9/5", label: "Puan" },
];

const FEATURES = [
  {
    icon: "📅",
    title: "Akıllı Takvim",
    desc: "Çakışma olmadan otomatik saat yönetimi. Çalışanlarınız için ayrı takvimler.",
    color: "sky",
  },
  {
    icon: "👥",
    title: "Ekip Yönetimi",
    desc: "Çalışan bazlı randevu ve müsaitlik kontrolü. İzin ve vardiya yönetimi.",
    color: "violet",
  },
  {
    icon: "📊",
    title: "Gelişmiş Analitik",
    desc: "Randevu, gelir ve müşteri analitiği. Gerçek zamanlı dashboard.",
    color: "emerald",
  },
  {
    icon: "🔔",
    title: "Hatırlatma Sistemi",
    desc: "SMS ve e-posta ile otomatik randevu hatırlatmaları. No-show'u azaltın.",
    color: "amber",
  },
  {
    icon: "🌐",
    title: "Online Profil",
    desc: "İşletmenize özel randevu sayfası. Müşterileriniz 7/24 randevu alabilir.",
    color: "rose",
  },
  {
    icon: "🔒",
    title: "Güvenli & Hızlı",
    desc: "Firebase altyapısı ile %99.9 uptime. Verileriniz güvende.",
    color: "teal",
  },
];

const STEPS = [
  {
    step: "01",
    title: "İşletme Bulun",
    desc: "Arama, kategori veya konuma göre binlerce işletme arasından size uygun olanı seçin.",
    icon: "🔍",
  },
  {
    step: "02",
    title: "Hizmet & Saat Seçin",
    desc: "Hizmet, çalışan ve müsait saatleri görün. Size en uygun zamanı seçin.",
    icon: "🕐",
  },
  {
    step: "03",
    title: "Randevunuzu Alın",
    desc: "Tek tıkla randevunuzu oluşturun. Onay ve hatırlatma otomatik gelir.",
    icon: "✅",
  },
];

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const { user, status: authStatus } = useAuth();
  const isLoggedIn = authStatus === "authenticated" && !!user;
  const [results, setResults] = useState<Business[]>([]);
  const [popular, setPopular] = useState<Business[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    Promise.all([
      getPopularBusinesses(8),
      getBusinessCities(),
      listDynamicCategories(),
    ])
      .then(([pop, cit, dynamic]) => {
        setPopular(pop);
        setCities(cit);
        // Merge dynamic categories into defaults (avoid duplicates)
        const existing = new Set(DEFAULT_CATEGORIES.map((c) => c.slug));
        const merged = [...DEFAULT_CATEGORIES];
        dynamic.forEach((dc: DynamicCategory) => {
          if (!existing.has(dc.slug)) {
            merged.push({ slug: dc.slug, label: dc.label, emoji: dc.emoji });
          }
        });
        setCategories(merged);
      })
      .catch(() => {});
  }, []);

  async function handleSearch(params: {
    searchText: string;
    category: string;
    city: string;
  }) {
    setLoading(true);
    setSearched(true);
    try {
      const rows = await searchBusinesses({
        searchText: params.searchText,
        category: params.category || undefined,
        city: params.city || undefined,
      });
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryClick(cat: string) {
    if (activeCategory === cat) {
      setActiveCategory("");
      setSearched(false);
      return;
    }
    setActiveCategory(cat);
    setLoading(true);
    setSearched(true);
    try {
      const rows = await searchBusinesses({ category: cat });
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* ━━━ HEADER ━━━ */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/50 bg-[var(--bg-1)]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition group-hover:shadow-xl group-hover:shadow-sky-500/40 group-hover:scale-105">
              R
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
              Randevu<span className="text-[var(--accent)]">Go</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "/kesfet", label: "Keşfet" },
              { href: "/fiyatlar", label: "Fiyatlar" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 text-sm transition hover:bg-[var(--surface-2)] hover:scale-105"
              title={theme === "light" ? "Karanlık mod" : "Aydınlık mod"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97] flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Panelim
              </Link>
            ) : (
              <>
                <Link
                  href="/giris"
                  className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-2.5 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--surface-2)] sm:inline-flex"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97]"
                >
                  Ücretsiz Başla
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ━━━ HERO ━━━ */}
      <section className="relative overflow-hidden">
        {/* Gradient backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)/10,transparent_60%)]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-[var(--accent-3)]/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:pb-24 sm:pt-32 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              Türkiye&apos;nin #1 akıllı randevu platformu
            </div>

            <h1 className="mt-8 text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-1)] sm:text-5xl lg:text-6xl">
              Randevunuzu{" "}
              <span className="relative">
                <span className="bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">
                  saniyeler içinde
                </span>
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] opacity-30" />
              </span>
              {" "}alın
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-3)] sm:text-lg">
              Binlerce işletme arasından aradığınızı bulun, müsait saatleri
              görün ve anında online randevu oluşturun.
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mt-12 max-w-4xl">
            <SearchBar
              onSearch={handleSearch}
              cities={cities}
              dynamicCategories={categories
                .filter((c) => !["kuafor","berber","guzellik","nail","spor","danismanlik","veteriner","servis","saglik","egitim","diger"].includes(c.slug))
                .map((c) => ({ value: c.slug, label: c.label }))
              }
            />
          </div>

          {/* Categories */}
          <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-200 ${
                  activeCategory === cat.slug
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-sky-500/25 scale-105"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md"
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--text-3)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ RESULTS / POPULAR ━━━ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        {searched ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-1)]">
                {loading ? "Aranıyor..." : `${results.length} sonuç bulundu`}
              </h2>
              <button
                onClick={() => { setSearched(false); setActiveCategory(""); setResults([]); }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
              >
                ✕ Temizle
              </button>
            </div>
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-12 text-center">
                <p className="text-5xl">🔍</p>
                <p className="mt-4 text-lg font-semibold text-[var(--text-1)]">Sonuç bulunamadı</p>
                <p className="mt-2 text-sm text-[var(--text-3)]">
                  Farklı filtreler deneyin veya arama terimini değiştirin.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Popular */}
            {popular.length > 0 && (
              <div className="mb-20">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text-1)]">
                      ⭐ Popüler İşletmeler
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-3)]">En çok tercih edilen işletmeler</p>
                  </div>
                  <Link
                    href="/kesfet"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/5"
                  >
                    Tümünü Gör →
                  </Link>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {popular.map((biz) => (
                    <BusinessCard key={biz.id} business={biz} />
                  ))}
                </div>
              </div>
            )}

            {/* ━━━ FEATURES ━━━ */}
            <div className="mb-20">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Neden RandevuGo?
                </p>
                <h2 className="mt-3 text-2xl font-bold text-[var(--text-1)] sm:text-3xl">
                  İşletmeniz için her şey tek panelde
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--text-3)]">
                  Müşterileriniz 7/24 online randevu alsın. Takvim, çalışan, müşteri ve analiz — hepsi tek yerde.
                </p>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 transition hover:shadow-xl hover:shadow-[var(--shadow-hard)] hover:-translate-y-1"
                  >
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--accent)]/5 blur-2xl transition group-hover:bg-[var(--accent)]/10" />
                    <div className="relative">
                      <span className="text-3xl">{f.icon}</span>
                      <h3 className="mt-4 text-base font-bold text-[var(--text-1)]">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-3)]">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ━━━ HOW IT WORKS ━━━ */}
            <div className="mb-20">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Kolay Kullanım
                </p>
                <h2 className="mt-3 text-2xl font-bold text-[var(--text-1)] sm:text-3xl">
                  3 adımda randevunuzu alın
                </h2>
              </div>
              <div className="mt-10 grid gap-8 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <div key={s.step} className="group relative text-center">
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-80px)] bg-gradient-to-r from-[var(--accent)]/30 to-transparent sm:block" />
                    )}
                    <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,var(--accent)/10,var(--accent-3)/10)] transition group-hover:bg-[linear-gradient(135deg,var(--accent)/20,var(--accent-3)/20)] group-hover:scale-105">
                      <span className="text-3xl">{s.icon}</span>
                      <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-[10px] font-bold text-white shadow-lg">
                        {s.step}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-1)]">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-3)]">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ━━━ CTA ━━━ */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent)/5,var(--accent-3)/5)] p-10 text-center shadow-2xl sm:p-16">
              <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[var(--accent)]/10 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  İşletmenizi büyütün
                </p>
                <h2 className="mt-4 text-2xl font-bold text-[var(--text-1)] sm:text-3xl">
                  Hemen ücretsiz başlayın
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-[var(--text-3)]">
                  14 gün ücretsiz deneyin, kredi kartı gerekmez. 2 dakikada kurulumu tamamlayın.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href={isLoggedIn ? "/dashboard" : "/kayit"}
                    className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition hover:shadow-2xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97]"
                  >
                    {isLoggedIn ? "📊 Panelime Git" : "🚀 Ücretsiz Başla"}
                  </Link>
                  <Link
                    href="/fiyatlar"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-8 py-3.5 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--surface-2)]"
                  >
                    Fiyatları İncele
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-1)]">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-sm font-bold text-white shadow-lg shadow-sky-500/25">
                  R
                </span>
                <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
                  Randevu<span className="text-[var(--accent)]">Go</span>
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--text-3)]">
                Türkiye&apos;nin akıllı randevu platformu. İşletmenizi online&apos;a taşıyın,
                müşterileriniz 7/24 randevu alsın.
              </p>
              <div className="mt-5 flex gap-3">
                {["Instagram", "Twitter", "LinkedIn"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-3)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    title={s}
                  >
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                Müşteriler
              </h4>
              <ul className="mt-4 space-y-3">
                <li><Link href="/kesfet" className="text-sm text-[var(--text-2)] transition hover:text-[var(--accent)]">Keşfet</Link></li>
                <li><Link href="/hesabim" className="text-sm text-[var(--text-2)] transition hover:text-[var(--accent)]">Hesabım</Link></li>
                <li><Link href="/giris" className="text-sm text-[var(--text-2)] transition hover:text-[var(--accent)]">Giriş Yap</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                İşletmeler
              </h4>
              <ul className="mt-4 space-y-3">
                <li><Link href="/fiyatlar" className="text-sm text-[var(--text-2)] transition hover:text-[var(--accent)]">Fiyatlar</Link></li>
                <li><Link href="/kayit" className="text-sm text-[var(--text-2)] transition hover:text-[var(--accent)]">Ücretsiz Başla</Link></li>
                <li><Link href="/dashboard" className="text-sm text-[var(--text-2)] transition hover:text-[var(--accent)]">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                Destek
              </h4>
              <ul className="mt-4 space-y-3">
                <li><span className="text-sm text-[var(--text-2)]">destek@randevugo.com</span></li>
                <li><span className="text-sm text-[var(--text-2)]">0850 XXX XX XX</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-8">
            <p className="text-xs text-[var(--text-3)]">
              © {new Date().getFullYear()} RandevuGo. Tüm hakları saklıdır.
            </p>
            <div className="flex gap-6 text-xs">
              <Link href="/" className="text-[var(--text-3)] transition hover:text-[var(--accent)]">
                Gizlilik Politikası
              </Link>
              <Link href="/" className="text-[var(--text-3)] transition hover:text-[var(--accent)]">
                Kullanım Şartları
              </Link>
              <Link href="/" className="text-[var(--text-3)] transition hover:text-[var(--accent)]">
                KVKK
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
