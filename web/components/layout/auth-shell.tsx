"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  variant?: "business" | "customer";
}

const TRUST_ITEMS = [
  { icon: "🔒", label: "256-bit SSL", desc: "Bankacılık düzeyinde şifreleme" },
  { icon: "🛡️", label: "Tenant İzolasyonu", desc: "Her işletme izole ortamda" },
  { icon: "⚡", label: "%99.99 Uptime", desc: "Firebase altyapı garantisi" },
  { icon: "📱", label: "7/24 Erişim", desc: "Tüm cihazlardan erişin" },
];

const TESTIMONIALS = [
  {
    name: "Ayşe K.",
    role: "Güzellik Merkezi Sahibi",
    quote: "SeninRandevun ile müşterilerimiz artık 7/24 randevu alabiliyor. No-show oranımız %40 düştü!",
  },
  {
    name: "Mehmet T.",
    role: "Berber",
    quote: "Takvim yönetimi çok kolay. Çalışanlarım için ayrı müsaitlik ayarlıyorum.",
  },
];

export function AuthShell({ eyebrow, title, subtitle, children, variant = "business" }: AuthShellProps) {
  const { user, status } = useAuth();
  const customer = variant === "customer";
  const trustItems = customer ? [
    { icon: "✓", label: "Ücretsiz Hesap", desc: "Müşteriler için daima ücretsiz" },
    { icon: "♡", label: "Favori Mağazalar", desc: "Sevdiğiniz yerler tek listede" },
    { icon: "◷", label: "Randevu Geçmişi", desc: "Geçmiş ve yaklaşan planlarınız" },
    { icon: "⚡", label: "Hızlı Randevu", desc: "Saniyeler içinde yerinizi ayırın" },
  ] : TRUST_ITEMS;
  return (
    <main className="auth-v2 relative mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
      {status === "authenticated" && user && <Link href={customer ? "/hesabim" : "/dashboard"} className="auth-session-pill"><span>✓</span><div><b>Oturumunuz açık</b><small>{customer ? "Hesabıma" : "Panele"} devam et →</small></div></Link>}
      {/* Left — Branding Panel */}
      <section className="auth-story relative overflow-hidden rounded-[2.25rem] border border-[var(--border)] p-8 shadow-2xl backdrop-blur-xl lg:p-12">
        {/* Glow orbs */}
        <div className="absolute -top-20 right-10 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute right-20 top-1/2 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />

        <div className="relative">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="SeninRandevun" width={40} height={40} className="rounded-xl shadow-lg transition group-hover:scale-105" />
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-1)]">
              Senin<span className="text-[var(--accent)]">Randevun</span>
            </span>
          </Link>

          {/* Badge */}
          <div className="mt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              {eyebrow}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-[-.055em] text-[var(--text-1)] lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--text-2)]">
            {subtitle}
          </p>

          {/* Trust Grid */}
          <div className="auth-trust-grid mt-10 grid grid-cols-2 gap-3">
            {trustItems.map((item) => (
              <div
                key={item.label}
                className="group rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-3.5 backdrop-blur transition hover:border-[var(--accent)]/30 hover:shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-1)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          {!customer && <div className="auth-testimonials mt-8 grid gap-3 sm:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/60 p-4 backdrop-blur"
              >
                <p className="text-xs leading-relaxed text-[var(--text-2)] italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[10px] font-bold text-[var(--accent)]">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-1)]">{t.name}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>}

          {/* Bottom stats */}
          <div className="mt-6 flex items-center gap-6 border-t border-[var(--border)] pt-6">
            <div>
              <p className="text-xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">{customer ? "81" : "1000+"}</p>
              <p className="text-[10px] text-[var(--text-3)]">{customer ? "Şehirde Keşif" : "Aktif İşletme"}</p>
            </div>
            <div>
              <p className="text-xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">50K+</p>
              <p className="text-[10px] text-[var(--text-3)]">Aylık Randevu</p>
            </div>
            <div>
              <p className="text-xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">4.9</p>
              <p className="text-[10px] text-[var(--text-3)]">Ortalama Puan</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right — Form */}
      <section className="auth-form-stage w-full max-w-xl justify-self-center"><div className="mb-6"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[var(--accent)]">GÜVENLİ HESAP ERİŞİMİ</span><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-1)]">{customer ? "Randevularınıza kaldığınız yerden devam edin." : "İşletmenize kaldığınız yerden devam edin."}</h2></div>{children}</section>
    </main>
  );
}
