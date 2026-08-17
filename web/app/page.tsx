"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useScrollRevealGroup } from "@/hooks/use-scroll-reveal";

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

/* ─── Animated Counter Hook ─── */
function useCountUp(target: string, duration = 2000) {
  const [display, setDisplay] = useState(target);
  const triggered = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const numericPart = target.replace(/[^0-9.]/g, "");
          const suffix = target.replace(/[0-9.]/g, "");
          const end = parseFloat(numericPart);
          if (isNaN(end)) return;

          const isFloat = numericPart.includes(".");
          const startTime = performance.now();

          function animate(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * end;
            setDisplay((isFloat ? current.toFixed(1) : Math.floor(current).toString()) + suffix);
            if (progress < 1) requestAnimationFrame(animate);
          }
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, display };
}

function StatCounter({ value, label }: { value: string; label: string }) {
  const { ref, display } = useCountUp(value, 1800);
  return (
    <div className="text-center">
      <p className="stat-number text-2xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent sm:text-3xl">
        <span ref={ref}>{display}</span>
      </p>
      <p className="mt-1 text-xs font-medium text-[var(--text-3)]">{label}</p>
    </div>
  );
}

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

  const featuresGroupRef = useScrollRevealGroup({ staggerMs: 120 });
  const stepsGroupRef = useScrollRevealGroup({ staggerMs: 200 });
  const popularGroupRef = useScrollRevealGroup({ staggerMs: 80 });

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
      {/* ━━━ TOP BAR ━━━ */}
      <div className="hidden border-b border-[var(--border)]/30 bg-[var(--bg-2)]/60 backdrop-blur-sm sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 lg:px-8">
          <div className="flex items-center gap-5 text-[10px] text-[var(--text-3)]">
            <a href="tel:+905304788298" className="flex items-center gap-1.5 transition hover:text-[var(--accent)]">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              0530 478 82 98
            </a>
            <a href="mailto:info@seninrandevun.com" className="flex items-center gap-1.5 transition hover:text-[var(--accent)]">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              info@seninrandevun.com
            </a>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-3)]">
            <span className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              7/24 Aktif
            </span>
            <span className="h-3 w-px bg-[var(--border)]" />
            <div className="flex gap-2">
              {[
                { name: "Instagram", href: "https://instagram.com/seninrandevun", icon: <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
                { name: "Twitter", href: "https://twitter.com/seninrandevun", icon: <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { name: "LinkedIn", href: "https://linkedin.com/company/seninrandevun", icon: <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
              ].map((s) => (
                <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className="text-[var(--text-3)] transition hover:text-[var(--accent)]" title={s.name}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ HEADER ━━━ */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/50 bg-[var(--bg-1)]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="SeninRandevun" width={36} height={36} className="rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
              Senin<span className="text-[var(--accent)]">Randevun</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "/kesfet", label: "Keşfet", icon: "🔍" },
              { href: "/fiyatlar", label: "Fiyatlar", icon: "💎" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-2)] transition-all duration-300 hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] hover:shadow-md"
              >
                <span className="text-xs">{l.icon}</span>
                {l.label}
              </Link>
            ))}
            <a
              href="tel:+905304788298"
              className="ml-2 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-2)] transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-md"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              Ara
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 text-sm transition-all duration-300 hover:bg-[var(--surface-2)] hover:scale-110 hover:rotate-12 hover:shadow-lg active:scale-95"
              title={theme === "light" ? "Karanlık mod" : "Aydınlık mod"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="btn-premium btn-ripple rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97] flex items-center gap-2"
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
                  className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-2.5 text-sm font-medium text-[var(--text-1)] transition-all duration-300 hover:bg-[var(--surface-2)] hover:shadow-md hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] sm:inline-flex"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="btn-premium btn-ripple btn-glow rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97]"
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
            <ScrollReveal direction="fade" duration={600}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                Türkiye&apos;nin #1 akıllı randevu platformu
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={150}>
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
            </ScrollReveal>

            <ScrollReveal direction="up" delay={300}>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-3)] sm:text-lg">
                Binlerce işletme arasından aradığınızı bulun, müsait saatleri
                görün ve anında online randevu oluşturun.
              </p>
            </ScrollReveal>
          </div>

          {/* Search */}
          <ScrollReveal direction="up" delay={400}>
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
          </ScrollReveal>

          {/* Categories */}
          <ScrollReveal direction="up" delay={500}>
            <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`category-chip inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium ${
                    activeCategory === cat.slug
                      ? "active border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg shadow-sky-500/25"
                      : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)]"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal direction="up" delay={600}>
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((s) => (
                <StatCounter key={s.label} value={s.value} label={s.label} />
              ))}
            </div>
          </ScrollReveal>
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
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)]/5 hover:shadow-md"
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
              <ScrollReveal direction="fade">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-12 text-center">
                  <p className="text-5xl">🔍</p>
                  <p className="mt-4 text-lg font-semibold text-[var(--text-1)]">Sonuç bulunamadı</p>
                  <p className="mt-2 text-sm text-[var(--text-3)]">
                    Farklı filtreler deneyin veya arama terimini değiştirin.
                  </p>
                </div>
              </ScrollReveal>
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
              <ScrollReveal direction="up" as="div" className="mb-20">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text-1)]">
                      ⭐ Popüler İşletmeler
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-3)]">En çok tercih edilen işletmeler</p>
                  </div>
                  <Link
                    href="/kesfet"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)]/5 hover:shadow-md hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]"
                  >
                    Tümünü Gör →
                  </Link>
                </div>
                <div ref={popularGroupRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {popular.map((biz) => (
                    <div key={biz.id} className="scroll-reveal reveal-up">
                      <BusinessCard business={biz} />
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            )}

            {/* ━━━ FEATURES ━━━ */}
            <ScrollReveal direction="up" as="div" className="mb-20">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Neden SeninRandevun?
                </p>
                <h2 className="mt-3 text-2xl font-bold text-[var(--text-1)] sm:text-3xl">
                  İşletmeniz için her şey tek panelde
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--text-3)]">
                  Müşterileriniz 7/24 online randevu alsın. Takvim, çalışan, müşteri ve analiz — hepsi tek yerde.
                </p>
              </div>
              <div ref={featuresGroupRef} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="scroll-reveal reveal-up feature-card group relative rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6"
                  >
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--accent)]/5 blur-2xl transition-all duration-500 group-hover:bg-[var(--accent)]/15 group-hover:scale-125" />
                    <div className="relative">
                      <span className="text-3xl">{f.icon}</span>
                      <h3 className="mt-4 text-base font-bold text-[var(--text-1)]">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-3)]">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* ━━━ HOW IT WORKS ━━━ */}
            <ScrollReveal direction="up" as="div" className="mb-20">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Kolay Kullanım
                </p>
                <h2 className="mt-3 text-2xl font-bold text-[var(--text-1)] sm:text-3xl">
                  3 adımda randevunuzu alın
                </h2>
              </div>
              <div ref={stepsGroupRef} className="mt-10 grid gap-8 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <div key={s.step} className="scroll-reveal reveal-up group relative text-center">
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-80px)] bg-gradient-to-r from-[var(--accent)]/30 to-transparent sm:block" />
                    )}
                    <div className="step-icon-wrap relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,var(--accent)/10,var(--accent-3)/10)]">
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
            </ScrollReveal>

            {/* ━━━ CTA ━━━ */}
            <ScrollReveal direction="fade">
              <div className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent)/5,var(--accent-3)/5)] p-10 text-center shadow-2xl sm:p-16">
                <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[var(--accent)]/10 blur-3xl" />
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
                {/* Decorative particles */}
                <div className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-[var(--accent)]/30" style={{ animation: "floatParticle 6s ease-in-out infinite" }} />
                <div className="absolute right-[15%] top-[30%] h-1.5 w-1.5 rounded-full bg-[var(--accent-3)]/40" style={{ animation: "floatParticle 8s ease-in-out infinite 1s" }} />
                <div className="absolute left-[20%] bottom-[25%] h-1 w-1 rounded-full bg-[var(--accent-2)]/35" style={{ animation: "floatParticle 7s ease-in-out infinite 2s" }} />
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
                      className="btn-premium btn-ripple btn-glow rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97]"
                    >
                      {isLoggedIn ? "📊 Panelime Git" : "🚀 Ücretsiz Başla"}
                    </Link>
                    <Link
                      href="/fiyatlar"
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-8 py-3.5 text-sm font-medium text-[var(--text-1)] transition-all duration-300 hover:bg-[var(--surface-2)] hover:shadow-lg hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--border))]"
                    >
                      Fiyatları İncele
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </>
        )}
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="relative overflow-hidden border-t border-[var(--border)]">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[var(--surface-1)]" />
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,var(--accent)/30,transparent)]" />
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-[var(--accent-3)]/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          {/* Newsletter / CTA Section */}
          <div className="flex flex-col items-center gap-6 border-b border-[var(--border)] py-12 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                Randevu dünyasındaki yenilikleri kaçırmayın
              </h3>
              <p className="mt-1 text-sm text-[var(--text-3)]">
                Yeni özellikler, ipuçları ve sektör trendleri için bültenimize katılın.
              </p>
            </div>
            <div className="flex w-full max-w-md gap-2 sm:w-auto">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] transition-all duration-300 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] hover:bg-[var(--field-bg-hover)]"
              />
              <button className="btn-premium btn-ripple shrink-0 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-[0.97]">
                Abone Ol
              </button>
            </div>
          </div>

          {/* Main Footer Grid */}
          <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
            {/* Brand Column */}
            <div className="lg:col-span-4">
              <Link href="/" className="flex items-center gap-2.5 group">
                <Image src="/logo.png" alt="SeninRandevun" width={40} height={40} className="rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                <span className="text-xl font-extrabold tracking-tight text-[var(--text-1)]">
                  Senin<span className="text-[var(--accent)]">Randevun</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-3)]">
                Türkiye&apos;nin #1 akıllı randevu platformu. Kuaför, güzellik merkezi, sağlık ve
                onlarca sektörde işletmenizi dijitale taşıyın. Müşterileriniz 7/24 online randevu alsın.
              </p>

              {/* Contact Info */}
              <div className="mt-6 space-y-3">
                <a
                  href="tel:+905304788298"
                  className="group flex items-center gap-3 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] transition-all duration-300 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/5 group-hover:shadow-md">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  </span>
                  <span>
                    <span className="block font-semibold">0530 478 82 98</span>
                    <span className="text-xs text-[var(--text-3)]">Pzt-Cmt 09:00-18:00</span>
                  </span>
                </a>
                <a
                  href="mailto:info@seninrandevun.com"
                  className="group flex items-center gap-3 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] transition-all duration-300 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]/5 group-hover:shadow-md">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </span>
                  <span>
                    <span className="block font-semibold">info@seninrandevun.com</span>
                    <span className="text-xs text-[var(--text-3)]">7/24 destek talebi</span>
                  </span>
                </a>
              </div>

              {/* Social Icons */}
              <div className="mt-6 flex gap-2.5">
                {[
                  { name: "Instagram", href: "https://instagram.com/seninrandevun", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
                  { name: "X (Twitter)", href: "https://twitter.com/seninrandevun", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                  { name: "LinkedIn", href: "https://linkedin.com/company/seninrandevun", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                  { name: "YouTube", href: "https://youtube.com/@seninrandevun", icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-3)] transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 hover:text-[var(--accent)] hover:shadow-lg hover:scale-110 hover:-translate-y-0.5"
                    title={s.name}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Müşteriler */}
            <div className="lg:col-span-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--accent)/30,transparent)]" />
                Müşteriler
              </h4>
              <ul className="mt-5 space-y-3">
                {[
                  { href: "/kesfet", label: "İşletme Keşfet", icon: "🔍" },
                  { href: "/hesabim", label: "Hesabım", icon: "👤" },
                  { href: "/giris", label: "Giriş Yap", icon: "🔑" },
                  { href: "/kayit", label: "Ücretsiz Üye Ol", icon: "✨" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group flex items-center gap-2 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)] hover:translate-x-1">
                      <span className="text-xs opacity-60 transition-opacity group-hover:opacity-100">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* İşletmeler */}
            <div className="lg:col-span-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--accent)/30,transparent)]" />
                İşletmeler
              </h4>
              <ul className="mt-5 space-y-3">
                {[
                  { href: "/fiyatlar", label: "Fiyatlar & Planlar", icon: "💎" },
                  { href: "/kayit", label: "Ücretsiz Başla", icon: "🚀" },
                  { href: "/dashboard", label: "İşletme Paneli", icon: "📊" },
                  { href: "/onboarding", label: "İşletme Kurulumu", icon: "⚙️" },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group flex items-center gap-2 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)] hover:translate-x-1">
                      <span className="text-xs opacity-60 transition-opacity group-hover:opacity-100">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Popüler Kategoriler */}
            <div className="lg:col-span-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--accent)/30,transparent)]" />
                Kategoriler
              </h4>
              <ul className="mt-5 space-y-3">
                {[
                  { slug: "kuafor", label: "Kuaför Randevu", emoji: "💇" },
                  { slug: "berber", label: "Berber Randevu", emoji: "✂️" },
                  { slug: "guzellik", label: "Güzellik Merkezi", emoji: "💅" },
                  { slug: "saglik", label: "Sağlık Randevu", emoji: "🩺" },
                  { slug: "spor", label: "Spor & Fitness", emoji: "🏋️" },
                  { slug: "veteriner", label: "Veteriner", emoji: "🐾" },
                ].map((cat) => (
                  <li key={cat.slug}>
                    <Link href={`/kesfet?category=${cat.slug}`} className="group flex items-center gap-2 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)] hover:translate-x-1">
                      <span className="text-xs opacity-60 transition-opacity group-hover:opacity-100">{cat.emoji}</span>
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Destek & Kaynaklar */}
            <div className="lg:col-span-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                <span className="h-px flex-1 bg-[linear-gradient(90deg,var(--accent)/30,transparent)]" />
                Destek
              </h4>
              <ul className="mt-5 space-y-3">
                {[
                  { href: "mailto:info@seninrandevun.com", label: "Destek Talebi", icon: "📧", external: false },
                  { href: "https://wa.me/905304788298", label: "WhatsApp Destek", icon: "💬", external: true },
                  { href: "tel:+905304788298", label: "Telefon Desteği", icon: "📞", external: false },
                  { href: "/dashboard/destek", label: "Destek Merkezi", icon: "🎧", external: false },
                ].map((item) => (
                  <li key={item.label}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)] hover:translate-x-1">
                        <span className="text-xs opacity-60 transition-opacity group-hover:opacity-100">{item.icon}</span>
                        {item.label}
                        <svg className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                      </a>
                    ) : (
                      <a href={item.href} className="group flex items-center gap-2 text-sm text-[var(--text-2)] transition-all duration-300 hover:text-[var(--accent)] hover:translate-x-1">
                        <span className="text-xs opacity-60 transition-opacity group-hover:opacity-100">{item.icon}</span>
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 border-t border-[var(--border)] py-8 text-[10px] font-medium text-[var(--text-3)]">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              256-bit SSL Güvenlik
            </span>
            <span className="h-3 w-px bg-[var(--border)]" />
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>
              %99.9 Uptime SLA
            </span>
            <span className="h-3 w-px bg-[var(--border)]" />
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              Firebase Altyapısı
            </span>
            <span className="h-3 w-px bg-[var(--border)]" />
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              KVKK Uyumlu
            </span>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col items-center gap-4 border-t border-[var(--border)] py-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-[var(--text-3)]">
              © {new Date().getFullYear()} SeninRandevun. Tüm hakları saklıdır.
              <span className="ml-2 inline-flex items-center gap-1 text-[var(--accent)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Sistem aktif
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:gap-6">
              <Link href="/" className="text-[var(--text-3)] transition-all duration-300 hover:text-[var(--accent)]">
                Gizlilik Politikası
              </Link>
              <Link href="/" className="text-[var(--text-3)] transition-all duration-300 hover:text-[var(--accent)]">
                Kullanım Şartları
              </Link>
              <Link href="/" className="text-[var(--text-3)] transition-all duration-300 hover:text-[var(--accent)]">
                KVKK Aydınlatma
              </Link>
              <Link href="/" className="text-[var(--text-3)] transition-all duration-300 hover:text-[var(--accent)]">
                Çerez Politikası
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
