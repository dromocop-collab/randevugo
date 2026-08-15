import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
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

export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8">
      {/* Left — Branding Panel */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(160deg,rgba(2,132,199,0.08),rgba(15,23,42,0.03))] p-8 shadow-2xl backdrop-blur-xl lg:p-10">
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
          <div className="mt-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              {eyebrow}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-[var(--text-1)] lg:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--text-2)]">
            {subtitle}
          </p>

          {/* Trust Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {TRUST_ITEMS.map((item) => (
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
          <div className="mt-8 space-y-3">
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
          </div>

          {/* Bottom stats */}
          <div className="mt-6 flex items-center gap-6 border-t border-[var(--border)] pt-6">
            <div>
              <p className="text-xl font-extrabold bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] bg-clip-text text-transparent">1000+</p>
              <p className="text-[10px] text-[var(--text-3)]">Aktif İşletme</p>
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
      <section className="w-full max-w-lg justify-self-center">{children}</section>
    </main>
  );
}
