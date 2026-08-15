"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PLAN_PRICE, PLAN_LABEL } from "@/constants/plans";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/layout/theme-provider";

/* ━━━ Feature data ━━━ */
const FEATURE_GROUPS = [
  {
    title: "Randevu Yönetimi",
    icon: "📅",
    color: "from-sky-500 to-blue-600",
    features: [
      "Online randevu sistemi",
      "Otomatik çakışma kontrolü",
      "Gelişmiş takvim görünümü",
      "Müşteri self-servis randevu",
      "SMS & E-posta hatırlatma altyapısı",
    ],
  },
  {
    title: "Ekip & Hizmet",
    icon: "👥",
    color: "from-violet-500 to-purple-600",
    features: [
      "250 çalışana kadar destek",
      "Çalışan bazlı müsaitlik takvimi",
      "Sınırsız hizmet tanımı",
      "Hizmet bazlı fiyatlandırma",
      "Çalışan performans takibi",
    ],
  },
  {
    title: "İşletme & Müşteri",
    icon: "🏢",
    color: "from-emerald-500 to-teal-600",
    features: [
      "Kurumsal işletme profili",
      "CRM — Müşteri yönetimi",
      "Sınırsız müşteri kaydı",
      "Yorum & değerlendirme sistemi",
      "Keşfet'te ön plana çıkma",
    ],
  },
  {
    title: "Analitik & Araçlar",
    icon: "📊",
    color: "from-amber-500 to-orange-600",
    features: [
      "Gelişmiş raporlama",
      "Gelir & doluluk analitiği",
      "QR kod randevu linki",
      "Çoklu şube altyapısı",
      "Yetkilendirme & roller",
    ],
  },
];

const FAQ = [
  {
    q: "Deneme süresi nasıl çalışır?",
    a: "14 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz. Kredi kartı gerekmez. Süre sonunda aboneliğe geçebilir veya hesabınızı dondurabilirsiniz.",
  },
  {
    q: "Ödeme yöntemleri nelerdir?",
    a: "Kredi kartı, banka kartı ve havale/EFT ile ödeme yapabilirsiniz. Ödeme altyapımız 256-bit SSL ile korunmaktadır.",
  },
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Evet, aboneliğinizi istediğiniz zaman iptal edebilirsiniz. Kalan süreniz boyunca tüm özellikler aktif kalır.",
  },
  {
    q: "Çalışan veya müşteri limiti var mı?",
    a: "250 çalışana kadar ekleyebilirsiniz. Müşteri ve randevu sayısında limit yoktur.",
  },
  {
    q: "Verilerim güvende mi?",
    a: "Tüm verileriniz Google Cloud (Firebase) altyapısında, Avrupa sunucularında güvenle saklanmaktadır.",
  },
  {
    q: "Mevcut müşteri verilerimi aktarabilir miyim?",
    a: "Evet, CSV import özelliği ile mevcut müşteri listenizi kolayca aktarabilirsiniz.",
  },
];

const TRUST_BADGES = [
  { icon: "🔒", label: "256-bit SSL" },
  { icon: "🇪🇺", label: "Avrupa Sunucuları" },
  { icon: "☁️", label: "Google Cloud" },
  { icon: "🛡️", label: "KVKK Uyumlu" },
];

const STATS = [
  { value: "1000+", label: "Aktif İşletme" },
  { value: "50K+", label: "Aylık Randevu" },
  { value: "%99.9", label: "Uptime" },
  { value: "7/24", label: "Destek" },
];

export default function PricingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, status: authStatus } = useAuth();
  const isLoggedIn = authStatus === "authenticated" && !!user;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const ctaHref = isLoggedIn ? "/dashboard" : "/kayit";
  const ctaLabel = isLoggedIn ? "Panelime Git" : "Ücretsiz Deneyin";

  return (
    <div className="min-h-screen">
      {/* ━━━ Keyframe animations ━━━ */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-fadeSlideUp {
          animation: fadeSlideUp 0.6s ease forwards;
          opacity: 0;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease forwards;
          opacity: 0;
        }
      `}</style>

      {/* ━━━ HEADER ━━━ */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/50 bg-[var(--bg-1)]/70 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="SeninRandevun" width={36} height={36} className="rounded-xl shadow-lg transition group-hover:scale-105" />
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
              Senin<span className="text-[var(--accent)]">Randevun</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 text-sm transition hover:bg-[var(--surface-2)] hover:scale-105"
              title={theme === "light" ? "Karanlık mod" : "Aydınlık mod"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <Link href="/kesfet" className="hidden rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] sm:inline-flex">
              Keşfet
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 active:scale-[0.97] flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Panelim
              </Link>
            ) : (
              <>
                <Link href="/giris" className="hidden rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] sm:inline-flex">
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 active:scale-[0.97]"
                >
                  Hemen Başla
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ━━━ HERO ━━━ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent)/8,transparent_60%)]" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[var(--accent)]/5 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-[var(--accent-3)]/5 blur-3xl" />

          <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:pt-24 lg:px-8">
            <div className="animate-fadeSlideUp inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              ⚡ Tek Plan, Tüm Özellikler
            </div>
            <h1 className="animate-fadeSlideUp mt-6 text-4xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-5xl lg:text-6xl" style={{ animationDelay: "100ms" }}>
              Basit ve{" "}
              <span className="bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">
                şeffaf
              </span>{" "}
              fiyatlandırma
            </h1>
            <p className="animate-fadeSlideUp mx-auto mt-5 max-w-xl text-lg text-[var(--text-3)]" style={{ animationDelay: "200ms" }}>
              Gizli ücret yok. Özellik kilidi yok. Tüm işletmeler için tek plan.
            </p>
          </div>
        </section>

        {/* ━━━ PRICING CARD ━━━ */}
        <section className="relative mx-auto max-w-5xl px-4 pb-16 lg:px-8">
          <div className="mx-auto max-w-lg">
            <div className="animate-scaleIn relative overflow-hidden rounded-3xl border-2 border-[var(--accent)] bg-[var(--surface-1)] shadow-2xl shadow-sky-500/10" style={{ animationDelay: "300ms" }}>
              {/* Shimmer top border */}
              <div className="absolute left-0 right-0 top-0 h-1 bg-[linear-gradient(90deg,var(--accent),var(--accent-3),var(--accent))] bg-[length:200%_100%]" style={{ animation: "shimmer 3s linear infinite" }} />

              {/* Badge */}
              <div className="absolute right-0 top-0 rounded-bl-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-5 py-2 text-xs font-bold text-white shadow-lg">
                🏆 Önerilen
              </div>

              <div className="p-8 sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  {PLAN_LABEL}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-6xl font-extrabold tracking-tight text-[var(--text-1)]">
                    {PLAN_PRICE.yearly.toLocaleString("tr-TR")}
                  </span>
                  <div className="text-left">
                    <span className="text-lg text-[var(--text-3)]">₺</span>
                    <span className="block text-xs text-[var(--text-3)]">/ yıl</span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-[var(--text-3)]">
                  Ayda sadece{" "}
                  <strong className="text-[var(--text-1)]">{PLAN_PRICE.monthlyEquivalent} ₺</strong>
                  {" "}— günlük kahveden ucuz ☕
                </p>

                <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-600">
                    {PLAN_PRICE.trialDays} gün ücretsiz deneme — kredi kartı gerekmez
                  </span>
                </div>

                <Link
                  href={ctaHref}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] py-4.5 text-base font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-2xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97]"
                >
                  {ctaLabel}
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                {/* Trust badges */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {TRUST_BADGES.map((badge) => (
                    <span key={badge.label} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-3)]">
                      {badge.icon} {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((stat, idx) => (
              <div
                key={stat.label}
                className="animate-fadeSlideUp rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center backdrop-blur-xl"
                style={{ animationDelay: `${400 + idx * 80}ms` }}
              >
                <div className="text-2xl font-extrabold text-[var(--accent)]">{stat.value}</div>
                <div className="mt-1 text-xs text-[var(--text-3)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ FEATURE GROUPS ━━━ */}
        <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-4xl">
              Tek planda <span className="text-[var(--accent)]">her şey</span> dahil
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--text-3)]">
              Özellik kilidi veya gizli ücret yok. Tüm modüller anında aktif.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {FEATURE_GROUPS.map((group, gIdx) => (
              <div
                key={group.title}
                className="animate-fadeSlideUp group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-7 transition-all duration-300 hover:shadow-xl hover:border-[var(--accent)]/30"
                style={{ animationDelay: `${gIdx * 100}ms` }}
              >
                {/* Gradient corner */}
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${group.color} opacity-10 transition-all duration-300 group-hover:opacity-20 group-hover:scale-150`} />

                <div className="relative flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${group.color} shadow-lg text-lg`}>
                    {group.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-1)]">{group.title}</h3>
                </div>

                <ul className="relative mt-5 space-y-3">
                  {group.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-[var(--text-2)]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs text-emerald-600">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ COMPARISON STRIP ━━━ */}
        <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-1)]">
              Neden SeninRandevun?
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: "🔒",
                title: "Komisyon yok",
                desc: "Randevularınızdan pay almıyoruz. Kazancınız %100 sizin.",
                gradient: "from-emerald-500/10 to-teal-500/10",
              },
              {
                icon: "⚡",
                title: "5 dakikada kurulum",
                desc: "Hizmet ve çalışan ekleyin, anında online randevu almaya başlayın.",
                gradient: "from-amber-500/10 to-orange-500/10",
              },
              {
                icon: "📱",
                title: "Mobil uyumlu",
                desc: "Müşterileriniz telefondan kolayca randevu alsın, her cihazda mükemmel deneyim.",
                gradient: "from-violet-500/10 to-purple-500/10",
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="animate-fadeSlideUp group rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-7 text-center transition-all duration-300 hover:shadow-xl hover:border-[var(--accent)]/30"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-3xl transition-transform duration-300 group-hover:scale-110`} style={{ animation: "float 4s ease-in-out infinite", animationDelay: `${idx * 400}ms` }}>
                  {item.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--text-1)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-3)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ FAQ ━━━ */}
        <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-1)]">
              Sıkça Sorulan Sorular
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-3)]">
              Aklınıza takılan her şeyin cevabı burada
            </p>
          </div>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, idx) => (
              <div
                key={item.q}
                className="animate-fadeSlideUp overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] transition-all duration-300"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-[var(--text-1)]">{item.q}</span>
                  <span className={`ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm text-[var(--text-3)] transition-transform duration-300 ${openFaq === idx ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === idx ? "max-h-40 pb-5" : "max-h-0"}`}>
                  <p className="px-6 text-sm leading-relaxed text-[var(--text-3)]">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━━ FINAL CTA ━━━ */}
        <section className="mx-auto max-w-5xl px-4 pb-20 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-[linear-gradient(135deg,var(--accent)/5,var(--accent-3)/5)] p-10 text-center shadow-2xl sm:p-16">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[var(--accent)]/10 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[var(--accent-3)]/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-4xl">
                {isLoggedIn ? "Panelime dön" : "Hemen başlayın"}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-[var(--text-3)]">
                {isLoggedIn
                  ? "İşletme panelinize geri dönün ve randevularınızı yönetin."
                  : `${PLAN_PRICE.trialDays} gün ücretsiz. Kredi kartı gerekmez. 2 dakikada kurulum.`}
              </p>
              <Link
                href={ctaHref}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-10 py-4.5 text-base font-bold text-white shadow-xl shadow-sky-500/25 transition-all hover:shadow-2xl hover:shadow-sky-500/40 hover:brightness-110 active:scale-[0.97]"
              >
                {isLoggedIn ? "📊 Panelime Git" : "🚀 Ücretsiz Deneyin"}
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
